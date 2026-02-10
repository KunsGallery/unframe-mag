// src/pages/EditorPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

/* =============================================================================
  ✅ TipTap
============================================================================= */
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

/* ✅ 우리가 만든 노드(블록) */
import { Scene } from "../tiptap/nodes/Scene";
import { StickyStory } from "../tiptap/nodes/StickyStory";
import { ParallaxImage } from "../tiptap/nodes/ParallaxImage";

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
  ✅ Admin
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
  const show = (msg, ms = 2200) => {
    setToast(msg);
    clearTimeout(ref.current);
    ref.current = setTimeout(() => setToast(null), ms);
  };
  return { toast, show };
}

/* =============================================================================
  ✅ Tags parse
============================================================================= */
function parseTags(text) {
  const raw = (text || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(raw)).slice(0, 20);
}

/* =============================================================================
  ✅ HTML 템플릿(블록 방식)
  - "insertContent"에 JSON 노드로 넣는 게 핵심
============================================================================= */
function buildTemplate(type) {
  if (type === "medium") {
    return [
      {
        type: "scene",
        attrs: { title: "Intro" },
        content: [{ type: "paragraph", content: [{ type: "text", text: "리드 문장을 적어주세요." }] }],
      },
      {
        type: "scene",
        attrs: { title: "Body" },
        content: [
          { type: "paragraph", content: [{ type: "text", text: "본문을 차근차근 적어주세요." }] },
          { type: "paragraph", content: [{ type: "text", text: "중요한 문장은 강조(하이라이트)도 좋아요." }] },
        ],
      },
      {
        type: "scene",
        attrs: { title: "Outro" },
        content: [{ type: "paragraph", content: [{ type: "text", text: "마무리/링크/CTA를 적어주세요." }] }],
      },
    ];
  }

  // shorthand
  return [
    {
      type: "scene",
      attrs: { title: "Hero" },
      content: [
        { type: "paragraph", content: [{ type: "text", text: "첫 문장(강하게) — 독자를 붙잡는 한 줄." }] },
        { type: "paragraph", content: [{ type: "text", text: "두 번째 문장 — 상황/배경 설명." }] },
      ],
    },
    {
      type: "scene",
      attrs: { title: "Sticky Story" },
      content: [
        {
          type: "stickyStory",
          attrs: { mediaSrc: "" },
          content: [
            { type: "paragraph", content: [{ type: "text", text: "스텝 1) 왼쪽 이미지가 고정되고, 이 텍스트가 흐릅니다." }] },
            { type: "paragraph", content: [{ type: "text", text: "스텝 2) 다음 포인트를 적어요." }] },
            { type: "paragraph", content: [{ type: "text", text: "스텝 3) 마지막 메시지." }] },
          ],
        },
      ],
    },
    {
      type: "scene",
      attrs: { title: "Parallax Image" },
      content: [
        { type: "paragraph", content: [{ type: "text", text: "여기에 패럴럭스 이미지를 넣어보세요." }] },
        { type: "parallaxImage", attrs: { src: "", speed: 0.25, width: "100%", align: "center" } },
        { type: "paragraph", content: [{ type: "text", text: "이미지 아래 설명/캡션을 적어도 좋아요." }] },
      ],
    },
    {
      type: "scene",
      attrs: { title: "End" },
      content: [{ type: "paragraph", content: [{ type: "text", text: "마무리 문장 + 링크 + 다음 글 유도." }] }],
    },
  ];
}

/* =============================================================================
  ✅ EditorPage
============================================================================= */
export default function EditorPage({ theme, toggleTheme }) {
  const nav = useNavigate();
  const { id } = useParams(); // /write or /write/:id
  const idNum = useMemo(() => (id ? Number(id) : null), [id]);

  const { toast, show } = useToast();

  /* ============================================================================
    ✅ Auth
  ============================================================================ */
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

  /* ============================================================================
    ✅ TipTap extensions (중복 경고 방지)
    - StarterKit 안에 underline/link가 포함되지 않지만,
      프로젝트 다른 곳에서 중복 추가되면 경고가 날 수 있어요.
    - 여기서는 "이 페이지 안에서만" 정확히 1번씩만 추가합니다.
  ============================================================================ */
  const extensions = useMemo(
    () => [
      StarterKit,
      TextStyle,
      Color.configure({ types: ["textStyle"] }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: "Write something… ✍️" }),

      // ✅ 블록 노드
      Scene,
      StickyStory,
      ParallaxImage,
    ],
    []
  );

  const editor = useEditor({
    extensions,
    content: "",
  });

  /* ============================================================================
    ✅ Form state
  ============================================================================ */
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

  /* ============================================================================
    ✅ Left “+블록” 패널 UI
  ============================================================================ */
  const [blockOpen, setBlockOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  /* ============================================================================
    ✅ Load article (adminOk + editor ready)
  ============================================================================ */
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
            cover: a.cover ?? "",
            coverThumb: a.coverThumb ?? "",
            coverMedium: a.coverMedium ?? "",
            status: a.status ?? "published",
            createdAt: a.createdAt ?? null,
          });

          // ✅ contentHTML이 노드 구조를 포함해도 TipTap이 파싱 가능
          editor.commands.setContent(a.contentHTML || "");
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
            cover: "",
            coverThumb: "",
            coverMedium: "",
            status: "published",
            createdAt: null,
          }));

          // ✅ 기본 시작은 Scene 1개로
          editor.commands.setContent([
            { type: "scene", attrs: { title: "Scene 1" }, content: [{ type: "paragraph" }] },
          ]);
          show("✨ 새 글을 시작해볼까요?", 1400);
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

  /* ============================================================================
    ✅ Upload helpers
  ============================================================================ */
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
      show("😵 커버 업로드 실패! (네트워크/서명/설정 확인)", 2400);
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
      show("😵 이미지 업로드 실패! (Cloudinary 설정 확인)", 2200);
    }
  }

  function onBodyImageInput(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onPickBodyImage(f);
  }

  /* ============================================================================
    ✅ 블록 삽입(노션 + 버튼)
  ============================================================================ */
  async function insertParallaxByUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        show("🖼️ 패럴럭스 이미지 업로드…", 1200);
        const res = await uploadImage(file);
        editor
          ?.chain()
          .focus()
          .insertParallaxImage({
            src: res.url,
            speed: 0.25,
            width: "100%",
            align: "center",
          })
          .run();
        show("✨ 패럴럭스 블록을 넣었어요!", 1600);
      } catch (e) {
        console.error(e);
        show("😵 업로드 실패", 2200);
      }
    };
    input.click();
  }

  async function setStickyMediaByUpload() {
    // ✅ 현재 커서가 stickyStory 내부일 때만 의미가 있음
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        show("🖼️ 스티키 미디어 업로드…", 1200);
        const res = await uploadImage(file);
        editor?.chain().focus().setStickyMedia(res.url).run();
        show("✅ 스티키 미디어가 설정됐어요!", 1600);
      } catch (e) {
        console.error(e);
        show("😵 업로드 실패", 2200);
      }
    };
    input.click();
  }

  function applyTemplate(type) {
    if (!editor) return;
    const content = buildTemplate(type);
    editor.commands.setContent(content);
    show(type === "medium" ? "📰 Medium 템플릿을 넣었어요!" : "🎬 Shorthand 템플릿을 넣었어요!", 2000);
    setBlockOpen(false);
  }

  /* ============================================================================
    ✅ Save
  ============================================================================ */
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
        contentHTML: editor.getHTML(), // ✅ 노드 구조가 HTML로 저장됨

        cover: form.cover || "",
        coverThumb: form.coverThumb || "",
        coverMedium: form.coverMedium || "",
        tags,

        createdAt: form.createdAt ?? null,
      };

      if (!idNum) {
        show(statusType === "draft" ? "📝 드래프트 저장 중…" : "🚀 발행 중…", 1600);
        await createArticle(payload);
        show(statusType === "draft" ? "✅ 드래프트 저장 완료!" : "🎉 발행 완료!", 2000);
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

  /* ============================================================================
    ✅ Auth Gate
  ============================================================================ */
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
            <div style={{ color: "var(--muted)", marginBottom: 16 }}>
              이 페이지는 관리자만 접근할 수 있어요.
            </div>

            <div className="uf-row" style={{ gap: 10, flexWrap: "wrap" }}>
              <button className="uf-btn uf-btn--primary" onClick={adminLogin}>
                Google로 로그인
              </button>
              <button className="uf-btn" onClick={() => nav("/")}>← 리스트로</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================================
    ✅ Main UI
  ============================================================================ */
  return (
    <div className="uf-page">
      {toast && <div className="uf-toast">{toast}</div>}

      {/* Topbar */}
      <header className="uf-topbar">
        <div className="uf-wrap">
          <div className="uf-topbar__inner">
            <button className="uf-brand" onClick={() => nav("/")}>U#</button>

            <div className="uf-nav">
              <button className="uf-btn uf-btn--ghost" onClick={() => nav("/")}>Archive</button>

              {/* ✅ 노션 감성: +블록 */}
              <button className="uf-btn" onClick={() => setBlockOpen((v) => !v)}>
                ➕ 블록
              </button>

              {/* ✅ 가이드 */}
              <button className="uf-btn uf-btn--ghost" onClick={() => setGuideOpen((v) => !v)}>
                📌 Guide
              </button>

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

      {/* ✅ 블록 패널(좌측 느낌의 패널) */}
      {blockOpen && (
        <div className="uf-wrap" style={{ paddingTop: 12 }}>
          <div className="uf-card" style={{ padding: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="uf-btn" onClick={() => { editor?.chain().focus().insertScene({ title: "Scene" }).run(); setBlockOpen(false); }}>
              🎬 Scene
            </button>

            <button className="uf-btn" onClick={() => { editor?.chain().focus().insertStickyStory({ mediaSrc: "" }).run(); setBlockOpen(false); }}>
              📌 Sticky Story
            </button>

            <button className="uf-btn" onClick={insertParallaxByUpload}>
              🌊 Parallax Image
            </button>

            <span style={{ width: 1, background: "var(--line)" }} />

            <button className="uf-btn uf-btn--ghost" onClick={() => applyTemplate("medium")}>
              📰 Medium 템플릿
            </button>
            <button className="uf-btn uf-btn--ghost" onClick={() => applyTemplate("shorthand")}>
              🎞 Shorthand 템플릿
            </button>

            <span style={{ width: 1, background: "var(--line)" }} />

            <label className="uf-btn" style={{ cursor: "pointer" }}>
              🖼 이미지
              <input type="file" accept="image/*" onChange={onBodyImageInput} style={{ display: "none" }} />
            </label>

            <button className="uf-btn" onClick={setStickyMediaByUpload} title="커서가 Sticky Story 안에 있을 때만 적용됨">
              🧷 Sticky 미디어 업로드
            </button>
          </div>
        </div>
      )}

      {/* ✅ 가이드 패널(토글) */}
      {guideOpen && (
        <div className="uf-wrap" style={{ paddingTop: 12 }}>
          <div className="uf-card" style={{ padding: 16, lineHeight: 1.6 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>📌 Editor Guide</div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              • <b>➕ 블록</b> 버튼으로 Scene / Sticky / Parallax를 넣어요.<br />
              • <b>Scene</b> = 장면 단위. 뷰에서 리빌/구분의 기준이 됩니다.<br />
              • <b>Sticky Story</b> = 커서를 그 블록 안에 두고 <b>🧷 Sticky 미디어 업로드</b>를 누르면 왼쪽 이미지가 설정돼요.<br />
              • <b>Parallax Image</b> = 업로드하면 자동으로 패럴럭스 블록이 생성돼요.<br />
              • 구분이 잘 안 보이면: 에디터에서 Scene 테두리와 라벨이 표시됩니다(= 구조 확인).<br />
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="uf-editorShell">
        <div className="uf-wrap">
          {loading || !editor ? (
            <div style={{ padding: "30px 0", color: "var(--muted)" }}>로딩 중… ⏳</div>
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
                        style={{ width: "100%", borderRadius: 14, border: "1px solid var(--line)" }}
                      />
                    </div>
                  ) : (
                    <div className="uf-panelHint">커버가 있으면 리스트/뷰가 훨씬 고급스러워져요 ✨</div>
                  )}
                </div>

                {/* Save */}
                <div className="uf-stack" style={{ marginTop: 12 }}>
                  <button className="uf-btn" onClick={() => onSave("draft")}>📝 Save Draft</button>
                  <button className="uf-btn uf-btn--primary" onClick={() => onSave("published")}>🚀 Publish</button>
                </div>

                <div className="uf-panelHint">
                  ✅ 팁: “Scene”으로 나누면 뷰에서 리빌/연출이 자동으로 붙어요.
                </div>
              </aside>

              {/* Right panel (editor) */}
              <section className="uf-card uf-editorBox">
                {/* ✅ 아주 기본 툴(텍스트 강조)만 유지: 너무 복잡해지면 글쓰기 피로도가 올라가서
                    다음 라운드에서 "툴바 친절 UI"로 확장하는 게 좋아요. */}
                <div className="uf-row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  <button className="uf-btn" onClick={() => editor.chain().focus().toggleBold().run()}>B</button>
                  <button className="uf-btn" onClick={() => editor.chain().focus().toggleItalic().run()}>I</button>
                  <button className="uf-btn" onClick={() => editor.chain().focus().toggleUnderline().run()}>U</button>
                  <button className="uf-btn" onClick={() => editor.chain().focus().toggleHighlight().run()}>🖍</button>

                  <button className="uf-btn" onClick={() => editor.chain().focus().setTextAlign("left").run()}>⬅</button>
                  <button className="uf-btn" onClick={() => editor.chain().focus().setTextAlign("center").run()}>↔</button>
                  <button className="uf-btn" onClick={() => editor.chain().focus().setTextAlign("right").run()}>➡</button>

                  <button
                    className="uf-btn"
                    onClick={() => {
                      const prev = editor.getAttributes("link")?.href || "";
                      const url = window.prompt("링크 URL", prev || "https://");
                      if (url === null) return;
                      if (url.trim() === "") {
                        editor.chain().focus().unsetLink().run();
                        show("🔗 링크 제거!", 1400);
                        return;
                      }
                      editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
                      show("🔗 링크 설정!", 1400);
                    }}
                  >
                    🔗 Link
                  </button>

                  {/* ✅ 컬러(다양하게) */}
                  <div className="uf-colorRow">
                    {["#111111","#ef4444","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899","#ffffff"].map((c) => (
                      <button
                        key={c}
                        className="uf-colorDot"
                        style={{ background: c }}
                        onClick={() => editor.chain().focus().setColor(c).run()}
                        title={`color ${c}`}
                      />
                    ))}
                    <button className="uf-btn" onClick={() => editor.chain().focus().unsetColor().run()} title="unset color">
                      ✕
                    </button>
                  </div>
                </div>

                <EditorContent editor={editor} />
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
