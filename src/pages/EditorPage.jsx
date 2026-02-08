// src/pages/EditorPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

/* =============================================================================
  ✅ TipTap core
============================================================================= */
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

/* =============================================================================
  ✅ TipTap extensions (v3.19.0)
  - Table은 named export ({ Table })
  - TextStyle / Color도 named export ({ TextStyle }, { Color })
============================================================================= */
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";

import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";

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
  ✅ Admin emails (Firestore rules와 동일하게 유지)
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
  ✅ Toast (친근한 안내)
============================================================================= */
function useToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  function show(msg, ms = 2200) {
    setToast(msg);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setToast(null), ms);
  }

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

  return Array.from(new Set(raw)).slice(0, 20);
}

/* =============================================================================
  ✅ TextStyle 확장: fontSize 지원
  - TipTap에는 기본 FontSize extension이 없어서
    textStyle mark에 fontSize attribute를 추가해 구현합니다.
============================================================================= */
const TextStyleWithFontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (el) => el.style.fontSize || null,
        renderHTML: (attrs) => {
          if (!attrs.fontSize) return {};
          return { style: `font-size:${attrs.fontSize}` };
        },
      },
    };
  },
});

/* =============================================================================
  ✅ "이미지 선택 여부" (컨텍스트 툴바 전환용)
============================================================================= */
function isImageSelected(editor) {
  const sel = editor?.state?.selection;
  return !!sel?.node && sel.node.type?.name === "image";
}

/* =============================================================================
  ✅ 이미지 style 조작 helper (width %, align)
  - Image extension이 width/align attr을 표준으로 제공하지 않아서
    style 문자열에 width/margin 규칙을 넣는 방식이 가장 안전합니다.
============================================================================= */
function setSelectedImageWidth(editor, percent) {
  const sel = editor?.state?.selection;
  if (!sel?.node || sel.node.type.name !== "image") return false;

  const prevStyle = sel.node.attrs?.style || "";
  const cleaned = prevStyle.replace(/width\s*:\s*[^;]+;?/gi, "").trim();
  const nextStyle = `${cleaned ? cleaned + " " : ""}width:${percent}%;`.trim();

  editor.chain().focus().updateAttributes("image", { style: nextStyle }).run();
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

  const nextStyle = `${cleaned ? cleaned + " " : ""}${rule}`.trim();
  editor.chain().focus().updateAttributes("image", { style: nextStyle }).run();
  return true;
}

/* =============================================================================
  ✅ 2/3단 삽입 (HTML 방식: 안정성 최상)
============================================================================= */
function buildColumnsHTML(n) {
  if (n === 2) {
    return `
<div class="uf-cols uf-cols-2">
  <div class="uf-col"><p>Column 1</p></div>
  <div class="uf-col"><p>Column 2</p></div>
</div>
<p></p>`;
  }
  return `
<div class="uf-cols uf-cols-3">
  <div class="uf-col"><p>Column 1</p></div>
  <div class="uf-col"><p>Column 2</p></div>
  <div class="uf-col"><p>Column 3</p></div>
</div>
<p></p>`;
}

export default function EditorPage({ theme, toggleTheme }) {
  const nav = useNavigate();
  const { id } = useParams(); // /write or /write/:id
  const idNum = useMemo(() => (id ? Number(id) : null), [id]);

  const { toast, show } = useToast();

  /* =============================================================================
    ✅ 관리자 로그인 상태
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
      nav("/");
    } catch (e) {
      console.error(e);
      show("😵 로그아웃 실패", 2000);
    }
  }

  /* =============================================================================
    ✅ TipTap extensions
    - ⭐ Duplicate 경고( link / underline )를 원천 차단:
      StarterKit 안에 혹시 포함돼 있을 수 있는 extension을 disable 하고,
      우리가 원하는 걸 “단 1번만” 추가합니다.
============================================================================= */
  const extensions = useMemo(() => {
    return [
      StarterKit.configure({
        // 혹시 StarterKit 내부에 포함된 경우 대비 (v3에서 구성 달라져도 안전)
        link: false,
        underline: false,
      }),

      // ✅ text style (font-size 포함)
      TextStyleWithFontSize,
      Color.configure({ types: ["textStyle"] }),

      // ✅ text
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),

      // ✅ link
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),

      // ✅ image
      Image.configure({ inline: false, allowBase64: false }),

      // ✅ table
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,

      // ✅ youtube
      Youtube.configure({ controls: true, nocookie: true }),

      // ✅ placeholder
      Placeholder.configure({ placeholder: "Write something… ✍️" }),
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
    ✅ 컨텍스트 툴바(이미지 선택 시 이미지툴 / 텍스트는 텍스트툴)
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
    ✅ 글 로드 (adminOk + editor 준비 후)
  ============================================================================= */
  useEffect(() => {
    if (!editor) return;
    if (!adminOk) return;

    let alive = true;

    (async () => {
      try {
        setLoading(true);

        // (1) 수정 모드
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
        // (2) 새 글 모드
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

        // (3) draft 목록
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
  }, [editor, adminOk, idNum, nav]); // show는 hook이라 deps에 넣지 않아도 안전 (함수 identity 안정)

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
    ✅ 링크/유튜브/테이블/컬럼 삽입 helpers
  ============================================================================= */
  function setLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link")?.href || "";
    const url = window.prompt("🔗 링크 URL을 입력하세요", prev || "https://");
    if (url === null) return;

    if (url.trim() === "") {
      editor.chain().focus().unsetLink().run();
      show("🔗 링크를 제거했어요.", 1400);
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
    show("🔗 링크를 설정했어요!", 1400);
  }

  function insertYouTube() {
    if (!editor) return;
    const url = window.prompt("▶️ YouTube URL을 넣어주세요", "https://www.youtube.com/watch?v=");
    if (!url) return;
    editor.chain().focus().setYoutubeVideo({ src: url, width: 720, height: 405 }).run();
    show("▶️ 유튜브를 삽입했어요!", 1600);
  }

  function insertTable() {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    show("📋 테이블을 넣었어요!", 1600);
  }

  function insertColumns(n) {
    if (!editor) return;
    editor.chain().focus().insertContent(buildColumnsHTML(n)).run();
    show(`📚 ${n}단 레이아웃을 넣었어요!`, 1600);
  }

  function deleteSelectedImage() {
    if (!editor) return;
    if (!isImageSelected(editor)) {
      show("🖼️ 이미지를 클릭해서 선택해주세요!", 1600);
      return;
    }
    editor.chain().focus().deleteSelection().run();
    show("🗑️ 이미지를 삭제했어요.", 1400);
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

        // ✅ 수정일 땐 createdAt 유지 (없으면 createArticle에서 serverTimestamp 처리)
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
    ✅ Auth Gate UI (훅은 이미 다 호출된 이후라 Hook 순서 문제 없음)
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
            <div className="uf-brand" onClick={() => nav("/")}>U#</div>

            <div className="uf-nav">
              <button className="uf-btn uf-btn--ghost" type="button" onClick={() => nav("/")}>Archive</button>

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

      {/* Toolbar (sticky) */}
      <div className="uf-toolbar">
        <div className="uf-wrap">
          <div className="uf-toolbar__inner">
            {/* =========================================================================
              ✅ 컨텍스트 툴바
              - 이미지 선택 시: 이미지 도구
              - 그 외: 텍스트 도구
            ========================================================================= */}
            {!imageMode ? (
              <>
                {/* ---------------- Text tools ---------------- */}
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().toggleBold().run()}>B</button>
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().toggleItalic().run()}>I</button>
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().toggleUnderline().run()}>U</button>
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().toggleHighlight().run()}>🖍</button>

                {/* ✅ Font size */}
                <select
                  className="uf-select"
                  style={{ width: 140 }}
                  defaultValue=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    editor?.chain().focus().setMark("textStyle", { fontSize: v }).run();
                    e.target.value = "";
                  }}
                  title="Font size"
                >
                  <option value="">Font Size</option>
                  {["12px","14px","16px","18px","20px","24px","28px","32px"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                {/* ✅ Color chips */}
                <div className="uf-row" style={{ gap: 6 }}>
                  {["#111111","#ef4444","#f59e0b","#10b981","#3b82f6","#8b5cf6"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="uf-btn"
                      style={{ width: 38, justifyContent: "center", padding: 0 }}
                      onClick={() => editor?.chain().focus().setColor(c).run()}
                      title={`Color ${c}`}
                    >
                      <span style={{ width: 14, height: 14, borderRadius: 999, background: c, display: "block" }} />
                    </button>
                  ))}
                  <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().unsetColor().run()} title="Unset color">
                    ✕
                  </button>
                </div>

                {/* Align */}
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().setTextAlign("left").run()}>⬅</button>
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().setTextAlign("center").run()}>↔</button>
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().setTextAlign("right").run()}>➡</button>

                {/* Lists */}
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()}>• List</button>
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1. List</button>

                {/* Quote / Divider */}
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()}>❝ Quote</button>
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>— Divider</button>

                {/* Link */}
                <button className="uf-btn" type="button" onClick={setLink}>🔗 Link</button>

                {/* Image upload */}
                <label className="uf-btn" style={{ cursor: "pointer" }}>
                  🖼 Upload
                  <input type="file" accept="image/*" onChange={onBodyImageInput} style={{ display: "none" }} />
                </label>

                {/* Table / YouTube */}
                <button className="uf-btn" type="button" onClick={insertTable}>📋 Table</button>
                <button className="uf-btn" type="button" onClick={insertYouTube}>▶️ YouTube</button>

                {/* Columns */}
                <button className="uf-btn" type="button" onClick={() => insertColumns(2)}>2 Col</button>
                <button className="uf-btn" type="button" onClick={() => insertColumns(3)}>3 Col</button>

                {/* Undo/Redo */}
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().undo().run()}>↶</button>
                <button className="uf-btn" type="button" onClick={() => editor?.chain().focus().redo().run()}>↷</button>
              </>
            ) : (
              <>
                {/* ---------------- Image tools ---------------- */}
                <button className="uf-btn" type="button" onClick={() => setSelectedImageWidth(editor, 100)}>Img 100</button>
                <button className="uf-btn" type="button" onClick={() => setSelectedImageWidth(editor, 50)}>Img 50</button>
                <button className="uf-btn" type="button" onClick={() => setSelectedImageWidth(editor, 25)}>Img 25</button>

                <button className="uf-btn" type="button" onClick={() => setSelectedImageAlign(editor, "left")}>Left</button>
                <button className="uf-btn" type="button" onClick={() => setSelectedImageAlign(editor, "center")}>Center</button>
                <button className="uf-btn" type="button" onClick={() => setSelectedImageAlign(editor, "right")}>Right</button>

                <button className="uf-btn" type="button" onClick={deleteSelectedImage}>🗑 Delete</button>

                {/* ✅ 텍스트툴로 돌아가기 (요청사항) */}
                <button className="uf-btn" type="button" onClick={() => setImageMode(false)}>← Back</button>
              </>
            )}
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
                        <button
                          key={d.id}
                          type="button"
                          className="uf-btn uf-btn--ghost"
                          onClick={() => openDraft(d)}
                        >
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
                        type="button"
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
                  <button type="button" className="uf-btn" onClick={() => onSave("draft")}>📝 Save Draft</button>
                  <button type="button" className="uf-btn uf-btn--primary" onClick={() => onSave("published")}>🚀 Publish</button>
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
