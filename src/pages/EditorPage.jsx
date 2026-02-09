// src/pages/EditorPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

/* =============================================================================
  ✅ TipTap core
============================================================================= */
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

/* =============================================================================
  ✅ TipTap extensions (프로젝트에서 안정적으로 쓰던 세트)
  - ⚠️ "Duplicate extension names(link/underline)" 경고는
    같은 extension을 2번 넣을 때 발생해요.
    아래는 한 번만 구성되게 "extensions"를 useMemo로 고정.
============================================================================= */
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";

/* ✅ 텍스트 스타일(색/크기) */
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";

/* ✅ Firebase Auth (관리자 가드) */
import { auth, googleProvider } from "../firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

/* ✅ Services */
import {
  getNextArticleId,
  // ⚠️ 편집 화면은 관리자이므로 published만이 아니라 "id"로 가져오는 함수가 필요할 수 있어요.
  // 지금 프로젝트 상태에 따라 getArticleByIdNumber가 published만 가져오게 되어있으면
  // 편집 시 draft 글은 못 불러옵니다. (원하면 admin용 조회 함수로 분리해줄게요.)
  getArticleByIdNumber,
  createArticle,
  updateArticle,
  listDraftArticles,
} from "../services/articles";

import { uploadImage } from "../services/upload";

/* =============================================================================
  ✅ Admin emails (Firestore rules와 동일)
============================================================================= */
const ADMIN_EMAILS = new Set([
  "gallerykuns@gmail.com",
  "cybog2004@gmail.com",
  "sylove887@gmail.com",
]);

/* =============================================================================
  ✅ 카테고리
============================================================================= */
const CATEGORY_OPTIONS = ["Exhibition", "Project", "Artist Note", "News"];

/* =============================================================================
  ✅ Toast (친근 안내)
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
  ✅ tagsText -> tags[]
============================================================================= */
function parseTags(text) {
  const raw = (text || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(raw)).slice(0, 30);
}

/* =============================================================================
  ✅ FontSize (TextStyle 기반 커스텀)
  - TipTap 기본 extension에 폰트사이즈가 없어서 이렇게 구현합니다.
  - 사용법: editor.chain().setMark("textStyle", { fontSize: "18px" })
============================================================================= */
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

/* =============================================================================
  ✅ "이미지 선택됨?" 체크
  - 이미지 클릭(노드 선택) 상태면 이미지 전용 툴바를 보여주기 위함
============================================================================= */
function isImageSelected(editor) {
  const sel = editor?.state?.selection;
  return !!sel?.node && sel.node.type?.name === "image";
}

/* =============================================================================
  ✅ 이미지 크기/정렬 helpers
  - TipTap Image attrs에 "style"을 넣는 방식이 가장 호환이 좋아요.
============================================================================= */
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

/* =============================================================================
  ✅ Scene/Sticky/Reveal 블록 템플릿 (HTML 삽입)
  - "씬(Scene)"은 구분선/테두리로 눈에 띄게
  - Reveal은 ViewPage에서 .uf-reveal을 IntersectionObserver로 처리 (이미 구현해둔 구조)
  - Sticky는 ViewPage에서 추후 sticky/parallax 확장에 쓰는 “초석”
============================================================================= */
function sceneTemplate({ title = "Scene Title", note = "여기에 내용을 넣어주세요.", variant = "reveal" }) {
  const v = variant; // "reveal" | "sticky"
  return `
<section class="uf-scene uf-reveal">
  <div class="uf-scene__header">
    <div class="uf-scene__badge">SCENE</div>
    <div class="uf-scene__title">${title}</div>
  </div>
  <div class="uf-scene__body">
    <p>${note}</p>
    <p><br/></p>
  </div>
</section>
<p></p>
`.trim();
}

function stickyTemplate() {
  return `
<section class="uf-scene uf-sticky">
  <div class="uf-scene__header">
    <div class="uf-scene__badge">STICKY</div>
    <div class="uf-scene__title">Sticky Image / Sticky Block</div>
  </div>

  <div class="uf-stickyGrid">
    <div class="uf-stickyMedia">
      <p><b>✅ 여기에 이미지를 넣어주세요</b></p>
      <p style="opacity:.75">팁: 아래 툴바에서 Upload Image로 이미지 삽입 → 이 영역에 배치</p>
      <p><br/></p>
    </div>

    <div class="uf-stickyText">
      <p><b>✅ 스크롤 텍스트 영역</b></p>
      <p>여기에 스크롤에 따라 바뀌는 설명/문장을 써요.</p>
      <p><br/></p>
    </div>
  </div>
</section>
<p></p>
`.trim();
}

/* =============================================================================
  ✅ “미디엄/숏핸드 감성” 템플릿
  - 버튼 한 번으로 글 구조를 쭉 깔아주기
============================================================================= */
function mediumTemplateHTML() {
  return `
<h2 class="uf-reveal">Intro</h2>
<p class="uf-reveal">짧고 강한 첫 문장으로 시작해요. (독자가 ‘아 읽어볼만한데?’ 느끼게)</p>
<p></p>

${sceneTemplate({
  title: "Chapter 1 — Context",
  note: "배경/맥락을 자연스럽게 풀어주세요. 이미지/인용/하이라이트를 섞으면 좋아요.",
  variant: "reveal",
})}

<blockquote class="uf-reveal">
  좋은 글은 “정보”와 “감정”이 같이 움직여요.
</blockquote>
<p></p>

${sceneTemplate({
  title: "Chapter 2 — Detail",
  note: "디테일을 쌓아가며 독자가 장면을 떠올리게 해요.",
  variant: "reveal",
})}

${stickyTemplate()}

<h2 class="uf-reveal">Closing</h2>
<p class="uf-reveal">마지막은 한 문장으로 정리해도 좋아요. (여운!)</p>
<p></p>
`.trim();
}

/* =============================================================================
  ✅ 에디터에 “무조건 안전한” 링크 설정 helper
============================================================================= */
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

export default function EditorPage({ theme, toggleTheme }) {
  const nav = useNavigate();
  const { id } = useParams(); // /write or /write/:id
  const idNum = useMemo(() => (id ? Number(id) : null), [id]);

  const { toast, show } = useToast();

  /* =============================================================================
    ✅ 가이드 패널 토글 (B 방식)
    - 기본 false(숨김), 우측 상단 ? 버튼으로 열기
  ============================================================================= */
  const [helpOpen, setHelpOpen] = useState(false);

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
    ✅ TipTap extensions (여기서 1번만 정의!)
  ============================================================================= */
  const extensions = useMemo(() => {
    return [
      StarterKit,

      // 텍스트 스타일(색/사이즈)
      TextStyle,
      FontSize,
      Color.configure({ types: ["textStyle"] }),

      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),

      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),

      Image.configure({ inline: false, allowBase64: false }),

      Placeholder.configure({
        placeholder:
          "Write something… ✍️\n\nTip) ‘?’ 버튼을 누르면 Scene/Sticky/Reveal 사용법이 보여요.",
      }),
    ];
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
    cover: "",
    coverThumb: "",
    coverMedium: "",
    status: "published",
    createdAt: null,
  });

  /* =============================================================================
    ✅ 컨텍스트 툴바 (이미지 선택 시 이미지 툴)
  ============================================================================= */
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

        // 수정 모드 (/write/:id)
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
        // 새 글 모드 (/write)
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

        // draft 리스트
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
    ✅ 업로드: 커버
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
    ✅ 업로드: 본문 이미지
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
    ✅ 템플릿 삽입
============================================================================= */
  function insertMediumTemplate() {
    if (!editor) return;
    editor.chain().focus().setContent(mediumTemplateHTML()).run();
    show("📄 미디엄/숏핸드 템플릿을 넣었어요!", 1800);
    setHelpOpen(true); // 템플릿 넣었으면 가이드도 같이 열어주면 친절
  }

  function insertScene() {
    if (!editor) return;
    editor.chain().focus().insertContent(sceneTemplate({})).run();
    show("🎬 Scene 블록을 추가했어요!", 1600);
  }

  function insertSticky() {
    if (!editor) return;
    editor.chain().focus().insertContent(stickyTemplate()).run();
    show("📌 Sticky 블록을 추가했어요!", 1600);
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
        const newId = await createArticle(payload);
        if (newId) setFirebaseId(newId);

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
    ✅ Auth gate (Hook 순서 깨지지 않게: return은 맨 아래에서만!)
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
          <div className="uf-card uf-panel">
            <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>🔐 Admin Only</div>
            <div style={{ color: "var(--muted)", marginBottom: 16 }}>
              이 페이지는 관리자만 접근할 수 있어요.
            </div>

            <div className="uf-row" style={{ gap: 10, flexWrap: "wrap" }}>
              <button className="uf-btn uf-btn--primary" type="button" onClick={adminLogin}>
                Google로 로그인
              </button>
              <button className="uf-btn" type="button" onClick={() => nav("/")}>
                ← 리스트로 돌아가기
              </button>
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
            <button className="uf-brand" type="button" onClick={() => nav("/")}>U#</button>

            <div className="uf-nav">
              <button className="uf-btn uf-btn--ghost" type="button" onClick={() => nav("/")}>
                Archive
              </button>

              {/* ✅ 가이드 토글 (B 방식) */}
              <button
                className="uf-btn uf-btn--ghost"
                type="button"
                onClick={() => setHelpOpen((v) => !v)}
                title="Guide"
              >
                {helpOpen ? "✕" : "?"} Guide
              </button>

              <button className="uf-btn" type="button" onClick={toggleTheme}>
                {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
              </button>

              <button className="uf-btn uf-btn--ghost" type="button" onClick={adminLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* =============================================================================
        ✅ Toolbar (sticky)
        - 이미지 선택 시: 이미지 툴
        - 일반 텍스트: 텍스트 툴
      ============================================================================= */}
      <div className="uf-toolbar">
        <div className="uf-wrap">
          <div className="uf-toolbar__inner">
            {!imageMode ? (
              <>
                {/* 텍스트 */}
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().toggleBold().run()} title="Bold">
                  <b>B</b>
                </button>
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} title="Italic">
                  <i>I</i>
                </button>
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().toggleUnderline().run()} title="Underline">
                  <u>U</u>
                </button>
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().toggleHighlight().run()} title="Highlight">
                  🖍
                </button>

                {/* 색상 */}
                <div className="uf-colorRow" title="Text Color">
                  {["#111111", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"].map((c) => (
                    <button
                      key={c}
                      className="uf-colorDot"
                      type="button"
                      onClick={() => editor?.chain().focus().setColor(c).run()}
                      style={{ background: c }}
                      title={c}
                    />
                  ))}
                  <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().unsetColor().run()} title="Unset color">
                    ✕
                  </button>
                </div>

                {/* 폰트 사이즈 */}
                <select
                  className="uf-select uf-select--mini"
                  defaultValue=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    editor?.chain().focus().setFontSize(v).run();
                    e.target.value = "";
                    show(`🔠 폰트 크기: ${v}`, 1400);
                  }}
                  title="Font size"
                >
                  <option value="">Size</option>
                  {["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().setTextAlign("left").run()} title="Align left">
                  ⬅
                </button>
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().setTextAlign("center").run()} title="Align center">
                  ↔
                </button>
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().setTextAlign("right").run()} title="Align right">
                  ➡
                </button>

                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Bullet list">
                  • List
                </button>
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="Ordered list">
                  1. List
                </button>

                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()} title="Quote">
                  ❝ Quote
                </button>
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Divider">
                  — Divider
                </button>

                <button className="uf-btn" type="button" onClick={() => promptAndSetLink(editor, show)} title="Link">
                  🔗 Link
                </button>

                {/* 업로드 */}
                <label className="uf-btn" style={{ cursor: "pointer" }} title="Upload Image">
                  🖼 Upload
                  <input type="file" accept="image/*" onChange={onBodyImageInput} style={{ display: "none" }} />
                </label>

                {/* 씬/스티키/템플릿 */}
                <button className="uf-btn" type="button" onClick={insertScene} title="Add Scene">
                  🎬 Scene
                </button>
                <button className="uf-btn" type="button" onClick={insertSticky} title="Add Sticky Block">
                  📌 Sticky
                </button>
                <button className="uf-btn uf-btn--primary" type="button" onClick={insertMediumTemplate} title="Insert Medium template">
                  ✨ Template
                </button>

                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().undo().run()} title="Undo">
                  ↶
                </button>
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().redo().run()} title="Redo">
                  ↷
                </button>
              </>
            ) : (
              <>
                {/* 이미지 모드 */}
                <button className="uf-btn" type="button" onClick={() => setSelectedImageWidth(editor, 100)} title="Image width 100%">
                  100%
                </button>
                <button className="uf-btn" type="button" onClick={() => setSelectedImageWidth(editor, 50)} title="Image width 50%">
                  50%
                </button>
                <button className="uf-btn" type="button" onClick={() => setSelectedImageWidth(editor, 25)} title="Image width 25%">
                  25%
                </button>

                <button className="uf-btn" type="button" onClick={() => setSelectedImageAlign(editor, "left")} title="Align left">
                  ⬅
                </button>
                <button className="uf-btn" type="button" onClick={() => setSelectedImageAlign(editor, "center")} title="Align center">
                  ↔
                </button>
                <button className="uf-btn" type="button" onClick={() => setSelectedImageAlign(editor, "right")} title="Align right">
                  ➡
                </button>

                <button
                  className="uf-btn"
                  type="button"
                  onClick={() => {
                    editor?.chain().focus().deleteSelection().run();
                    show("🗑️ 이미지를 삭제했어요.", 1400);
                  }}
                  title="Delete image"
                >
                  🗑 Delete
                </button>

                <button className="uf-btn uf-btn--ghost" type="button" onClick={() => setImageMode(false)} title="Back to text toolbar">
                  ← Back
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* =============================================================================
        ✅ Help Panel (B 방식: 토글)
      ============================================================================= */}
      {helpOpen && (
        <div className="uf-helpWrap">
          <div className="uf-wrap">
            <div className="uf-card uf-help">
              <div className="uf-help__top">
                <div className="uf-help__title">📖 Editor Guide</div>
                <button className="uf-btn uf-btn--ghost" type="button" onClick={() => setHelpOpen(false)}>
                  ✕
                </button>
              </div>

              <div className="uf-help__grid">
                <div className="uf-help__item">
                  <div className="uf-help__kicker">1) 기본 흐름</div>
                  <div className="uf-help__text">
                    <b>Template</b> 버튼으로 글 구조를 한 번에 깔고,<br />
                    필요한 부분을 수정하면 “미디엄/숏핸드 느낌”이 빨리 잡혀요.
                  </div>
                </div>

                <div className="uf-help__item">
                  <div className="uf-help__kicker">2) Scene</div>
                  <div className="uf-help__text">
                    <b>Scene</b>은 한 덩어리 “장면”이에요. (테두리로 구분됨)<br />
                    ViewPage에서 Scene은 <b>Reveal</b> 효과(등장 애니메이션)가 적용돼요.
                  </div>
                </div>

                <div className="uf-help__item">
                  <div className="uf-help__kicker">3) Sticky</div>
                  <div className="uf-help__text">
                    <b>Sticky</b>는 “이미지/텍스트가 스크롤에 반응”하는 기반이에요.<br />
                    지금은 테두리/레이아웃이 보이게 해두고,
                    다음 단계에서 실제 sticky/parallax를 강하게 붙여요.
                  </div>
                </div>

                <div className="uf-help__item">
                  <div className="uf-help__kicker">4) 이미지 툴바</div>
                  <div className="uf-help__text">
                    이미지를 <b>클릭</b>하면 이미지 전용 툴바로 바뀌고,<br />
                    100/50/25% 크기 + 정렬을 바로 바꿀 수 있어요.
                  </div>
                </div>
              </div>

              <div className="uf-help__bottom">
                <div style={{ color: "var(--muted)", fontSize: 12 }}>
                  💡 Tip: Scene/Sticky는 에디터에서 테두리로 보이고, ViewPage에서는 Reveal/Parallax로 더 “감성”이 살아나요.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================================
        ✅ Main
      ============================================================================= */}
      <div className="uf-editorShell">
        <div className="uf-wrap">
          {loading || !editor ? (
            <div style={{ padding: "30px 0" }}>로딩 중… ⏳</div>
          ) : (
            <div className="uf-editorGrid">
              {/* Left panel (meta) */}
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
                        type="button"
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
                  <button className="uf-btn" type="button" onClick={() => onSave("draft")}>📝 Save Draft</button>
                  <button className="uf-btn uf-btn--primary" type="button" onClick={() => onSave("published")}>🚀 Publish</button>
                </div>

                <div className="uf-panelHint">
                  ✅ 본문에는 이미지 드래그&드롭도 가능해요.
                  <br />
                  ✅ “?” Guide를 켜면 Scene/Sticky 사용법이 보여요.
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
