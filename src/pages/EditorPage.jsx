import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";

import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";

import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

import Youtube from "@tiptap/extension-youtube";

import { auth, googleProvider } from "../firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

import {
  getNextArticleId,
  getArticleByIdNumber,
  createArticle,
  updateArticle,
  listDraftArticles,
} from "../services/articles";
import { uploadImage } from "../services/upload";

const ADMIN_EMAILS = new Set([
  "gallerykuns@gmail.com",
  "cybog2004@gmail.com",
  "sylove887@gmail.com",
]);

const CATEGORY_OPTIONS = ["Exhibition", "Project", "Artist Note", "News"];

function useToast() {
  const [toast, setToast] = useState(null);
  const ref = useRef(null);
  function show(msg, ms = 2200) {
    setToast(msg);
    clearTimeout(ref.current);
    ref.current = setTimeout(() => setToast(null), ms);
  }
  return { toast, show };
}

function parseTags(text) {
  return Array.from(
    new Set(
      (text || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    )
  ).slice(0, 30);
}

// ✅ extension name 중복 제거 (경고 완전 차단)
function dedupeExtensions(exts) {
  const map = new Map();
  for (const e of exts.filter(Boolean)) map.set(e.name, e);
  return Array.from(map.values());
}

// ✅ FontSize (TextStyle 기반)
const FontSize = TextStyle.extend({
  name: "fontSize",
  addAttributes() {
    return {
      fontSize: {
        default: null,
        parseHTML: (el) => el.style.fontSize || null,
        renderHTML: (attrs) => (attrs.fontSize ? { style: `font-size:${attrs.fontSize}` } : {}),
      },
    };
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).run(),
    };
  },
});

function isImageNodeSelected(editor) {
  const sel = editor?.state?.selection;
  return !!sel?.node && sel.node.type?.name === "image";
}

function setSelectedImageWidth(editor, percent) {
  const sel = editor.state.selection;
  if (!sel?.node || sel.node.type.name !== "image") return;

  const prevStyle = sel.node.attrs?.style || "";
  const cleaned = prevStyle.replace(/width\s*:\s*[^;]+;?/gi, "").trim();
  const merged = `${cleaned ? cleaned + " " : ""}width:${percent}%;`.trim();

  editor.chain().focus().updateAttributes("image", { style: merged }).run();
}

function setSelectedImageAlign(editor, align) {
  const sel = editor.state.selection;
  if (!sel?.node || sel.node.type.name !== "image") return;

  const prevStyle = sel.node.attrs?.style || "";
  let cleaned = prevStyle
    .replace(/margin-left\s*:\s*[^;]+;?/gi, "")
    .replace(/margin-right\s*:\s*[^;]+;?/gi, "")
    .replace(/display\s*:\s*[^;]+;?/gi, "")
    .trim();

  let rule = "";
  if (align === "left") rule = "display:block;margin-left:0;margin-right:auto;";
  if (align === "center") rule = "display:block;margin-left:auto;margin-right:auto;";
  if (align === "right") rule = "display:block;margin-left:auto;margin-right:0;";

  const merged = `${cleaned ? cleaned + " " : ""}${rule}`.trim();
  editor.chain().focus().updateAttributes("image", { style: merged }).run();
}

export default function EditorPage({ theme, toggleTheme }) {
  const nav = useNavigate();
  const { id } = useParams();
  const idNum = useMemo(() => (id ? Number(id) : null), [id]);

  const { toast, show } = useToast();

  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const adminOk = !!user?.email && ADMIN_EMAILS.has(user.email);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setCheckingAuth(false);
    });
    return () => unsub();
  }, []);

  async function adminLogin() {
    try {
      const r = await signInWithPopup(auth, googleProvider);
      const email = r?.user?.email || "";
      if (!ADMIN_EMAILS.has(email)) {
        show("🚫 관리자 계정이 아니에요.", 2600);
        await signOut(auth);
      } else {
        show("✅ 관리자 로그인 완료!", 1600);
      }
    } catch (e) {
      console.error(e);
      show("😵 로그인 실패", 2200);
    }
  }

  async function adminLogout() {
    try {
      await signOut(auth);
      show("👋 로그아웃!", 1400);
    } catch (e) {
      console.error(e);
      show("😵 로그아웃 실패", 2000);
    }
  }

  const extensions = useMemo(() => {
    const exts = [
      StarterKit,
      TextStyle,
      FontSize,
      Color.configure({ types: ["textStyle"] }),

      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),

      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Image.configure({ inline: false, allowBase64: false }),

      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,

      Youtube.configure({ inline: false, controls: true, nocookie: true }),

      Placeholder.configure({ placeholder: "Write something… ✍️" }),
    ];

    return dedupeExtensions(exts);
  }, []);

  const editor = useEditor({
    extensions,
    content: "",
  });

  const [loading, setLoading] = useState(true);
  const [firebaseId, setFirebaseId] = useState(null);
  const [drafts, setDrafts] = useState([]);

  const [form, setForm] = useState({
    id: "",
    title: "",
    category: CATEGORY_OPTIONS[0],
    excerpt: "",
    tagsText: "",
    cover: "",
    coverThumb: "",
    coverMedium: "",
    status: "published",
    createdAt: null,
  });

  // 이미지 선택시 이미지툴바
  const [imageMode, setImageMode] = useState(false);
  useEffect(() => {
    if (!editor) return;
    const update = () => setImageMode(isImageNodeSelected(editor));
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    update();
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    if (!adminOk) {
      setLoading(false);
      return;
    }

    let alive = true;
    (async () => {
      try {
        setLoading(true);

        if (idNum) {
          const a = await getArticleByIdNumber(idNum);
          if (!alive) return;
          if (!a) {
            show("😮 글을 찾지 못했어요.", 2200);
            nav("/");
            return;
          }

          setFirebaseId(a.firebaseId || a._firebaseId || null);
          setForm({
            id: String(a.id ?? ""),
            title: a.title ?? "",
            category: a.category ?? CATEGORY_OPTIONS[0],
            excerpt: a.excerpt ?? "",
            tagsText: Array.isArray(a.tags) ? a.tags.join(", ") : "",
            cover: a.cover ?? "",
            coverThumb: a.coverThumb ?? "",
            coverMedium: a.coverMedium ?? "",
            status: a.status ?? "published",
            createdAt: a.createdAt ?? null,
          });
          editor.commands.setContent(a.contentHTML || "");
          show("🛠️ 글을 불러왔어요!", 1400);
        } else {
          const nextId = await getNextArticleId();
          if (!alive) return;
          setFirebaseId(null);
          setForm((p) => ({
            ...p,
            id: String(nextId),
            title: "",
            excerpt: "",
            tagsText: "",
            cover: "",
            coverThumb: "",
            coverMedium: "",
            status: "published",
            createdAt: null,
          }));
          editor.commands.setContent("");
          show("✨ 새 글 시작!", 1400);
        }

        try {
          const d = await (listDraftArticles?.() ?? Promise.resolve([]));
          if (!alive) return;
          setDrafts(Array.isArray(d) ? d : []);
        } catch {
          setDrafts([]);
        }
      } catch (e) {
        console.error(e);
        show("😵 로딩 오류", 2200);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => (alive = false);
  }, [editor, adminOk, idNum, nav]);

  async function onPickCover(file) {
    if (!file) return;
    try {
      show("🖼️ 커버 업로드…", 1400);
      const res = await uploadImage(file);
      setForm((p) => ({
        ...p,
        cover: res.url || "",
        coverThumb: res.thumbUrl || "",
        coverMedium: res.mediumUrl || "",
      }));
      show("✅ 커버 완료!", 1400);
    } catch (e) {
      console.error(e);
      show("😵 커버 업로드 실패", 2200);
    }
  }
  function onCoverInput(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onPickCover(f);
  }

  async function onPickBodyImage(file) {
    if (!file || !editor) return;
    try {
      show("🖼️ 이미지 업로드…", 1200);
      const res = await uploadImage(file);
      if (!res?.url) throw new Error("no url");
      editor.chain().focus().setImage({ src: res.url }).run();
      show("✅ 삽입 완료!", 1200);
    } catch (e) {
      console.error(e);
      show("😵 이미지 업로드 실패", 2200);
    }
  }
  function onBodyImageInput(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onPickBodyImage(f);
  }

  // ✅ 노션식 블록 삽입(HTML 템플릿)
  function insertScene() {
    editor.chain().focus().insertContent(`
      <div class="uf-scene">
        <p><b>Scene Title</b></p>
        <p>이 안에 내용을 작성해요.</p>
      </div>
      <p></p>
    `).run();
    show("✨ Scene 블록 삽입!", 1400);
  }

  function insertStickyStory() {
    editor.chain().focus().insertContent(`
      <div class="uf-stickyStory">
        <div class="uf-stickyMedia">
          <img src="https://placehold.co/1200x800?text=Sticky+Image" alt="sticky"/>
        </div>
        <div class="uf-stickyText">
          <p><b>Sticky Story</b></p>
          <p>오른쪽에 텍스트를 길게 적어보세요. 스크롤하면 왼쪽 이미지는 붙어있고 텍스트만 내려갑니다.</p>
          <p>이미지 URL은 나중에 커버처럼 업로드해서 바꿀 수 있어요.</p>
        </div>
      </div>
      <p></p>
    `).run();
    show("📌 Sticky Story 삽입!", 1400);
  }

  function insertParallaxImage() {
    editor.chain().focus().insertContent(`
      <div class="uf-scene">
        <p><b>Parallax Image</b></p>
        <img class="uf-parallax" src="https://placehold.co/1400x900?text=Parallax" alt="parallax" />
        <p style="opacity:.8">스크롤하면 이 이미지는 살짝 떠다니는 느낌이 납니다.</p>
      </div>
      <p></p>
    `).run();
    show("🌀 Parallax 삽입!", 1400);
  }

  const FONT_SIZES = ["12px","14px","16px","18px","20px","24px","28px","32px"];
  const COLORS = ["#111111","#ef4444","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899","#ffffff"];

  async function onSave(statusType) {
    if (!editor) return;
    const idVal = Number(form.id);
    const title = form.title.trim();
    const excerpt = form.excerpt.trim();
    const tags = parseTags(form.tagsText);

    if (!idVal || Number.isNaN(idVal)) return show("😵 id가 이상해요", 2200);
    if (!title) return show("✍️ 제목 먼저!", 2200);

    const payload = {
      id: idVal,
      title,
      category: form.category,
      excerpt,
      status: statusType,
      contentHTML: editor.getHTML(),
      cover: form.cover || "",
      coverThumb: form.coverThumb || "",
      coverMedium: form.coverMedium || "",
      tags,
      createdAt: form.createdAt ?? null,
    };

    try {
      if (!idNum) {
        show(statusType === "draft" ? "📝 드래프트…" : "🚀 발행…", 1600);
        await createArticle(payload);
        show("✅ 완료!", 1600);
        if (statusType !== "draft") nav(`/article/${idVal}`);
      } else {
        if (!firebaseId) return show("😵 firebaseId 없음", 2400);
        show("🛠️ 저장…", 1400);
        await updateArticle(firebaseId, payload);
        show("✅ 저장!", 1400);
        if (statusType !== "draft") nav(`/article/${idVal}`);
      }
    } catch (e) {
      console.error(e);
      show("😵 저장 실패", 2400);
    }
  }

  if (checkingAuth) {
    return <div className="uf-wrap" style={{ padding: "90px 16px" }}>확인 중… ⏳</div>;
  }

  if (!adminOk) {
    return (
      <div className="uf-page">
        {toast && <div className="uf-toast">{toast}</div>}
        <header className="uf-topbar">
          <div className="uf-wrap">
            <div className="uf-topbar__inner">
              <button className="uf-brand" onClick={() => nav("/")}>U#</button>
              <div className="uf-nav">
                <button className="uf-btn" onClick={toggleTheme}>
                  {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="uf-wrap" style={{ padding: "80px 16px" }}>
          <div className="uf-card uf-panel">
            <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>🔐 Admin Only</div>
            <div style={{ color: "var(--muted)", marginBottom: 16 }}>관리자만 접근 가능</div>
            <div className="uf-row" style={{ flexWrap: "wrap" }}>
              <button className="uf-btn uf-btn--primary" onClick={adminLogin}>Google 로그인</button>
              <button className="uf-btn" onClick={() => nav("/")}>← 리스트</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="uf-page">
      {toast && <div className="uf-toast">{toast}</div>}

      <header className="uf-topbar">
        <div className="uf-wrap">
          <div className="uf-topbar__inner">
            <button className="uf-brand" onClick={() => nav("/")}>U#</button>
            <div className="uf-nav">
              <button className="uf-btn uf-btn--ghost" onClick={() => nav("/")}>Archive</button>
              <button className="uf-btn" onClick={toggleTheme}>
                {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
              </button>
              <button className="uf-btn uf-btn--ghost" onClick={adminLogout}>Logout</button>
            </div>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="uf-toolbar">
        <div className="uf-wrap">
          <div className="uf-toolbar__inner">
            {!imageMode ? (
              <>
                <button className="uf-btn" onClick={() => editor?.chain().focus().toggleBold().run()}>B</button>
                <button className="uf-btn" onClick={() => editor?.chain().focus().toggleItalic().run()}>I</button>
                <button className="uf-btn" onClick={() => editor?.chain().focus().toggleUnderline().run()}>U</button>
                <button className="uf-btn" onClick={() => editor?.chain().focus().toggleHighlight().run()}>🖍</button>

                <select
                  className="uf-select uf-select--mini"
                  defaultValue=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    editor?.chain().focus().setFontSize(v).run();
                    e.target.value = "";
                  }}
                >
                  <option value="">Size</option>
                  {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>

                <div className="uf-colorRow">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      className="uf-colorDot"
                      style={{ background: c }}
                      onClick={() => editor?.chain().focus().setColor(c).run()}
                      title={c}
                    />
                  ))}
                  <button className="uf-btn" onClick={() => editor?.chain().focus().unsetColor().run()}>✕</button>
                </div>

                <button className="uf-btn" onClick={() => editor?.chain().focus().toggleBlockquote().run()}>❝ Quote</button>
                <button className="uf-btn" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>— SceneBreak</button>

                <button
                  className="uf-btn"
                  onClick={() => {
                    const prev = editor?.getAttributes("link")?.href || "";
                    const url = window.prompt("링크 URL", prev || "https://");
                    if (url === null) return;
                    if (!url.trim()) return editor?.chain().focus().unsetLink().run();
                    editor?.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
                  }}
                >
                  🔗 Link
                </button>

                <label className="uf-btn" style={{ cursor: "pointer" }}>
                  🖼 Upload
                  <input type="file" accept="image/*" onChange={onBodyImageInput} style={{ display: "none" }} />
                </label>

                <button className="uf-btn" onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
                  ▦ Table
                </button>

                <button className="uf-btn" onClick={() => {
                  const url = window.prompt("YouTube URL", "https://www.youtube.com/watch?v=");
                  if (!url) return;
                  editor?.chain().focus().setYoutubeVideo({ src: url, width: 720, height: 405 }).run();
                }}>
                  ▶ YouTube
                </button>

                {/* 노션식 + 블록 */}
                <button className="uf-btn" onClick={insertScene}>＋ Scene</button>
                <button className="uf-btn" onClick={insertStickyStory}>＋ Sticky</button>
                <button className="uf-btn" onClick={insertParallaxImage}>＋ Parallax</button>

                <button className="uf-btn" onClick={() => editor?.chain().focus().undo().run()}>↶</button>
                <button className="uf-btn" onClick={() => editor?.chain().focus().redo().run()}>↷</button>
              </>
            ) : (
              <>
                <button className="uf-btn" onClick={() => setSelectedImageWidth(editor, 100)}>Img 100</button>
                <button className="uf-btn" onClick={() => setSelectedImageWidth(editor, 50)}>Img 50</button>
                <button className="uf-btn" onClick={() => setSelectedImageWidth(editor, 25)}>Img 25</button>

                <button className="uf-btn" onClick={() => setSelectedImageAlign(editor, "left")}>Left</button>
                <button className="uf-btn" onClick={() => setSelectedImageAlign(editor, "center")}>Center</button>
                <button className="uf-btn" onClick={() => setSelectedImageAlign(editor, "right")}>Right</button>

                <button className="uf-btn" onClick={() => setImageMode(false)}>← Back</button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="uf-editorShell">
        <div className="uf-wrap">
          {loading || !editor ? (
            <div style={{ padding: "30px 0" }}>로딩 중… ⏳</div>
          ) : (
            <div className="uf-editorGrid">
              <aside className="uf-card uf-panel">
                <div className="uf-panelTitle">Meta</div>

                {drafts?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div className="uf-label">Drafts</div>
                    <div className="uf-stack" style={{ gap: 8 }}>
                      {drafts.slice(0, 8).map((d) => (
                        <button key={d.id} className="uf-btn uf-btn--ghost" onClick={() => nav(`/write/${d.id}`)}>
                          No.{d.id} — {d.title || "(no title)"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 10 }}>
                  <div className="uf-label">ID</div>
                  <input className="uf-input" value={form.id} disabled={!!idNum}
                    onChange={(e) => setForm((p) => ({ ...p, id: e.target.value }))} />
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div className="uf-label">Title</div>
                  <input className="uf-input" value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div className="uf-label">Category</div>
                  <select className="uf-select" value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                    {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div className="uf-label">Excerpt</div>
                  <textarea className="uf-textarea" value={form.excerpt}
                    onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))} />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div className="uf-label">Tags (comma)</div>
                  <input className="uf-input" value={form.tagsText}
                    onChange={(e) => setForm((p) => ({ ...p, tagsText: e.target.value }))} />
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div className="uf-label">Cover</div>
                  <div className="uf-row" style={{ flexWrap: "wrap" }}>
                    <label className="uf-btn uf-btn--primary" style={{ cursor: "pointer" }}>
                      Upload Cover
                      <input type="file" accept="image/*" onChange={onCoverInput} style={{ display: "none" }} />
                    </label>

                    {form.cover ? (
                      <button className="uf-btn" onClick={() => setForm((p) => ({ ...p, cover: "", coverThumb: "", coverMedium: "" }))}>
                        Remove
                      </button>
                    ) : null}
                  </div>

                  {form.cover ? (
                    <div style={{ marginTop: 10 }}>
                      <img
                        src={form.coverMedium || form.coverThumb || form.cover}
                        alt="cover"
                        style={{ width: "100%", borderRadius: 14, border: "1px solid var(--line)" }}
                      />
                    </div>
                  ) : (
                    <div className="uf-panelHint">
                      ✨ Guide<br/>
                      - “＋ Scene/Sticky/Parallax” 버튼으로 블록을 삽입하세요.<br/>
                      - SceneBreak(HR)는 에디터에서 “SCENE BREAK” 표시가 보입니다.<br/>
                      - 이미지를 클릭하면 “이미지 툴바(크기/정렬)”가 뜹니다.
                    </div>
                  )}
                </div>

                <div className="uf-stack" style={{ marginTop: 12 }}>
                  <button className="uf-btn" onClick={() => onSave("draft")}>📝 Save Draft</button>
                  <button className="uf-btn uf-btn--primary" onClick={() => onSave("published")}>🚀 Publish</button>
                </div>
              </aside>

              <section className="uf-card uf-editorBox">
                <EditorContent editor={editor} />
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
