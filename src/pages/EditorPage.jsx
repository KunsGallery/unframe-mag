// src/pages/EditorPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

/* =============================================================================
  ✅ TipTap core
============================================================================= */
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

/* ✅ 필수 확장 */
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";

/* ✅ 색/텍스트스타일(추후 확장 대비, 지금도 유용) */
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";

/* ✅ Scene 확장(중요!) */
import { Scene } from "../tiptap/Scene";

/* =============================================================================
  ✅ Firebase Auth (관리자 가드)
============================================================================= */
import { auth, googleProvider } from "../firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

/* =============================================================================
  ✅ Services
============================================================================= */
import {
  getNextArticleId,
  getArticleByIdNumber,
  createArticle,
  updateArticle,
  listDraftArticles,
} from "../services/articles";

import { uploadImage } from "../services/upload";

/* =============================================================================
  ✅ Admin emails (rules와 동일)
============================================================================= */
const ADMIN_EMAILS = new Set([
  "gallerykuns@gmail.com",
  "cybog2004@gmail.com",
  "sylove887@gmail.com",
]);

const CATEGORY_OPTIONS = ["Exhibition", "Project", "Artist Note", "News"];

/* =============================================================================
  ✅ Toast
============================================================================= */
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
  return Array.from(new Set(raw)).slice(0, 20);
}

/** ✅ 혹시 모르게 extension 중복 방지(경고 예방) */
function dedupeExtensions(exts) {
  const map = new Map();
  for (const e of exts.filter(Boolean)) map.set(e.name, e);
  return Array.from(map.values());
}

export default function EditorPage({ theme, toggleTheme }) {
  const nav = useNavigate();
  const { id } = useParams(); // /write or /write/:id
  const idNum = useMemo(() => (id ? Number(id) : null), [id]);

  const { toast, show } = useToast();

  /* =============================================================================
    ✅ 관리자 인증 상태
  ============================================================================= */
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
        show("🚫 관리자 계정이 아니에요. 접근할 수 없어요.", 2600);
        await signOut(auth);
      } else {
        show("✅ 관리자 로그인 완료! 환영해요 ✨", 2000);
      }
    } catch (e) {
      console.error(e);
      show("😵 로그인에 실패했어요. 다시 시도해볼까요?", 2600);
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

  /* =============================================================================
    ✅ TipTap editor
    - Scene 확장을 추가했기 때문에 이제 "섹션 기반" 글 작성이 가능해짐
  ============================================================================= */
  const extensions = useMemo(() => {
    const exts = [
      StarterKit,
      TextStyle,
      Color.configure({ types: ["textStyle"] }),

      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),

      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Image.configure({ inline: false, allowBase64: false }),

      // ✅ 핵심: Scene(섹션)
      Scene,

      Placeholder.configure({ placeholder: "Write something… ✍️ (Scene 섹션을 넣어보세요)" }),
    ];
    return dedupeExtensions(exts);
  }, []);

  const editor = useEditor({
    extensions,
    content: "",
  });

  /* =============================================================================
    ✅ 폼/로딩 상태
  ============================================================================= */
  const [loading, setLoading] = useState(true);
  const [firebaseId, setFirebaseId] = useState(null);
  const [drafts, setDrafts] = useState([]);

  const [form, setForm] = useState({
    id: "",
    title: "",
    category: CATEGORY_OPTIONS[0],
    excerpt: "",
    tagsText: "",

    // ✅ cover를 객체로 저장(Cloudinary 메타 포함)
    cover: null, // { url, publicId, width, height, format, bytes }

    status: "published",
    createdAt: null,
  });

  /* =============================================================================
    ✅ 글 로드 (adminOk + editor 준비된 뒤)
  ============================================================================= */
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
            show("😮 글을 찾지 못했어요. 리스트로 돌아갈게요.", 2400);
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

            // ✅ 이전에 cover가 문자열이었을 수도 있어서 호환 처리
            cover:
              typeof a.cover === "object" && a.cover?.url
                ? a.cover
                : a.cover
                ? { url: a.cover }
                : null,

            status: a.status ?? "published",
            createdAt: a.createdAt ?? null,
          });

          // ✅ contentJSON이 있으면 JSON 우선, 없으면 HTML
          if (a.contentJSON) editor.commands.setContent(a.contentJSON);
          else editor.commands.setContent(a.contentHTML || "");

          show("🛠️ 글을 불러왔어요! 수정해볼까요?", 1600);
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
            cover: null,
            status: "published",
            createdAt: null,
          }));

          // ✅ 새 글은 기본 Scene 1개부터 시작하면 scrollytelling에 좋아
          editor.commands.setContent({
            type: "doc",
            content: [
              {
                type: "scene",
                attrs: { variant: "text", parallax: 0.12 },
                content: [{ type: "paragraph", content: [{ type: "text", text: "첫 Scene을 작성해보세요 ✨" }] }],
              },
            ],
          });

          show("✨ 새 글을 시작해볼까요? (Scene 기반)", 1500);
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
        show("😵 에디터 로딩 중 문제가 생겼어요.", 2400);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [editor, adminOk, idNum, nav]);

  /* =============================================================================
    ✅ 커버 업로드(Cloudinary Signed)
  ============================================================================= */
  async function onPickCover(file) {
    if (!file) return;
    try {
      show("🖼️ 커버 업로드 중…", 1400);
      const res = await uploadImage(file);

      setForm((p) => ({
        ...p,
        cover: {
          url: res.url,
          publicId: res.publicId,
          width: res.width,
          height: res.height,
          format: res.format,
          bytes: res.bytes,
        },
      }));

      show("✅ 커버 업로드 완료!", 1400);
    } catch (e) {
      console.error(e);
      show("😵 커버 업로드 실패! (네트워크/서버 확인)", 2400);
    }
  }

  function onCoverInput(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onPickCover(f);
  }

  /* =============================================================================
    ✅ 본문 이미지 업로드(Cloudinary Signed)
  ============================================================================= */
  async function onPickBodyImage(file) {
    if (!file || !editor) return;
    try {
      show("🖼️ 본문 이미지 업로드 중…", 1200);
      const res = await uploadImage(file);
      if (!res?.url) throw new Error("no url");

      // ✅ img node 삽입 + 메타를 attrs에 남겨두면(나중 확장에 유리)
      editor
        .chain()
        .focus()
        .setImage({
          src: res.url,
          "data-public-id": res.publicId,
          "data-w": String(res.width || ""),
          "data-h": String(res.height || ""),
        })
        .run();

      show("✅ 이미지 삽입 완료!", 1400);
    } catch (e) {
      console.error(e);
      show("😵 본문 이미지 업로드 실패!", 2200);
    }
  }

  function onBodyImageInput(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onPickBodyImage(f);
  }

  /* ✅ 드래그&드롭 업로드 */
  useEffect(() => {
    if (!editor) return;
    const el = document.querySelector(".uf-editorBox .ProseMirror");
    if (!el) return;

    function onDrop(ev) {
      const file = ev.dataTransfer?.files?.[0];
      if (!file?.type?.startsWith("image/")) return;
      ev.preventDefault();
      onPickBodyImage(file);
    }
    function onDragOver(ev) {
      const file = ev.dataTransfer?.files?.[0];
      if (file?.type?.startsWith("image/")) ev.preventDefault();
    }

    el.addEventListener("drop", onDrop);
    el.addEventListener("dragover", onDragOver);
    return () => {
      el.removeEventListener("drop", onDrop);
      el.removeEventListener("dragover", onDragOver);
    };
  }, [editor]);

  /* =============================================================================
    ✅ 저장 (HTML + JSON 둘 다 저장)
  ============================================================================= */
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

        // ✅ 둘 다 저장(초석)
        contentHTML: editor.getHTML(),
        contentJSON: editor.getJSON(),

        // ✅ cover는 객체 권장(없으면 null)
        cover: form.cover || null,

        tags,

        createdAt: form.createdAt ?? null,
      };

      if (!idNum) {
        show(statusType === "draft" ? "📝 드래프트 저장 중…" : "🚀 발행 중…", 1600);
        await createArticle(payload);
        show(statusType === "draft" ? "✅ 드래프트 저장 완료!" : "🎉 발행 완료!", 2200);
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
      show("😵 저장 중 오류가 발생했어요.", 2600);
    }
  }

  function openDraft(d) {
    if (!d?.id) return;
    nav(`/write/${d.id}`);
  }

  /* =============================================================================
    ✅ Auth Gate UI
  ============================================================================= */
  if (checkingAuth) {
    return (
      <div className="uf-wrap" style={{ padding: "90px 16px" }}>
        확인 중… ⏳
      </div>
    );
  }

  if (!adminOk) {
    return (
      <div className="uf-page">
        {toast && <div className="uf-toast">{toast}</div>}

        <header className="uf-topbar">
          <div className="uf-wrap">
            <div className="uf-topbar__inner">
              <div className="uf-brand" onClick={() => nav("/")}>U#</div>
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
            <div style={{ color: "var(--muted)", marginBottom: 16 }}>
              이 페이지는 관리자만 접근할 수 있어요.
            </div>

            <div className="uf-row" style={{ gap: 10, flexWrap: "wrap" }}>
              <button className="uf-btn uf-btn--primary" onClick={adminLogin}>
                Google로 로그인
              </button>
              <button className="uf-btn" onClick={() => nav("/")}>← 리스트로 돌아가기</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* =============================================================================
    ✅ Main UI
  ============================================================================= */
  return (
    <div className="uf-page">
      {toast && <div className="uf-toast">{toast}</div>}

      {/* Topbar */}
      <header className="uf-topbar">
        <div className="uf-wrap">
          <div className="uf-topbar__inner">
            <div className="uf-brand" onClick={() => nav("/")}>U#</div>

            <div className="uf-nav">
              <button className="uf-btn uf-btn--ghost" onClick={() => nav("/")}>Archive</button>
              <button className="uf-btn" onClick={toggleTheme}>
                {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
              </button>
              <button className="uf-btn uf-btn--ghost" onClick={adminLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Toolbar (sticky) */}
      <div className="uf-toolbar">
        <div className="uf-wrap">
          <div className="uf-toolbar__inner">
            {/* ✅ Scene 버튼(초석) */}
            <button className="uf-btn" onClick={() => editor?.commands.insertScene({ variant: "text", parallax: 0.12 })}>
              + Scene
            </button>
            <button className="uf-btn" onClick={() => editor?.commands.insertStickyScene({ variant: "sticky", parallax: 0.18 })}>
              + Sticky Scene
            </button>

            <span style={{ width: 1, height: 26, background: "var(--line)", margin: "0 6px" }} />

            {/* 기본 서식 */}
            <button className="uf-btn" onClick={() => editor?.chain().focus().toggleBold().run()}>B</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().toggleItalic().run()}>I</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().toggleUnderline().run()}>U</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().toggleHighlight().run()}>🖍</button>

            {/* 정렬 */}
            <button className="uf-btn" onClick={() => editor?.chain().focus().setTextAlign("left").run()}>⬅</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().setTextAlign("center").run()}>↔</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().setTextAlign("right").run()}>➡</button>

            {/* 리스트/인용 */}
            <button className="uf-btn" onClick={() => editor?.chain().focus().toggleBulletList().run()}>• List</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1. List</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().toggleBlockquote().run()}>❝ Quote</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>— Divider</button>

            {/* 링크 */}
            <button
              className="uf-btn"
              onClick={() => {
                const prev = editor?.getAttributes("link")?.href || "";
                const url = window.prompt("링크 URL", prev || "https://");
                if (url === null) return;
                if (url.trim() === "") {
                  editor?.chain().focus().unsetLink().run();
                  show("🔗 링크 제거!", 1400);
                  return;
                }
                editor?.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
                show("🔗 링크 설정!", 1400);
              }}
            >
              🔗 Link
            </button>

            {/* 본문 이미지 업로드 */}
            <label className="uf-btn" style={{ cursor: "pointer" }}>
              🖼 Upload
              <input type="file" accept="image/*" onChange={onBodyImageInput} style={{ display: "none" }} />
            </label>

            {/* undo/redo */}
            <button className="uf-btn" onClick={() => editor?.chain().focus().undo().run()}>↶</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().redo().run()}>↷</button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="uf-editorShell">
        <div className="uf-wrap">
          {loading || !editor ? (
            <div style={{ padding: "30px 0" }}>로딩 중… ⏳</div>
          ) : (
            <div className="uf-editorGrid">
              {/* Left panel (meta) */}
              <aside className="uf-card uf-panel">
                <div className="uf-panelTitle">Meta</div>

                {/* Drafts */}
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
                  <input
                    className="uf-input"
                    value={form.id}
                    disabled={!!idNum}
                    onChange={(e) => setForm((p) => ({ ...p, id: e.target.value }))}
                  />
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div className="uf-label">Title</div>
                  <input
                    className="uf-input"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="제목"
                  />
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div className="uf-label">Category</div>
                  <select
                    className="uf-select"
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div className="uf-label">Excerpt</div>
                  <textarea
                    className="uf-textarea"
                    value={form.excerpt}
                    onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
                    placeholder="리스트 카드 요약"
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div className="uf-label">Tags (comma)</div>
                  <input
                    className="uf-input"
                    value={form.tagsText}
                    onChange={(e) => setForm((p) => ({ ...p, tagsText: e.target.value }))}
                    placeholder="예: 전시, 인사동, 언프레임"
                  />
                </div>

                {/* Cover */}
                <div style={{ marginBottom: 10 }}>
                  <div className="uf-label">Cover</div>

                  <div className="uf-row" style={{ flexWrap: "wrap" }}>
                    <label className="uf-btn uf-btn--primary" style={{ cursor: "pointer" }}>
                      Upload Cover
                      <input type="file" accept="image/*" onChange={onCoverInput} style={{ display: "none" }} />
                    </label>

                    {form.cover?.url ? (
                      <button
                        className="uf-btn"
                        onClick={() => {
                          setForm((p) => ({ ...p, cover: null }));
                          show("🧹 커버 제거 완료", 1400);
                        }}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>

                  {form.cover?.url ? (
                    <div style={{ marginTop: 10 }}>
                      <img
                        src={form.cover.url}
                        alt="cover"
                        style={{
                          width: "100%",
                          borderRadius: 14,
                          border: "1px solid var(--line)",
                        }}
                      />
                      <div className="uf-panelHint">
                        ✅ Cloudinary meta: {form.cover.publicId || "(no publicId)"} / {form.cover.width || "?"}×{form.cover.height || "?"}
                      </div>
                    </div>
                  ) : (
                    <div className="uf-panelHint">커버가 있으면 리스트/뷰에서 더 고급스럽게 보여요 ✨</div>
                  )}
                </div>

                {/* Actions */}
                <div className="uf-stack" style={{ marginTop: 12 }}>
                  <button className="uf-btn" onClick={() => onSave("draft")}>📝 Save Draft</button>
                  <button className="uf-btn uf-btn--primary" onClick={() => onSave("published")}>🚀 Publish</button>
                </div>

                <div className="uf-panelHint">
                  ✅ 이제 Scene(섹션) 단위로 쓰면, 뷰페이지에서 Sticky/Reveal/Parallax 연출이 가능해요.
                </div>
              </aside>

              {/* Right panel (editor) */}
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
