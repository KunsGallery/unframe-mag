// src/pages/EditorPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/* ============================================================================
  ✅ TipTap core
============================================================================ */
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

/* ============================================================================
  ✅ TipTap extensions (v3.19.0 기준)
  - ⚠️ TextStyle/Color는 named export
============================================================================ */
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

/* ✅ 커스텀 확장(캡션/사운드클라우드) */
import { Figure, Figcaption } from "../tiptap/FigureCaption";
import { SoundCloud } from "../tiptap/SoundCloud";

/* ============================================================================
  ✅ Firebase Auth (관리자 가드)
============================================================================ */
import { auth, googleProvider } from "../firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

/* ============================================================================
  ✅ Services
============================================================================ */
import {
  getNextArticleId,
  getArticleByIdNumber,
  createArticle,
  updateArticle,
  listDraftArticles,
} from "../services/articles";
import { uploadImage } from "../services/upload";

/* ============================================================================
  ✅ Router
============================================================================ */
import { getParam, go } from "../utils/router";

/* ============================================================================
  ✅ 관리자 이메일 (Firestore rules와 동일)
============================================================================ */
const ADMIN_EMAILS = new Set([
  "gallerykuns@gmail.com",
  "cybog2004@gmail.com",
  "sylove887@gmail.com",
]);

/* ============================================================================
  ✅ 카테고리 옵션
============================================================================ */
const CATEGORY_OPTIONS = ["Exhibition", "Project", "Artist Note", "News"];

/* ============================================================================
  ✅ 토스트 (친근한 안내)
============================================================================ */
function useToast() {
  const [toast, setToast] = useState(null);
  const tRef = useRef(null);
  function show(message, ms = 2400) {
    setToast(message);
    window.clearTimeout(tRef.current);
    tRef.current = window.setTimeout(() => setToast(null), ms);
  }
  return { toast, show };
}

/* ============================================================================
  ✅ tagsText -> tags array
============================================================================ */
function parseTags(text) {
  const raw = (text || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(raw)).slice(0, 20);
}

/* ============================================================================
  ✅ 중복 extension 제거 (link/underline 경고 예방)
============================================================================ */
function dedupeExtensions(exts) {
  const map = new Map();
  for (const e of exts.filter(Boolean)) map.set(e.name, e);
  return Array.from(map.values());
}

/* ============================================================================
  ✅ FontSize (TextStyle 기반 커스텀)
  - 폰트 사이즈는 기본 extension이 없어서 TextStyle 확장으로 구현합니다.
============================================================================ */
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

/* ============================================================================
  ✅ "이미지 선택 여부" 판단
  - selection.node가 image면 이미지 모드로 간주
============================================================================ */
function isImageNodeSelected(editor) {
  const sel = editor?.state?.selection;
  return !!sel?.node && sel.node.type?.name === "image";
}

/* ============================================================================
  ✅ 커서가 Figure 내부인지 판단
============================================================================ */
function isInsideFigure(editor) {
  const { $from } = editor.state.selection;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === "figure") return true;
  }
  return false;
}

/* ============================================================================
  ✅ 이미지 스타일(width/align) 적용 helpers
  - TipTap Image는 width attribute가 %를 안정적으로 반영하지 않아서
    "style" 속성으로 width를 넣는 방식이 가장 안전합니다.
============================================================================ */
function setSelectedImageWidth(editor, percent) {
  const sel = editor.state.selection;
  if (!sel?.node || sel.node.type.name !== "image") return false;

  // 기존 style에서 width만 교체
  const prevStyle = sel.node.attrs?.style || "";
  const nextStyle = prevStyle
    .replace(/width\s*:\s*[^;]+;?/gi, "")
    .trim();

  const widthStyle = `width:${percent}%;`;
  const merged = `${nextStyle ? nextStyle + " " : ""}${widthStyle}`.trim();

  editor.chain().focus().updateAttributes("image", { style: merged }).run();
  return true;
}

function setSelectedImageAlign(editor, align) {
  // align: left | center | right
  // 이미지 단독이면 margin으로 정렬(figure면 figure align로 처리)
  const sel = editor.state.selection;
  if (!sel?.node || sel.node.type.name !== "image") return false;

  // figure 내부면 figure align을 바꾸는 게 맞음
  if (isInsideFigure(editor)) {
    editor.chain().focus().setFigureAlign(align).run();
    return true;
  }

  // 이미지 단독일 때 margin으로 정렬
  const prevStyle = sel.node.attrs?.style || "";
  let cleaned = prevStyle
    .replace(/margin-left\s*:\s*[^;]+;?/gi, "")
    .replace(/margin-right\s*:\s*[^;]+;?/gi, "")
    .replace(/display\s*:\s*[^;]+;?/gi, "")
    .trim();

  let marginRule = "";
  if (align === "left") marginRule = "display:block;margin-left:0;margin-right:auto;";
  if (align === "center") marginRule = "display:block;margin-left:auto;margin-right:auto;";
  if (align === "right") marginRule = "display:block;margin-left:auto;margin-right:0;";

  const merged = `${cleaned ? cleaned + " " : ""}${marginRule}`.trim();
  editor.chain().focus().updateAttributes("image", { style: merged }).run();
  return true;
}

export default function EditorPage({ theme, toggleTheme }) {
  const { toast, show } = useToast();

  /* ============================================================================
    ✅ URL: ?mode=editor&id=123
  ============================================================================ */
  const idFromUrl = getParam("id");
  const idNum = idFromUrl ? Number(idFromUrl) : null;

  /* ============================================================================
    ✅ 관리자 가드
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
        show("✅ 관리자 로그인 완료! 환영해요 ✨", 2200);
      }
    } catch (e) {
      console.error(e);
      show("😵 로그인에 실패했어요. 다시 시도해볼까요?", 2600);
    }
  }

  async function adminLogout() {
    try {
      await signOut(auth);
      show("👋 로그아웃 완료! 다음에 또 만나요.", 2200);
    } catch (e) {
      console.error(e);
      show("😵 로그아웃이 실패했어요.", 2400);
    }
  }

  /* ============================================================================
    ✅ Extensions (한 곳에서만 정의 → 중복 경고 방지)
  ============================================================================ */
  const extensions = useMemo(() => {
    const exts = [
      StarterKit,

      // ✅ 텍스트 스타일
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

      // ✅ 이미지
      Image.configure({ inline: false, allowBase64: false }),

      // ✅ 캡션(figure/figcaption)
      Figure,
      Figcaption,

      // ✅ Table
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,

      // ✅ YouTube
      Youtube.configure({ inline: false, controls: true, nocookie: true }),

      // ✅ SoundCloud
      SoundCloud,

      Placeholder.configure({ placeholder: "Write something… ✍️" }),
    ];

    return dedupeExtensions(exts);
  }, []);

  const editor = useEditor({
    extensions,
    content: "",
  });

  /* ============================================================================
    ✅ 폼 상태
  ============================================================================ */
  const [firebaseId, setFirebaseId] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const [drafts, setDrafts] = useState([]);

  /* ============================================================================
    ✅ 컨텍스트 툴바 상태
    - 이미지 선택중이면 imageMode=true → 이미지 툴바
    - 아니면 텍스트 툴바
  ============================================================================ */
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

  /* ============================================================================
    ✅ 관리자 가드 UI (무한 로딩 방지: auth 체크 먼저!)
  ============================================================================ */
  if (checkingAuth) {
    return (
      <div className="uf-container" style={{ padding: "120px 16px" }}>
        확인 중… ⏳
      </div>
    );
  }

  if (!adminOk) {
    return (
      <div className="uf-container" style={{ padding: "120px 16px" }}>
        {toast && <div className="uf-toast">{toast}</div>}

        <h2 style={{ fontSize: 28, marginBottom: 10 }}>🔐 Admin Only</h2>
        <p style={{ marginBottom: 16, color: "rgba(0,0,0,.65)" }}>
          이 페이지는 관리자만 접근할 수 있어요.
        </p>

        <button className="uf-btn uf-btn--primary" onClick={adminLogin}>
          Google로 로그인
        </button>

        <div style={{ marginTop: 12 }}>
          <button className="uf-btn uf-btn--ghost" onClick={() => go("?mode=list")}>
            ← 리스트로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  /* ============================================================================
    ✅ 글 로드 (editor 준비된 후)
  ============================================================================ */
  useEffect(() => {
    if (!editor) return;
    let alive = true;

    (async () => {
      try {
        setLoading(true);

        if (idNum) {
          const a = await getArticleByIdNumber(idNum);
          if (!alive) return;

          if (!a) {
            show("😮 글을 찾지 못했어요. 리스트로 돌아갈게요.", 2600);
            go("?mode=list");
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
  }, [editor, idNum]);

  /* ============================================================================
    ✅ 업로드: 커버
  ============================================================================ */
  async function onPickCover(file) {
    if (!file) return;
    try {
      show("🖼️ 커버 업로드 중…", 1600);
      const res = await uploadImage(file);
      setForm((p) => ({
        ...p,
        cover: res.url || "",
        coverThumb: res.thumbUrl || p.coverThumb || "",
        coverMedium: res.mediumUrl || p.coverMedium || "",
      }));
      show("✅ 커버 업로드 완료!", 1600);
    } catch (e) {
      console.error(e);
      show("😵 커버 업로드 실패! (용량/네트워크 확인)", 2600);
    }
  }

  function onCoverInput(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onPickCover(f);
  }

  /* ============================================================================
    ✅ 업로드: 본문 이미지
  ============================================================================ */
  async function onPickBodyImage(file) {
    if (!file || !editor) return;
    try {
      show("🖼️ 본문 이미지 업로드 중…", 1600);
      const res = await uploadImage(file);
      if (!res?.url) throw new Error("no url");
      editor.chain().focus().setImage({ src: res.url }).run();
      show("✅ 이미지 삽입 완료!", 1400);
    } catch (e) {
      console.error(e);
      show("😵 본문 이미지 업로드 실패!", 2600);
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
    const el = document.querySelector(".uf-editor .ProseMirror");
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

  /* ============================================================================
    ✅ 저장(draft/published)
  ============================================================================ */
  async function onSave(statusType) {
    if (!editor) return;

    const id = Number(form.id);
    const title = form.title.trim();
    const excerpt = form.excerpt.trim();
    const tags = parseTags(form.tagsText);

    if (!id || Number.isNaN(id)) return show("😵 글 번호(id)가 이상해요.", 2200);
    if (!title) return show("✍️ 제목을 먼저 적어주세요!", 2200);

    try {
      const payload = {
        id,
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
        show(statusType === "draft" ? "📝 드래프트 저장 중…" : "🚀 발행 중…", 1600);
        const newFirebaseId = await createArticle(payload);
        if (newFirebaseId) setFirebaseId(newFirebaseId);

        show(statusType === "draft" ? "✅ 드래프트 저장 완료!" : "🎉 발행 완료! 뷰로 이동할게요.", 2200);
        if (statusType !== "draft") go(`?mode=view&id=${id}`);
      } else {
        if (!firebaseId) return show("😵 firebaseId가 없어요. 다시 열어주세요.", 2600);
        show("🛠️ 저장 중…", 1400);
        await updateArticle(firebaseId, payload);
        show("✅ 저장 완료!", 1600);
        if (statusType !== "draft") go(`?mode=view&id=${id}`);
      }
    } catch (e) {
      console.error(e);
      show("😵 저장 중 오류가 발생했어요.", 2600);
    }
  }

  function openDraft(d) {
    if (!d?.id) return;
    go(`?mode=editor&id=${d.id}`);
  }

  /* ============================================================================
    ✅ 텍스트 툴 helpers
  ============================================================================ */
  const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"];
  const COLORS = ["#111111", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];

  function setLink() {
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("링크 URL을 입력하세요", prev || "https://");
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
    const url = window.prompt("YouTube URL을 넣어주세요", "https://www.youtube.com/watch?v=");
    if (!url) return;
    editor.chain().focus().setYoutubeVideo({ src: url, width: 720, height: 405 }).run();
    show("▶️ 유튜브를 삽입했어요!", 1600);
  }

  function insertSoundCloud() {
    const url = window.prompt("SoundCloud URL을 넣어주세요", "https://soundcloud.com/");
    if (!url) return;
    editor.chain().focus().setSoundCloud({ src: url, height: 166 }).run();
    show("🔊 사운드클라우드를 삽입했어요!", 1600);
  }

  function insertTable() {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    show("📋 테이블을 넣었어요!", 1600);
  }

  /* ============================================================================
    ✅ 이미지 툴 helpers (크기/정렬/캡션/삭제)
  ============================================================================ */
  function addCaptionToSelectedImage() {
    if (!editor) return;

    // 이미지가 선택돼 있어야 wrapSelectionInFigure가 동작
    if (!isImageNodeSelected(editor)) {
      show("🖼️ 먼저 이미지를 클릭해서 선택해주세요!", 2000);
      return;
    }

    // 이미 figure 안이면 안내
    if (isInsideFigure(editor)) {
      show("✅ 이미 캡션이 있는 이미지예요!", 1800);
      return;
    }

    editor.chain().focus().wrapSelectionInFigure({ align: "center", text: "Caption…" }).run();
    show("✍️ 캡션을 추가했어요! 아래 텍스트를 수정해보세요.", 2200);
  }

  function removeCaptionOrUnwrapFigure() {
    if (!editor) return;

    // figure 내부면 unwrap
    if (isInsideFigure(editor)) {
      editor.chain().focus().unwrapFigure().run();
      show("🧹 캡션(figure)을 해제했어요.", 1800);
      return;
    }

    show("😮 캡션이 붙은 이미지가 아니에요.", 1800);
  }

  function deleteSelectedImage() {
    if (!isImageNodeSelected(editor)) {
      show("🖼️ 먼저 이미지를 클릭해서 선택해주세요!", 1800);
      return;
    }
    editor.chain().focus().deleteSelection().run();
    show("🗑️ 이미지를 삭제했어요.", 1600);
  }

  /* ============================================================================
    ✅ 로딩 UI
  ============================================================================ */
  if (loading || !editor) {
    return (
      <div className="uf-container" style={{ padding: "120px 16px" }}>
        {toast && <div className="uf-toast">{toast}</div>}
        로딩 중… ⏳
      </div>
    );
  }

  /* ============================================================================
    ✅ UI
  ============================================================================ */
  return (
    <div className="uf-container" style={{ padding: "24px 16px" }}>
      {toast && <div className="uf-toast">{toast}</div>}

      {/* ✅ 상단 바 */}
      <div className="uf-editorTop">
        <button className="uf-btn uf-btn--ghost" onClick={() => go("?mode=list")}>
          ← Back to list
        </button>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="uf-btn uf-btn--ghost" onClick={toggleTheme}>
            {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
          </button>

          <div style={{ fontSize: 13, opacity: 0.75 }}>{user?.email ? `👤 ${user.email}` : ""}</div>

          <button className="uf-btn uf-btn--ghost" onClick={adminLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* ✅ Draft 목록 */}
      {drafts.length > 0 && (
        <div className="uf-draftBox" style={{ marginTop: 14 }}>
          <div className="uf-draftBox__title">📝 Drafts</div>
          <div className="uf-draftBox__list">
            {drafts.slice(0, 10).map((d) => (
              <button key={d.id} className="uf-draftItem" onClick={() => openDraft(d)}>
                No.{d.id} — {d.title || "(no title)"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ✅ 메타 폼 */}
      <div className="uf-form" style={{ marginTop: 18 }}>
        <div className="uf-formRow">
          <label className="uf-label">ID</label>
          <input className="uf-input" value={form.id} disabled={!!idNum} onChange={(e) => setForm((p) => ({ ...p, id: e.target.value }))} />
        </div>

        <div className="uf-formRow">
          <label className="uf-label">Title</label>
          <input className="uf-input" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="제목을 입력하세요" />
        </div>

        <div className="uf-formRow">
          <label className="uf-label">Category</label>
          <select className="uf-input" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="uf-formRow">
          <label className="uf-label">Excerpt</label>
          <textarea className="uf-textarea" value={form.excerpt} onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))} placeholder="리스트 카드에 보일 짧은 소개" />
        </div>

        <div className="uf-formRow">
          <label className="uf-label">Tags</label>
          <input className="uf-input" value={form.tagsText} onChange={(e) => setForm((p) => ({ ...p, tagsText: e.target.value }))} placeholder="예: 전시, 인사동, 언프레임 (콤마 구분)" />
        </div>

        {/* ✅ 커버 업로드 */}
        <div className="uf-formRow">
          <label className="uf-label">Cover</label>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label className="uf-btn uf-btn--primary" style={{ cursor: "pointer" }}>
              Upload Cover
              <input type="file" accept="image/*" onChange={onCoverInput} style={{ display: "none" }} />
            </label>

            {form.cover ? (
              <button
                className="uf-btn uf-btn--ghost"
                onClick={() => {
                  setForm((p) => ({ ...p, cover: "", coverThumb: "", coverMedium: "" }));
                  show("🧹 커버를 제거했어요.", 1400);
                }}
              >
                Remove
              </button>
            ) : (
              <div style={{ fontSize: 13, opacity: 0.7 }}>커버 업로드하면 미리보기가 떠요.</div>
            )}
          </div>

          {form.cover ? (
            <div style={{ marginTop: 10 }}>
              <img
                src={form.coverMedium || form.coverThumb || form.cover}
                alt="cover preview"
                style={{ width: "100%", maxWidth: 520, borderRadius: 14, border: "1px solid rgba(0,0,0,.12)" }}
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* ============================================================================
        ✅ 툴바 (컨텍스트)
        - 이미지 선택 = 이미지 툴바
        - 텍스트 선택 = 텍스트 툴바
      ============================================================================ */}
      <div className="uf-toolbar" style={{ marginTop: 18 }}>
        {!imageMode ? (
          <>
            {/* ===================== 텍스트 툴바 ===================== */}
            <button className="uf-tool" onClick={() => editor.chain().focus().toggleBold().run()}>Bold</button>
            <button className="uf-tool" onClick={() => editor.chain().focus().toggleItalic().run()}>Italic</button>
            <button className="uf-tool" onClick={() => editor.chain().focus().toggleUnderline().run()}>Underline</button>
            <button className="uf-tool" onClick={() => editor.chain().focus().toggleHighlight().run()}>Highlight</button>

            <span className="uf-toolSep" />

            {/* ✅ 폰트 사이즈 */}
            <select
              className="uf-input"
              style={{ width: 140, height: 36, padding: "0 10px" }}
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                editor.chain().focus().setFontSize(v).run();
                e.target.value = "";
              }}
              title="Font size"
            >
              <option value="">Font Size</option>
              {FONT_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* ✅ 텍스트 컬러 */}
            <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "0 6px" }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  className="uf-tool"
                  style={{ width: 28, height: 28, padding: 0, borderRadius: 999 }}
                  onClick={() => editor.chain().focus().setColor(c).run()}
                  title={`Color ${c}`}
                >
                  <span style={{ display: "block", width: 14, height: 14, borderRadius: 999, background: c }} />
                </button>
              ))}
              <button className="uf-tool" onClick={() => editor.chain().focus().unsetColor().run()} title="Unset color">
                ✕
              </button>
            </div>

            <span className="uf-toolSep" />

            {/* 정렬 */}
            <button className="uf-tool" onClick={() => editor.chain().focus().setTextAlign("left").run()}>Left</button>
            <button className="uf-tool" onClick={() => editor.chain().focus().setTextAlign("center").run()}>Center</button>
            <button className="uf-tool" onClick={() => editor.chain().focus().setTextAlign("right").run()}>Right</button>

            <span className="uf-toolSep" />

            {/* 리스트 */}
            <button className="uf-tool" onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</button>
            <button className="uf-tool" onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</button>

            <span className="uf-toolSep" />

            {/* 인용/구분선 */}
            <button className="uf-tool" onClick={() => editor.chain().focus().toggleBlockquote().run()}>Quote</button>
            <button className="uf-tool" onClick={() => editor.chain().focus().setHorizontalRule().run()}>Divider</button>

            <span className="uf-toolSep" />

            {/* 링크 */}
            <button className="uf-tool" onClick={setLink}>Link</button>

            <span className="uf-toolSep" />

            {/* 본문 이미지 */}
            <label className="uf-tool uf-tool--file" style={{ cursor: "pointer" }}>
              Upload Image
              <input type="file" accept="image/*" onChange={onBodyImageInput} style={{ display: "none" }} />
            </label>

            <span className="uf-toolSep" />

            {/* Table / YouTube / SoundCloud */}
            <button className="uf-tool" onClick={insertTable}>Table</button>
            <button className="uf-tool" onClick={insertYouTube}>YouTube</button>
            <button className="uf-tool" onClick={insertSoundCloud}>SoundCloud</button>

            <span className="uf-toolSep" />

            <button className="uf-tool" onClick={() => editor.chain().focus().undo().run()}>Undo</button>
            <button className="uf-tool" onClick={() => editor.chain().focus().redo().run()}>Redo</button>
          </>
        ) : (
          <>
            {/* ===================== 이미지 툴바 =====================
                ✅ 이미지 클릭(선택)한 상태에서만 뜸
                - 너가 원한 25/50/100 + 정렬 + 캡션 + 삭제
            */}
            <button className="uf-tool" onClick={() => setSelectedImageWidth(editor, 100)}>Img 100</button>
            <button className="uf-tool" onClick={() => setSelectedImageWidth(editor, 50)}>Img 50</button>
            <button className="uf-tool" onClick={() => setSelectedImageWidth(editor, 25)}>Img 25</button>

            <span className="uf-toolSep" />

            <button className="uf-tool" onClick={() => setSelectedImageAlign(editor, "left")}>Left</button>
            <button className="uf-tool" onClick={() => setSelectedImageAlign(editor, "center")}>Center</button>
            <button className="uf-tool" onClick={() => setSelectedImageAlign(editor, "right")}>Right</button>

            <span className="uf-toolSep" />

            <button className="uf-tool" onClick={addCaptionToSelectedImage}>Caption +</button>
            <button className="uf-tool" onClick={removeCaptionOrUnwrapFigure}>Caption −</button>

            <span className="uf-toolSep" />

            <button className="uf-tool" onClick={deleteSelectedImage}>🗑 Delete</button>

            <span className="uf-toolSep" />

            {/* ✅ 다시 텍스트 툴바로 돌아가는 버튼 (너가 원했던 부분) */}
            <button className="uf-tool" onClick={() => setImageMode(false)}>← Back</button>
          </>
        )}
      </div>

      {/* ✅ 에디터 */}
      <div className="uf-editor" style={{ marginTop: 12 }}>
        <EditorContent editor={editor} />
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
          💡 이미지는 드래그&드롭으로도 업로드돼요. (이미지 파일만)
        </div>
      </div>

      {/* ✅ 저장 버튼 */}
      <div className="uf-actions" style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="uf-btn uf-btn--ghost" onClick={() => onSave("draft")}>Save Draft</button>
        <button className="uf-btn uf-btn--primary" onClick={() => onSave("published")}>Publish</button>
      </div>
    </div>
  );
}
