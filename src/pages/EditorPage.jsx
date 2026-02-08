// src/pages/EditorPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

/* =============================================================================
  ✅ TipTap core
============================================================================= */
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

/* ✅ 너 프로젝트에서 이미 잘 되던 확장들(기본 안정 세트) */
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";

/* =============================================================================
  ✅ Firebase Auth (관리자 가드)
============================================================================= */
import { auth, googleProvider } from "../firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

/* =============================================================================
  ✅ Services (프로젝트에 이미 있는 함수명 기준)
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
  ✅ Admin emails (rules와 동일하게)
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
    ✅ TipTap editor (안정 세트)
    - duplicate extension 경고가 뜨면: StarterKit 내부에 포함된 것을 “추가로 또 넣는 경우”가 원인
    - Underline은 StarterKit에 없어서 괜찮고, Link도 StarterKit에 기본 포함이 아니라 괜찮지만
      프로젝트 어딘가에서 두 번 추가되면 경고가 뜰 수 있어요.
  ============================================================================= */
  const extensions = useMemo(
    () => [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: "Write something… ✍️" }),
    ],
    []
  );

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
    cover: "",
    coverThumb: "",
    coverMedium: "",
    status: "published",
    createdAt: null,
  });

  /* =============================================================================
    ✅ 글 로드 (adminOk + editor 준비된 뒤)
  ============================================================================= */
  useEffect(() => {
    if (!editor) return;
    if (!adminOk) return; // 관리자 아닐 땐 로드 자체를 안 함

    let alive = true;

    (async () => {
      try {
        setLoading(true);

        // 1) 수정 모드 (/write/:id)
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
            cover: a.cover ?? "",
            coverThumb: a.coverThumb ?? "",
            coverMedium: a.coverMedium ?? "",
            status: a.status ?? "published",
            createdAt: a.createdAt ?? null,
          });

          editor.commands.setContent(a.contentHTML || "");
          show("🛠️ 글을 불러왔어요! 수정해볼까요?", 1600);
        }
        // 2) 새 글 모드 (/write)
        else {
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
          show("✨ 새 글을 시작해볼까요?", 1400);
        }

        // 3) Draft 리스트
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
  }, [editor, adminOk, idNum, nav, show]);

  /* =============================================================================
    ✅ 커버 업로드
  ============================================================================= */
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
      show("😵 커버 업로드 실패! (용량/네트워크 확인)", 2400);
    }
  }

  function onCoverInput(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onPickCover(f);
  }

  /* =============================================================================
    ✅ 본문 이미지 업로드
  ============================================================================= */
  async function onPickBodyImage(file) {
    if (!file || !editor) return;
    try {
      show("🖼️ 본문 이미지 업로드 중…", 1200);
      const res = await uploadImage(file);
      if (!res?.url) throw new Error("no url");
      editor.chain().focus().setImage({ src: res.url }).run();
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
    ✅ 2/3단 (HTML 방식) — 깨질 확률 0에 가깝게
  ============================================================================= */
  function insertColumns(n) {
    if (!editor) return;

    const html =
      n === 2
        ? `
<div class="uf-cols uf-cols-2">
  <div class="uf-col"><p>Column 1</p></div>
  <div class="uf-col"><p>Column 2</p></div>
</div>
<p></p>`
        : `
<div class="uf-cols uf-cols-3">
  <div class="uf-col"><p>Column 1</p></div>
  <div class="uf-col"><p>Column 2</p></div>
  <div class="uf-col"><p>Column 3</p></div>
</div>
<p></p>`;

    editor.chain().focus().insertContent(html).run();
    show(`📚 ${n}단 레이아웃을 넣었어요!`, 1600);
  }

  /* =============================================================================
    ✅ 저장
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
        contentHTML: editor.getHTML(),

        cover: form.cover || "",
        coverThumb: form.coverThumb || "",
        coverMedium: form.coverMedium || "",
        tags,

        createdAt: form.createdAt ?? null,
      };

      // 새 글
      if (!idNum) {
        show(statusType === "draft" ? "📝 드래프트 저장 중…" : "🚀 발행 중…", 1600);
        await createArticle(payload);
        show(statusType === "draft" ? "✅ 드래프트 저장 완료!" : "🎉 발행 완료! 뷰로 이동할게요.", 2200);
        if (statusType !== "draft") nav(`/article/${idVal}`);
      }
      // 수정
      else {
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
            <button className="uf-btn" onClick={() => editor?.chain().focus().toggleBold().run()}>B</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().toggleItalic().run()}>I</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().toggleUnderline().run()}>U</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().toggleHighlight().run()}>🖍</button>

            <button className="uf-btn" onClick={() => editor?.chain().focus().setTextAlign("left").run()}>⬅</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().setTextAlign("center").run()}>↔</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().setTextAlign("right").run()}>➡</button>

            <button className="uf-btn" onClick={() => editor?.chain().focus().toggleBulletList().run()}>• List</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1. List</button>

            <button className="uf-btn" onClick={() => editor?.chain().focus().toggleBlockquote().run()}>❝ Quote</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>— Divider</button>

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

            <label className="uf-btn" style={{ cursor: "pointer" }}>
              🖼 Upload
              <input type="file" accept="image/*" onChange={onBodyImageInput} style={{ display: "none" }} />
            </label>

            <button className="uf-btn" onClick={() => insertColumns(2)}>2 Col</button>
            <button className="uf-btn" onClick={() => insertColumns(3)}>3 Col</button>

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

                    {form.cover ? (
                      <button
                        className="uf-btn"
                        onClick={() => {
                          setForm((p) => ({ ...p, cover: "", coverThumb: "", coverMedium: "" }));
                          show("🧹 커버 제거 완료", 1400);
                        }}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>

                  {form.cover ? (
                    <div style={{ marginTop: 10 }}>
                      <img
                        src={form.coverMedium || form.coverThumb || form.cover}
                        alt="cover"
                        style={{
                          width: "100%",
                          borderRadius: 14,
                          border: "1px solid var(--line)",
                        }}
                      />
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
                  ✅ 본문에는 이미지 드래그&드롭도 가능해요.
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
