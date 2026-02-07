// src/pages/EditorPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/* ============================================================================
  ✅ TipTap core
============================================================================ */
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

/* ============================================================================
  ✅ TipTap extensions
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
  ✅ Firebase Auth
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
  ✅ 관리자 이메일 / 카테고리
============================================================================ */
const ADMIN_EMAILS = new Set([
  "gallerykuns@gmail.com",
  "cybog2004@gmail.com",
  "sylove887@gmail.com",
]);

const CATEGORY_OPTIONS = ["Exhibition", "Project", "Artist Note", "News"];

/* ============================================================================
  ✅ Toast
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

function parseTags(text) {
  const raw = (text || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(raw)).slice(0, 20);
}

/* ✅ TipTap 중복 확장 제거 */
function dedupeExtensions(exts) {
  const map = new Map();
  for (const e of exts.filter(Boolean)) map.set(e.name, e);
  return Array.from(map.values());
}

/* ============================================================================
  ✅ FontSize: textStyle 기반 (mark 새로 만들지 않고 textStyle 확장)
============================================================================ */
const FontSize = TextStyle.extend({
  name: "textStyle",
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (el) => el.style.fontSize || null,
        renderHTML: (attrs) => (attrs.fontSize ? { style: `font-size:${attrs.fontSize}` } : {}),
      },
    };
  },
});

/* ============================================================================
  ✅ 이미지 선택 여부 / figure 내부 여부
============================================================================ */
function isImageNodeSelected(editor) {
  const sel = editor?.state?.selection;
  return !!sel?.node && sel.node.type?.name === "image";
}
function isInsideFigure(editor) {
  const { $from } = editor.state.selection;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === "figure") return true;
  }
  return false;
}

/* ✅ 이미지 width/align 적용 */
function setSelectedImageWidth(editor, percent) {
  const sel = editor.state.selection;
  if (!sel?.node || sel.node.type.name !== "image") return false;

  const prevStyle = sel.node.attrs?.style || "";
  const nextStyle = prevStyle.replace(/width\s*:\s*[^;]+;?/gi, "").trim();
  const merged = `${nextStyle ? nextStyle + " " : ""}width:${percent}%;`.trim();

  editor.chain().focus().updateAttributes("image", { style: merged }).run();
  return true;
}

function setSelectedImageAlign(editor, align) {
  const sel = editor.state.selection;
  if (!sel?.node || sel.node.type.name !== "image") return false;

  if (isInsideFigure(editor)) {
    editor.chain().focus().setFigureAlign(align).run();
    return true;
  }

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
  /* ============================================================================
    ✅ Hooks는 항상 같은 순서로 호출 (중요)
  ============================================================================ */
  const { toast, show } = useToast();

  const idFromUrl = getParam("id");
  const idNum = idFromUrl ? Number(idFromUrl) : null;

  // Auth state
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const adminOk = !!user?.email && ADMIN_EMAILS.has(user.email);

  // Form state
  const [firebaseId, setFirebaseId] = useState(null);
  const [loading, setLoading] = useState(true);
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

  // Context toolbar state
  const [imageMode, setImageMode] = useState(false);

  /* ============================================================================
    ✅ Extensions
    - blockquote는 StarterKit 기본 포함
    - “안 되는 느낌”은 거의 CSS 문제라 index.css에서 해결
  ============================================================================ */
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

      Figure,
      Figcaption,

      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,

      Youtube.configure({ inline: false, controls: true, nocookie: true }),
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
    ✅ Auth subscribe
  ============================================================================ */
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
      show("👋 로그아웃 완료!", 1800);
    } catch (e) {
      console.error(e);
      show("😵 로그아웃 실패!", 2200);
    }
  }

  /* ============================================================================
    ✅ selection 변화 → imageMode
  ============================================================================ */
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
    ✅ 글 로드 (adminOk + editor 준비된 후)
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
            show("😮 글을 찾지 못했어요. 리스트로 이동해요.", 2200);
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
        show("😵 에디터 로딩 중 오류가 발생했어요.", 2600);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [editor, idNum, adminOk]);

  /* ============================================================================
    ✅ 업로드
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
      show("😵 커버 업로드 실패!", 2400);
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
      show("🖼️ 본문 이미지 업로드 중…", 1600);
      const res = await uploadImage(file);
      if (!res?.url) throw new Error("no url");
      editor.chain().focus().setImage({ src: res.url }).run();
      show("✅ 이미지 삽입 완료!", 1400);
    } catch (e) {
      console.error(e);
      show("😵 본문 이미지 업로드 실패!", 2400);
    }
  }

  function onBodyImageInput(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onPickBodyImage(f);
  }

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
    ✅ 저장
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
        const newFirebaseId = await createArticle(payload);
        if (newFirebaseId) setFirebaseId(newFirebaseId);

        show(statusType === "draft" ? "✅ 드래프트 저장!" : "🎉 발행 완료!", 1800);
        if (statusType !== "draft") go(`?mode=view&id=${id}`);
      } else {
        if (!firebaseId) return show("😵 firebaseId가 없어요. 다시 열어주세요.", 2400);

        await updateArticle(firebaseId, payload);
        show("✅ 저장 완료!", 1600);
        if (statusType !== "draft") go(`?mode=view&id=${id}`);
      }
    } catch (e) {
      console.error(e);
      show("😵 저장 중 오류가 발생했어요.", 2400);
    }
  }

  function openDraft(d) {
    if (!d?.id) return;
    go(`?mode=editor&id=${d.id}`);
  }

  /* ============================================================================
    ✅ 툴 helper
============================================================================ */
  const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"];

  // ✅ 팔레트는 남겨두되, “완전 자유 색상”은 color picker + hex 입력으로 해결
  const PALETTE = ["#111111", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];

  const [customColor, setCustomColor] = useState("#111111");
  const [hexText, setHexText] = useState("#111111");

  function setLink() {
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("링크 URL", prev || "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
      return show("🔗 링크 제거!", 1200);
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
    show("🔗 링크 설정!", 1200);
  }

  function insertYouTube() {
    const url = window.prompt("YouTube URL", "https://www.youtube.com/watch?v=");
    if (!url) return;
    editor.chain().focus().setYoutubeVideo({ src: url, width: 720, height: 405 }).run();
    show("▶️ 유튜브 삽입!", 1400);
  }

  function insertSoundCloud() {
    const url = window.prompt("SoundCloud URL", "https://soundcloud.com/");
    if (!url) return;
    editor.chain().focus().setSoundCloud({ src: url, height: 166 }).run();
    show("🔊 사운드클라우드 삽입!", 1400);
  }

  function insertTable() {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    show("📋 테이블 삽입!", 1400);
  }

  function addCaptionToSelectedImage() {
    if (!isImageNodeSelected(editor)) return show("🖼️ 이미지를 클릭해 선택해주세요!", 1800);
    if (isInsideFigure(editor)) return show("✅ 이미 캡션이 있어요!", 1600);
    editor.chain().focus().wrapSelectionInFigure({ align: "center", text: "Caption…" }).run();
    show("✍️ 캡션 추가!", 1600);
  }

  function removeCaptionOrUnwrapFigure() {
    if (!isInsideFigure(editor)) return show("😮 캡션이 붙은 이미지가 아니에요.", 1600);
    editor.chain().focus().unwrapFigure().run();
    show("🧹 캡션 해제!", 1400);
  }

  function deleteSelectedImage() {
    if (!isImageNodeSelected(editor)) return show("🖼️ 이미지를 선택해주세요!", 1600);
    editor.chain().focus().deleteSelection().run();
    show("🗑 삭제!", 1200);
  }

  /* ============================================================================
    ✅ 렌더 분기(Hook 선언 이후에만)
  ============================================================================ */
  if (checkingAuth) {
    return <div className="uf-container" style={{ padding: "120px 16px" }}>확인 중… ⏳</div>;
  }

  if (!adminOk) {
    return (
      <div className="uf-container" style={{ padding: "120px 16px" }}>
        {toast && <div className="uf-toast">{toast}</div>}
        <h2 style={{ fontSize: 28, marginBottom: 10 }}>🔐 Admin Only</h2>
        <p style={{ marginBottom: 16, color: "rgba(0,0,0,.65)" }}>이 페이지는 관리자만 접근 가능해요.</p>
        <button className="uf-btn uf-btn--primary" onClick={adminLogin}>Google로 로그인</button>
        <div style={{ marginTop: 12 }}>
          <button className="uf-btn uf-btn--ghost" onClick={() => go("?mode=list")}>← 리스트로</button>
        </div>
      </div>
    );
  }

  if (loading || !editor) {
    return (
      <div className="uf-container" style={{ padding: "120px 16px" }}>
        {toast && <div className="uf-toast">{toast}</div>}
        로딩 중… ⏳
      </div>
    );
  }

  return (
    <div className="uf-container" style={{ padding: "24px 16px" }}>
      {toast && <div className="uf-toast">{toast}</div>}

      <div className="uf-editorTop">
        <button className="uf-btn uf-btn--ghost" onClick={() => go("?mode=list")}>← Back to list</button>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="uf-btn uf-btn--ghost" onClick={toggleTheme}>
            {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
          </button>
          <div style={{ fontSize: 13, opacity: 0.75 }}>{user?.email ? `👤 ${user.email}` : ""}</div>
          <button className="uf-btn uf-btn--ghost" onClick={adminLogout}>Logout</button>
        </div>
      </div>

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

      {/* 메타 폼 */}
      <div className="uf-form" style={{ marginTop: 18 }}>
        <div className="uf-formRow">
          <label className="uf-label">ID</label>
          <input className="uf-input" value={form.id} disabled={!!idNum}
            onChange={(e) => setForm((p) => ({ ...p, id: e.target.value }))} />
        </div>

        <div className="uf-formRow">
          <label className="uf-label">Title</label>
          <input className="uf-input" value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </div>

        <div className="uf-formRow">
          <label className="uf-label">Category</label>
          <select className="uf-input" value={form.category}
            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="uf-formRow">
          <label className="uf-label">Excerpt</label>
          <textarea className="uf-textarea" value={form.excerpt}
            onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))} />
        </div>

        <div className="uf-formRow">
          <label className="uf-label">Tags</label>
          <input className="uf-input" value={form.tagsText}
            onChange={(e) => setForm((p) => ({ ...p, tagsText: e.target.value }))} />
        </div>

        {/* Cover */}
        <div className="uf-formRow">
          <label className="uf-label">Cover</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label className="uf-btn uf-btn--primary" style={{ cursor: "pointer" }}>
              Upload Cover
              <input type="file" accept="image/*" onChange={onCoverInput} style={{ display: "none" }} />
            </label>
            {form.cover ? (
              <button className="uf-btn uf-btn--ghost"
                onClick={() => setForm((p) => ({ ...p, cover: "", coverThumb: "", coverMedium: "" }))}>
                Remove
              </button>
            ) : null}
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

      {/* 툴바 */}
      <div className="uf-toolbar" style={{ marginTop: 18 }}>
        {!imageMode ? (
          <>
            <button className="uf-tool" onClick={() => editor.chain().focus().toggleBold().run()}>Bold</button>
            <button className="uf-tool" onClick={() => editor.chain().focus().toggleItalic().run()}>Italic</button>
            <button className="uf-tool" onClick={() => editor.chain().focus().toggleUnderline().run()}>Underline</button>
            <button className="uf-tool" onClick={() => editor.chain().focus().toggleHighlight().run()}>Highlight</button>

            <span className="uf-toolSep" />

            {/* ✅ 폰트 사이즈 */}
            <select className="uf-input" style={{ width: 140, height: 36, padding: "0 10px" }} defaultValue=""
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                editor.chain().focus().setMark("textStyle", { fontSize: v }).run();
                e.target.value = "";
              }}>
              <option value="">Font Size</option>
              {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            <span className="uf-toolSep" />

            {/* ✅ 컬러 팔레트 + 컬러피커 + HEX 입력 */}
            <div className="uf-colorBar">
              {PALETTE.map((c) => (
                <button key={c} className="uf-colorDot" title={c}
                  onClick={() => editor.chain().focus().setColor(c).run()}>
                  <span style={{ background: c }} />
                </button>
              ))}

              {/* 완전 자유 컬러 */}
              <label className="uf-colorPicker" title="Pick any color">
                🎨
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCustomColor(v);
                    setHexText(v);
                    editor.chain().focus().setColor(v).run();
                  }}
                />
              </label>

              <input
                className="uf-input"
                style={{ width: 120, height: 36 }}
                value={hexText}
                onChange={(e) => setHexText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = hexText.trim();
                    if (/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(v)) {
                      editor.chain().focus().setColor(v).run();
                      setCustomColor(v.length === 4 ? v : v);
                      show(`🎨 컬러 적용: ${v}`, 1200);
                    } else {
                      show("😵 HEX 형식이 아니에요. 예: #111111", 1800);
                    }
                  }
                }}
                placeholder="#111111"
                title="HEX (Enter로 적용)"
              />

              <button className="uf-tool" onClick={() => editor.chain().focus().unsetColor().run()} title="Unset color">
                ✕
              </button>
            </div>

            <span className="uf-toolSep" />

            <button className="uf-tool" onClick={() => editor.chain().focus().setTextAlign("left").run()}>Left</button>
            <button className="uf-tool" onClick={() => editor.chain().focus().setTextAlign("center").run()}>Center</button>
            <button className="uf-tool" onClick={() => editor.chain().focus().setTextAlign("right").run()}>Right</button>

            <span className="uf-toolSep" />

            <button className="uf-tool" onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</button>
            <button className="uf-tool" onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</button>

            <span className="uf-toolSep" />

            {/* ✅ 인용: “안 되는 느낌”은 CSS가 거의 원인 → index.css에서 확실히 표시 */}
            <button
              className="uf-tool"
              onClick={() => {
                editor.chain().focus().toggleBlockquote().run();
                show("💬 인용(Quote) 토글!", 900);
              }}
              title="현재 문단에 인용 스타일 적용/해제"
            >
              Quote
            </button>

            <button className="uf-tool" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
              Divider
            </button>

            <span className="uf-toolSep" />

            <button className="uf-tool" onClick={setLink}>Link</button>

            <span className="uf-toolSep" />

            <label className="uf-tool uf-tool--file" style={{ cursor: "pointer" }}>
              Upload Image
              <input type="file" accept="image/*" onChange={onBodyImageInput} style={{ display: "none" }} />
            </label>

            <span className="uf-toolSep" />

            <button className="uf-tool" onClick={insertTable}>Table</button>
            <button className="uf-tool" onClick={insertYouTube}>YouTube</button>
            <button className="uf-tool" onClick={insertSoundCloud}>SoundCloud</button>

            <span className="uf-toolSep" />

            <button className="uf-tool" onClick={() => editor.chain().focus().undo().run()}>Undo</button>
            <button className="uf-tool" onClick={() => editor.chain().focus().redo().run()}>Redo</button>
          </>
        ) : (
          <>
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

            <button className="uf-tool" onClick={() => setImageMode(false)}>← Back</button>
          </>
        )}
      </div>

      <div className="uf-editor" style={{ marginTop: 12 }}>
        <EditorContent editor={editor} />
      </div>

      <div className="uf-actions" style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="uf-btn uf-btn--ghost" onClick={() => onSave("draft")}>Save Draft</button>
        <button className="uf-btn uf-btn--primary" onClick={() => onSave("published")}>Publish</button>
      </div>
    </div>
  );
}
