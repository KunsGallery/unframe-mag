// src/pages/EditorPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
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

import BlockPlusMenu from "../components/BlockPlusMenu";
import { UfImage } from "../tiptap/nodes/UfImage";
import { Scene } from "../tiptap/nodes/Scene.jsx";
import { StickyStory } from "../tiptap/nodes/StickyStory.jsx";
import { ParallaxImage } from "../tiptap/nodes/ParallaxImage.jsx";

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
  const raw = (text || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(raw)).slice(0, 30);
}

export default function EditorPage({ theme, toggleTheme }) {
  const nav = useNavigate();
  const { id } = useParams(); // /write or /write/:id
  const idNum = useMemo(() => (id ? Number(id) : null), [id]);

  const { toast, show } = useToast();

  // Auth
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

  // ✅ extensions (중복 방지: Link/Underline은 여기 1회만)
  const extensions = useMemo(
    () => [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: "Write… (노션처럼 + 버튼으로 블록 추가 가능) ✍️" }),

      TextStyle,
      Color,

      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,

      Youtube.configure({ controls: true, nocookie: true }),

      // Custom nodes
      Scene,
      StickyStory,
      ParallaxImage,
      UfImage,
    ],
    []
  );

  const editor = useEditor({
    extensions,
    content: "",
    editorProps: {
      attributes: {
        class: "ProseMirror",
      },
    },
  });

  // Form state
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

  // Load article
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

          // 기본 템플릿: Scene 2개 넣어주기
          editor.commands.setContent({
            type: "doc",
            content: [
              { type: "scene", content: [{ type: "paragraph", content: [{ type: "text", text: "첫 Scene을 작성해보세요 ✨" }] }] },
              { type: "horizontalRule" },
              { type: "scene", content: [{ type: "paragraph", content: [{ type: "text", text: "여기는 두 번째 장면입니다." }] }] },
            ],
          });

          show("✨ 새 글 시작!", 1400);
        }

        // drafts (index 필요할 수 있으니 실패해도 무시)
        try {
          const d = await (listDraftArticles?.() ?? Promise.resolve([]));
          if (!alive) return;
          setDrafts(Array.isArray(d) ? d : []);
        } catch {
          setDrafts([]);
        }
      } catch (e) {
        console.error(e);
        show("😵 에디터 로딩 오류", 2400);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [editor, adminOk, idNum, nav]);

  // Cover upload
  async function onPickCover(file) {
    if (!file) return;
    try {
      show("🖼️ 커버 업로드…", 1400);
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
      show("😵 커버 업로드 실패", 2400);
    }
  }

  function onCoverInput(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onPickCover(f);
  }

  // Body image upload -> UfImage node
  async function onPickBodyImage(file) {
    if (!file || !editor) return;
    try {
      show("🖼️ 이미지 업로드…", 1400);
      const res = await uploadImage(file);
      if (!res?.url) throw new Error("no url");

      editor.chain().focus().insertContent({
        type: "ufImage",
        attrs: { src: res.url, caption: "", size: "full" },
      }).run();

      show("✅ 이미지 삽입!", 1400);
    } catch (e) {
      console.error(e);
      show("😵 이미지 업로드 실패", 2400);
    }
  }

  // Save
  async function onSave(statusType) {
    if (!editor) return;

    const idVal = Number(form.id);
    const title = form.title.trim();
    const excerpt = form.excerpt.trim();
    const tags = parseTags(form.tagsText);

    if (!idVal || Number.isNaN(idVal)) return show("😵 글 번호(id)가 이상해요.", 2200);
    if (!title) return show("✍️ 제목을 먼저 적어주세요!", 2200);

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
        show(statusType === "draft" ? "📝 드래프트 저장…" : "🚀 발행 중…", 1600);
        await createArticle(payload);
        show(statusType === "draft" ? "✅ 드래프트 저장!" : "🎉 발행 완료!", 2000);
        if (statusType !== "draft") nav(`/article/${idVal}`);
      } else {
        if (!firebaseId) return show("😵 firebaseId가 없어요. 다시 열어주세요.", 2600);
        show("🛠️ 저장 중…", 1400);
        await updateArticle(firebaseId, payload);
        show("✅ 저장 완료!", 1600);
        if (statusType !== "draft") nav(`/article/${idVal}`);
      }
    } catch (e) {
      console.error(e);
      show("😵 저장 오류", 2600);
    }
  }

  function openDraft(d) {
    if (!d?.id) return;
    nav(`/write/${d.id}`);
  }

  // Auth Gate
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
                <button className="uf-btn" onClick={toggleTheme}>{theme === "dark" ? "🌙 Dark" : "☀️ Light"}</button>
              </div>
            </div>
          </div>
        </header>

        <div className="uf-wrap" style={{ padding: "80px 16px" }}>
          <div className="uf-card uf-panel">
            <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>🔐 Admin Only</div>
            <div style={{ color: "var(--muted)", marginBottom: 16 }}>
              이 페이지는 관리자만 접근할 수 있어요.
            </div>
            <div className="uf-row" style={{ gap: 10, flexWrap: "wrap" }}>
              <button className="uf-btn uf-btn--primary" onClick={adminLogin}>Google로 로그인</button>
              <button className="uf-btn" onClick={() => nav("/")}>← 리스트로</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main UI
  return (
    <div className="uf-page">
      {toast && <div className="uf-toast">{toast}</div>}

      <header className="uf-topbar">
        <div className="uf-wrap">
          <div className="uf-topbar__inner">
            <button className="uf-brand" type="button" onClick={() => nav("/")}>U#</button>
            <div className="uf-nav">
              <button className="uf-btn uf-btn--ghost" onClick={() => nav("/")}>Archive</button>
              <button className="uf-btn" onClick={toggleTheme}>{theme === "dark" ? "🌙 Dark" : "☀️ Light"}</button>
              <button className="uf-btn uf-btn--ghost" onClick={adminLogout}>Logout</button>
            </div>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="uf-toolbar">
        <div className="uf-wrap">
          <div className="uf-toolbar__inner">
            <button className="uf-btn" onClick={() => editor?.chain().focus().toggleBold().run()}>B</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().toggleItalic().run()}>I</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().toggleUnderline().run()}>U</button>

            <button className="uf-btn" onClick={() => editor?.chain().focus().toggleHighlight().run()}>🖍</button>

            <button className="uf-btn" onClick={() => editor?.chain().focus().setTextAlign("left").run()}>⬅</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().setTextAlign("center").run()}>↔</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().setTextAlign("right").run()}>➡</button>

            {/* 색상 도트 */}
            <div className="uf-colorRow">
              {[
                "#111827", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899",
              ].map((c) => (
                <button
                  key={c}
                  type="button"
                  className="uf-colorDot"
                  style={{ background: c }}
                  onClick={() => editor?.chain().focus().setColor(c).run()}
                  title={c}
                />
              ))}
              <button className="uf-btn" onClick={() => editor?.chain().focus().unsetColor().run()} title="색 제거">×</button>
            </div>

            <button className="uf-btn" onClick={() => editor?.chain().focus().toggleBlockquote().run()}>❝ Quote</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>— SceneBreak</button>

            <button
              className="uf-btn"
              onClick={() => {
                const prev = editor?.getAttributes("link")?.href || "";
                const url = window.prompt("링크 URL", prev || "https://");
                if (url === null) return;
                if (url.trim() === "") {
                  editor?.chain().focus().unsetLink().run();
                  show("🔗 링크 제거", 1400);
                  return;
                }
                editor?.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
                show("🔗 링크 설정", 1400);
              }}
            >
              🔗 Link
            </button>

            <button className="uf-btn" onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
              ▦ Table
            </button>

            <button className="uf-btn" onClick={() => {
              const url = window.prompt("YouTube URL", "https://www.youtube.com/watch?v=");
              if (!url) return;
              editor?.chain().focus().setYoutubeVideo({ src: url }).run();
            }}>
              ▶ YouTube
            </button>

            <button className="uf-btn" onClick={() => editor?.chain().focus().insertContent({ type: "scene", content: [{ type: "paragraph" }] }).run()}>
              + Scene
            </button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().insertContent({ type: "stickyStory", attrs: { src: "", caption: "" }, content: [{ type: "paragraph" }] }).run()}>
              + Sticky
            </button>
            <button className="uf-btn" onClick={() => {
              const url = window.prompt("Parallax Image URL", "https://");
              if (!url) return;
              editor?.chain().focus().insertContent({ type: "parallaxImage", attrs: { src: url, speed: 0.18 } }).run();
            }}>
              + Parallax
            </button>

            <label className="uf-btn" style={{ cursor: "pointer" }}>
              🖼 Upload
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) onPickBodyImage(f);
                }}
              />
            </label>

            <button className="uf-btn" onClick={() => editor?.chain().focus().undo().run()}>↶</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().redo().run()}>↷</button>
          </div>
        </div>
      </div>

      <div className="uf-editorShell">
        <div className="uf-wrap">
          {loading || !editor ? (
            <div style={{ padding: "30px 0" }}>로딩 중… ⏳</div>
          ) : (
            <div className="uf-editorGrid">
              {/* Left meta */}
              <aside className="uf-card uf-panel">
                <div className="uf-panelTitle">Meta</div>

                {drafts?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div className="uf-label">Drafts</div>
                    <div className="uf-stack" style={{ gap: 8 }}>
                      {drafts.slice(0, 8).map((d) => (
                        <button key={d.id} className="uf-btn uf-btn--ghost" onClick={() => openDraft(d)}>
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
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="제목" />
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
                    onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
                    placeholder="리스트 카드 요약" />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div className="uf-label">Tags (comma)</div>
                  <input className="uf-input" value={form.tagsText}
                    onChange={(e) => setForm((p) => ({ ...p, tagsText: e.target.value }))}
                    placeholder="예: 전시, 인사동, 언프레임" />
                </div>

                {/* Cover */}
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
                    <div className="uf-panelHint">커버가 있으면 리스트/뷰에서 훨씬 고급스럽게 보여요 ✨</div>
                  )}
                </div>

                {/* Actions */}
                <div className="uf-stack" style={{ marginTop: 12 }}>
                  <button className="uf-btn" onClick={() => onSave("draft")}>📝 Save Draft</button>
                  <button className="uf-btn uf-btn--primary" onClick={() => onSave("published")}>🚀 Publish</button>
                </div>

                <div className="uf-panelHint">
                  ✅ 본문 왼쪽 <b>+</b> 버튼으로 Scene/Sticky/Parallax 블록을 추가할 수 있어요.
                  <br />✅ SceneBreak(HR)는 뷰페이지에서 “장면 전환”으로 연출할 수 있어요.
                </div>
              </aside>

              {/* Editor */}
              <section className="uf-card uf-editorBox" style={{ position: "relative" }}>
                {/* Notion-style + menu */}
                <BlockPlusMenu editor={editor} onPickImage={onPickBodyImage} />

                <EditorContent editor={editor} />
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
