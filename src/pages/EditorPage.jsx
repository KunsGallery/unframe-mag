// src/pages/EditorPage.jsx
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
  const show = (msg, ms = 2200) => {
    setToast(msg);
    clearTimeout(ref.current);
    ref.current = setTimeout(() => setToast(null), ms);
  };
  return { toast, show };
}

function parseTags(text) {
  const raw = (text || "").split(",").map((s) => s.trim()).filter(Boolean);
  return Array.from(new Set(raw)).slice(0, 30);
}

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

function isImageSelected(editor) {
  const sel = editor?.state?.selection;
  return !!sel?.node && sel.node.type?.name === "image";
}

function setSelectedImageWidth(editor, percent) {
  const sel = editor?.state?.selection;
  if (!sel?.node || sel.node.type.name !== "image") return false;

  const prevStyle = sel.node.attrs?.style || "";
  const cleaned = prevStyle.replace(/width\s*:\s*[^;]+;?/gi, "").trim();
  const merged = `${cleaned ? cleaned + " " : ""}width:${percent}%;`.trim();

  editor.chain().focus().updateAttributes("image", { style: merged }).run();
  return true;
}

function setSelectedImageAlign(editor, align) {
  const sel = editor?.state?.selection;
  if (!sel?.node || sel.node.type.name !== "image") return false;

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
  return true;
}

function promptAndSetLink(editor, toast) {
  const prev = editor.getAttributes("link")?.href || "";
  const url = window.prompt("링크 URL을 입력하세요", prev || "https://");
  if (url === null) return;
  const v = url.trim();
  if (!v) {
    editor.chain().focus().unsetLink().run();
    toast("🔗 링크를 제거했어요.", 1600);
    return;
  }
  editor.chain().focus().extendMarkRange("link").setLink({ href: v }).run();
  toast("🔗 링크를 설정했어요!", 1600);
}

function mediumTemplateHTML() {
  // ✅ Scene은 “Divider(=hr)”로 나눔
  // ✅ Sticky scene은 장면 안에 [sticky] 라고 한 줄 쓰고, 이미지를 1개 넣으면 됨
  return `
<h2>Intro</h2>
<p>짧고 강한 첫 문장으로 시작해요.</p>

<hr/>

<p>[sticky]</p>
<p>이 장면은 스티키 장면이에요. 아래에 <b>이미지를 하나</b> 넣어보세요.</p>
<p>(이미지 업로드 → 본문에 넣기)</p>

<hr/>

<h2>Scene 3</h2>
<p>여기부터는 일반 장면이에요. 문장을 리듬감 있게 구성해봐요.</p>
<blockquote>좋은 글은 정보와 감정이 같이 움직여요.</blockquote>

<hr/>

<h2>Closing</h2>
<p>마지막은 한 문장으로 정리해도 좋아요.</p>
`.trim();
}

export default function EditorPage({ theme, toggleTheme }) {
  const nav = useNavigate();
  const { id } = useParams();
  const idNum = useMemo(() => (id ? Number(id) : null), [id]);

  const { toast, show } = useToast();
  const [helpOpen, setHelpOpen] = useState(true);

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
        show("🚫 관리자 계정이 아니에요.", 2400);
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
      show("👋 로그아웃 완료!", 1600);
    } catch (e) {
      console.error(e);
      show("😵 로그아웃 실패", 2000);
    }
  }

  const extensions = useMemo(() => {
    return [
      StarterKit,
      TextStyle,
      FontSize,
      Color.configure({ types: ["textStyle"] }),

      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),

      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Image.configure({ inline: false, allowBase64: false }),

      Placeholder.configure({ placeholder: "Write something… ✍️\n\n(Guide에서 Scene/Sticky 규칙을 확인하세요)" }),
    ];
  }, []);

  const editor = useEditor({ extensions, content: "" });

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

  const [imageMode, setImageMode] = useState(false);
  useEffect(() => {
    if (!editor) return;
    const update = () => setImageMode(isImageSelected(editor));
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
    if (!adminOk) return;

    let alive = true;

    (async () => {
      try {
        setLoading(true);

        if (idNum) {
          const a = await getArticleByIdNumber(idNum);
          if (!alive) return;

          if (!a) {
            show("😮 글을 찾지 못했어요. 리스트로 이동해요.", 2000);
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
          show("✨ 새 글 시작!", 1200);
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
        show("😵 에디터 로딩 오류", 2200);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [editor, adminOk, idNum, nav]);

  async function onPickCover(file) {
    if (!file) return;
    try {
      show("🖼️ 커버 업로드 중…", 1400);
      const res = await uploadImage(file);

      setForm((p) => ({
        ...p,
        cover: res.url || "",
        coverThumb: res.thumbUrl || p.coverThumb || "",
        coverMedium: res.mediumUrl || p.coverMedium || "",
      }));

      show("✅ 커버 업로드 완료!", 1400);
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
      show("🖼️ 이미지 업로드 중…", 1200);
      const res = await uploadImage(file);
      if (!res?.url) throw new Error("no url");
      editor.chain().focus().setImage({ src: res.url }).run();
      show("✅ 이미지 삽입 완료!", 1400);
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

  async function onSave(statusType) {
    if (!editor) return;

    const idVal = Number(form.id);
    const title = form.title.trim();
    const excerpt = form.excerpt.trim();
    const tags = parseTags(form.tagsText);

    if (!idVal || Number.isNaN(idVal)) return show("😵 글 번호(id)가 이상해요.", 2000);
    if (!title) return show("✍️ 제목을 먼저 적어주세요!", 2000);

    try {
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

      if (!idNum) {
        show(statusType === "draft" ? "📝 드래프트 저장…" : "🚀 발행 중…", 1400);
        const newId = await createArticle(payload);
        if (newId) setFirebaseId(newId);
        show(statusType === "draft" ? "✅ 드래프트 저장 완료!" : "🎉 발행 완료!", 1600);
        if (statusType !== "draft") nav(`/article/${idVal}`);
      } else {
        if (!firebaseId) return show("😵 firebaseId가 없어요.", 2000);
        show("🛠️ 저장 중…", 1400);
        await updateArticle(firebaseId, payload);
        show("✅ 저장 완료!", 1600);
        if (statusType !== "draft") nav(`/article/${idVal}`);
      }
    } catch (e) {
      console.error(e);
      show("😵 저장 실패", 2200);
    }
  }

  function openDraft(d) {
    if (!d?.id) return;
    nav(`/write/${d.id}`);
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
              <button className="uf-brand" type="button" onClick={() => nav("/")}>U#</button>
              <div className="uf-nav">
                <button className="uf-btn" type="button" onClick={toggleTheme}>
                  {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="uf-wrap" style={{ padding: "80px 16px" }}>
          <div className="uf-card" style={{ padding: 18 }}>
            <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>🔐 Admin Only</div>
            <div style={{ color: "var(--muted)", marginBottom: 16 }}>이 페이지는 관리자만 접근할 수 있어요.</div>
            <div className="uf-row" style={{ gap: 10, flexWrap: "wrap" }}>
              <button className="uf-btn uf-btn--primary" type="button" onClick={adminLogin}>Google로 로그인</button>
              <button className="uf-btn" type="button" onClick={() => nav("/")}>← 리스트로 돌아가기</button>
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
            <button className="uf-brand" type="button" onClick={() => nav("/")}>U#</button>

            <div className="uf-nav">
              <button className="uf-btn uf-btn--ghost" type="button" onClick={() => nav("/")}>Archive</button>
              <button className="uf-btn uf-btn--ghost" type="button" onClick={() => setHelpOpen((v) => !v)}>
                {helpOpen ? "✕" : "?"} Guide
              </button>
              <button className="uf-btn" type="button" onClick={toggleTheme}>
                {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
              </button>
              <button className="uf-btn uf-btn--ghost" type="button" onClick={adminLogout}>Logout</button>
            </div>
          </div>
        </div>
      </header>

      <div className="uf-toolbar">
        <div className="uf-wrap">
          <div className="uf-toolbar__inner">
            {!imageMode ? (
              <>
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().toggleBold().run()}><b>B</b></button>
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().toggleItalic().run()}><i>I</i></button>
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().toggleUnderline().run()}><u>U</u></button>
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().toggleHighlight().run()}>🖍</button>

                <div className="uf-colorRow">
                  {["#111111","#ef4444","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899","#22c55e","#06b6d4"].map((c)=>(
                    <button key={c} className="uf-colorDot" type="button" onClick={()=>editor?.chain().focus().setColor(c).run()} style={{background:c}} />
                  ))}
                  <button className="uf-btn" type="button" onClick={()=>editor?.chain().focus().unsetColor().run()}>✕</button>
                </div>

                <select className="uf-select uf-select--mini" defaultValue="" onChange={(e)=>{
                  const v = e.target.value;
                  if(!v) return;
                  editor?.chain().focus().setFontSize(v).run();
                  e.target.value="";
                }}>
                  <option value="">Size</option>
                  {["12px","14px","16px","18px","20px","24px","28px","32px","40px"].map(s=>(
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <button className="uf-btn" type="button" onClick={()=>editor?.chain().focus().setTextAlign("left").run()}>⬅</button>
                <button className="uf-btn" type="button" onClick={()=>editor?.chain().focus().setTextAlign("center").run()}>↔</button>
                <button className="uf-btn" type="button" onClick={()=>editor?.chain().focus().setTextAlign("right").run()}>➡</button>

                <button className="uf-btn" type="button" onClick={()=>editor?.chain().focus().toggleBulletList().run()}>• List</button>
                <button className="uf-btn" type="button" onClick={()=>editor?.chain().focus().toggleOrderedList().run()}>1. List</button>

                <button className="uf-btn" type="button" onClick={()=>editor?.chain().focus().toggleBlockquote().run()}>❝ Quote</button>
                <button className="uf-btn" type="button" onClick={()=>editor?.chain().focus().setHorizontalRule().run()}>— Divider</button>

                <button className="uf-btn" type="button" onClick={()=>promptAndSetLink(editor, show)}>🔗 Link</button>

                <label className="uf-btn" style={{cursor:"pointer"}}>
                  🖼 Upload
                  <input type="file" accept="image/*" onChange={onBodyImageInput} style={{display:"none"}}/>
                </label>

                <button
                  className="uf-btn uf-btn--primary"
                  type="button"
                  onClick={() => {
                    editor?.chain().focus().setContent(mediumTemplateHTML()).run();
                    setHelpOpen(true);
                    show("✨ 템플릿을 넣었어요! (Divider=Scene, [sticky]=Sticky)", 2400);
                  }}
                >
                  ✨ Template
                </button>

                <button className="uf-btn" type="button" onClick={()=>editor?.chain().focus().undo().run()}>↶</button>
                <button className="uf-btn" type="button" onClick={()=>editor?.chain().focus().redo().run()}>↷</button>
              </>
            ) : (
              <>
                <button className="uf-btn" type="button" onClick={() => setSelectedImageWidth(editor,100)}>100%</button>
                <button className="uf-btn" type="button" onClick={() => setSelectedImageWidth(editor,50)}>50%</button>
                <button className="uf-btn" type="button" onClick={() => setSelectedImageWidth(editor,25)}>25%</button>
                <button className="uf-btn" type="button" onClick={() => setSelectedImageAlign(editor,"left")}>⬅</button>
                <button className="uf-btn" type="button" onClick={() => setSelectedImageAlign(editor,"center")}>↔</button>
                <button className="uf-btn" type="button" onClick={() => setSelectedImageAlign(editor,"right")}>➡</button>
                <button className="uf-btn" type="button" onClick={() => { editor?.chain().focus().deleteSelection().run(); show("🗑️ 이미지 삭제", 1400); }}>
                  🗑 Delete
                </button>
                <button className="uf-btn uf-btn--ghost" type="button" onClick={() => setImageMode(false)}>← Back</button>
              </>
            )}
          </div>
        </div>
      </div>

      {helpOpen && (
        <div className="uf-wrap" style={{ padding: "14px 16px" }}>
          <div className="uf-card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>📖 Scrollytelling Guide</div>
            <div style={{ color: "var(--muted)", lineHeight: 1.6, fontSize: 13 }}>
              <b>1) Scene(장면) 만들기</b><br/>
              → 툴바의 <b>— Divider</b> 버튼을 누르면 <b>SCENE BREAK</b>가 생겨요.<br/>
              뷰페이지에서는 이걸 기준으로 자동으로 “장면”이 나뉘고 Reveal이 걸려요.
              <br/><br/>
              <b>2) Sticky Scene 만들기</b><br/>
              → 장면 안에 텍스트로 <b>[sticky]</b> 라고 한 줄 쓰고,<br/>
              그 장면 안에 <b>이미지 1개</b>를 넣으면 뷰페이지에서 자동으로 Sticky Story로 바뀝니다.
              <br/><br/>
              <b>3) Parallax</b><br/>
              → 지금은 Hero 배경 + Sticky 이미지에 parallax가 들어가 있어요.<br/>
              다음 단계에서 “장면 내부 이미지에도 자동 parallax 부여”까지 확장할 수 있어요.
            </div>
          </div>
        </div>
      )}

      <div className="uf-editorShell">
        <div className="uf-wrap">
          <div className="uf-editorGrid">
            <aside className="uf-card uf-panel">
              <div className="uf-panelTitle">Meta</div>

              {drafts?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div className="uf-label">Drafts</div>
                  <div className="uf-stack" style={{ gap: 8 }}>
                    {drafts.slice(0, 8).map((d) => (
                      <button key={d.id} className="uf-btn uf-btn--ghost" type="button" onClick={() => openDraft(d)}>
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
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="제목" />
              </div>

              <div style={{ marginBottom: 10 }}>
                <div className="uf-label">Category</div>
                <select className="uf-select" value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                  {CATEGORY_OPTIONS.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>

              <div style={{ marginBottom: 10 }}>
                <div className="uf-label">Excerpt</div>
                <textarea className="uf-textarea" value={form.excerpt}
                  onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))} placeholder="리스트 카드 요약" />
              </div>

              <div style={{ marginBottom: 12 }}>
                <div className="uf-label">Tags (comma)</div>
                <input className="uf-input" value={form.tagsText}
                  onChange={(e) => setForm((p) => ({ ...p, tagsText: e.target.value }))} placeholder="예: 전시, 인사동" />
              </div>

              <div style={{ marginBottom: 10 }}>
                <div className="uf-label">Cover</div>
                <div className="uf-row" style={{ flexWrap: "wrap" }}>
                  <label className="uf-btn uf-btn--primary" style={{ cursor: "pointer" }}>
                    Upload Cover
                    <input type="file" accept="image/*" onChange={onCoverInput} style={{ display: "none" }} />
                  </label>
                  {form.cover ? (
                    <button className="uf-btn" type="button" onClick={() => setForm((p) => ({ ...p, cover: "", coverThumb: "", coverMedium: "" }))}>
                      Remove
                    </button>
                  ) : null}
                </div>

                {form.cover ? (
                  <div style={{ marginTop: 10 }}>
                    <img src={form.coverMedium || form.coverThumb || form.cover} alt="cover"
                      style={{ width: "100%", borderRadius: 14, border: "1px solid var(--line)" }} />
                  </div>
                ) : (
                  <div className="uf-panelHint">커버가 있으면 뷰/리스트에서 더 좋아 보여요 ✨</div>
                )}
              </div>

              <div className="uf-stack" style={{ marginTop: 12 }}>
                <button className="uf-btn" type="button" disabled={loading} onClick={() => onSave("draft")}>
                  📝 Save Draft
                </button>
                <button className="uf-btn uf-btn--primary" type="button" disabled={loading} onClick={() => onSave("published")}>
                  🚀 Publish
                </button>
              </div>

              {loading && <div className="uf-panelHint">⏳ 글 데이터를 불러오는 중이에요…</div>}
            </aside>

            <section className="uf-card uf-editorBox">
              <EditorContent editor={editor} />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
