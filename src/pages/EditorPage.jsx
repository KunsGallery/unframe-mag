// src/pages/EditorPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

/* =============================================================================
  ✅ TipTap core
============================================================================= */
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

/* =============================================================================
  ✅ TipTap extensions
  - ⚠️ TipTap 패키지 버전에 따라 default export / named export가 다를 때가 있어서
    "import * as Ext" 후 default ?? Named 로 안전하게 처리
============================================================================= */
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";

import * as TableExt from "@tiptap/extension-table";
import * as TableRowExt from "@tiptap/extension-table-row";
import * as TableCellExt from "@tiptap/extension-table-cell";
import * as TableHeaderExt from "@tiptap/extension-table-header";

import * as TextStyleExt from "@tiptap/extension-text-style";
import * as ColorExt from "@tiptap/extension-color";

/* ✅ 커스텀 확장(이미지 캡션 / 사운드클라우드)
   - 네 프로젝트에 이미 존재한다는 전제 (이전 대화에서 사용 중이었음)
*/
import { Figure, Figcaption } from "../tiptap/FigureCaption";
import { SoundCloud } from "../tiptap/SoundCloud";

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
  ✅ 관리자 이메일 (Firestore rules와 동일)
============================================================================= */
const ADMIN_EMAILS = new Set([
  "gallerykuns@gmail.com",
  "cybog2004@gmail.com",
  "sylove887@gmail.com",
]);

/* =============================================================================
  ✅ 카테고리 옵션
============================================================================= */
const CATEGORY_OPTIONS = ["Exhibition", "Project", "Artist Note", "News"];

/* =============================================================================
  ✅ Toast (이모지 + 친근한 안내)
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
  ✅ TipTap extension dedupe
  - "Duplicate extension names" 경고 방지
============================================================================= */
function dedupeExtensions(exts) {
  const map = new Map();
  for (const e of exts.filter(Boolean)) map.set(e.name, e);
  return Array.from(map.values());
}

/* =============================================================================
  ✅ 선택된 노드가 image인지 판별
============================================================================= */
function isImageSelected(editor) {
  const sel = editor?.state?.selection;
  return !!sel?.node && sel.node.type?.name === "image";
}

/* =============================================================================
  ✅ Figure(캡션 wrapper) 안인지 판별
============================================================================= */
function isInsideFigure(editor) {
  try {
    const { $from } = editor.state.selection;
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type.name === "figure") return true;
    }
  } catch {}
  return false;
}

/* =============================================================================
  ✅ 이미지 width/align 적용 (style로 처리)
============================================================================= */
function setSelectedImageWidth(editor, percent) {
  const sel = editor.state.selection;
  if (!sel?.node || sel.node.type.name !== "image") return false;

  const prevStyle = sel.node.attrs?.style || "";
  const cleaned = prevStyle.replace(/width\s*:\s*[^;]+;?/gi, "").trim();
  const nextStyle = `${cleaned ? cleaned + " " : ""}width:${percent}%;`.trim();

  editor.chain().focus().updateAttributes("image", { style: nextStyle }).run();
  return true;
}

function setSelectedImageAlign(editor, align) {
  const sel = editor.state.selection;
  if (!sel?.node || sel.node.type.name !== "image") return false;

  // 캡션(figure) 안이면 figure align을 바꾸는 게 더 자연스러움
  if (isInsideFigure(editor) && editor?.chain?.().setFigureAlign) {
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

  const nextStyle = `${cleaned ? cleaned + " " : ""}${marginRule}`.trim();
  editor.chain().focus().updateAttributes("image", { style: nextStyle }).run();
  return true;
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
    ✅ Extensions (한 번만 정의 + dedupe)
    - Table/TextStyle/Color는 export 스타일 차이 대응
  ============================================================================= */
  const extensions = useMemo(() => {
    const Table = TableExt.default ?? TableExt.Table;
    const TableRow = TableRowExt.default ?? TableRowExt.TableRow;
    const TableCell = TableCellExt.default ?? TableCellExt.TableCell;
    const TableHeader = TableHeaderExt.default ?? TableHeaderExt.TableHeader;

    const TextStyle = TextStyleExt.default ?? TextStyleExt.TextStyle;
    const Color = ColorExt.default ?? ColorExt.Color;

    const exts = [
      StarterKit,
      // 텍스트
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),

      // TextStyle/Color (폰트색)
      TextStyle,
      Color.configure({ types: ["textStyle"] }),

      // 이미지 / 캡션
      Image.configure({ inline: false, allowBase64: false }),
      Figure,
      Figcaption,

      // Table
      Table?.configure?.({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,

      // Embed
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
    ✅ 컨텍스트 툴바 (이미지 선택 시 이미지툴)
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
            // ✅ 기존 글 커버가 imgbb든 뭐든 일단 보여주기
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
  }, [editor, adminOk, idNum, nav]);

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
    ✅ 2/3단 (HTML 방식)
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
    ✅ Scene / Sticky / Parallax / Reveal 삽입
    - ViewPage에서 이 클래스들을 인식해서 효과를 줌
============================================================================= */
  function insertScene() {
    if (!editor) return;
    const html = `
<section class="uf-scene">
  <p><strong>Scene Title</strong> (여기에 씬 설명을 적어주세요)</p>
  <p>이 아래에 본문/이미지/컬럼/임베드 등을 넣으면 “한 덩어리 씬”처럼 연출할 수 있어요.</p>
</section>
<p></p>`;
    editor.chain().focus().insertContent(html).run();
    show("🎬 Scene 블록을 추가했어요!", 1600);
  }

  function insertStickyImageHint() {
    if (!editor) return;
    // 실제 sticky는 ViewPage에서 CSS/JS로 처리
    // 여기서는 “스티키 컨테이너”를 만들어주고, 안에 이미지를 넣도록 안내
    const html = `
<div class="uf-stickyWrap">
  <div class="uf-sticky">
    <p><em>여기에 이미지를 넣으면(업로드 후) 스크롤 동안 고정(sticky) 연출이 가능해요.</em></p>
  </div>
</div>
<p></p>`;
    editor.chain().focus().insertContent(html).run();
    show("📌 Sticky 컨테이너를 넣었어요!", 1700);
  }

  function insertRevealBlock() {
    if (!editor) return;
    const html = `
<div class="uf-reveal">
  <p><strong>Reveal Block</strong> (스크롤로 등장)</p>
  <p>여기에 문단/이미지를 넣어보세요. 뷰에서 스르륵 나타나게 만들 수 있어요.</p>
</div>
<p></p>`;
    editor.chain().focus().insertContent(html).run();
    show("✨ Reveal 블록을 추가했어요!", 1600);
  }

  function insertParallaxHint() {
    if (!editor) return;
    const html = `
<div class="uf-parallax" data-parallax="0.25">
  <p><strong>Parallax Layer</strong></p>
  <p>여기에 이미지/텍스트를 넣으면 스크롤 시 살짝 다른 속도로 움직이게 만들 수 있어요.</p>
</div>
<p></p>`;
    editor.chain().focus().insertContent(html).run();
    show("🌀 Parallax 블록을 추가했어요!", 1600);
  }

  /* =============================================================================
    ✅ Table / YouTube / SoundCloud 삽입
============================================================================= */
  function insertTable() {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    show("📋 테이블을 넣었어요!", 1600);
  }

  function insertYouTube() {
    const url = window.prompt("YouTube URL을 넣어주세요", "https://www.youtube.com/watch?v=");
    if (!url) return;
    editor?.chain().focus().setYoutubeVideo({ src: url, width: 720, height: 405 }).run();
    show("▶️ 유튜브를 삽입했어요!", 1600);
  }

  function insertSoundCloud() {
    const url = window.prompt("SoundCloud URL을 넣어주세요", "https://soundcloud.com/");
    if (!url) return;
    editor?.chain().focus().setSoundCloud({ src: url, height: 166 }).run();
    show("🔊 사운드클라우드를 삽입했어요!", 1600);
  }

  /* =============================================================================
    ✅ Link 설정
============================================================================= */
  function setLink() {
    const prev = editor?.getAttributes("link")?.href || "";
    const url = window.prompt("링크 URL", prev || "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor?.chain().focus().unsetLink().run();
      show("🔗 링크를 제거했어요.", 1400);
      return;
    }
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
    show("🔗 링크를 설정했어요!", 1400);
  }

  /* =============================================================================
    ✅ Image caption (Figure)
============================================================================= */
  function addCaptionToSelectedImage() {
    if (!editor) return;
    if (!isImageSelected(editor)) return show("🖼️ 먼저 이미지를 클릭해서 선택해주세요!", 2000);
    if (isInsideFigure(editor)) return show("✅ 이미 캡션이 있는 이미지예요!", 1800);

    editor.chain().focus().wrapSelectionInFigure({ align: "center", text: "Caption…" }).run();
    show("✍️ 캡션을 추가했어요! 아래 텍스트를 수정해보세요.", 2200);
  }

  function removeCaptionOrUnwrapFigure() {
    if (!editor) return;
    if (!isInsideFigure(editor)) return show("😮 캡션이 붙은 이미지가 아니에요.", 1800);
    editor.chain().focus().unwrapFigure().run();
    show("🧹 캡션(figure)을 해제했어요.", 1800);
  }

  function deleteSelectedImage() {
    if (!editor) return;
    if (!isImageSelected(editor)) return show("🖼️ 먼저 이미지를 클릭해서 선택해주세요!", 1800);
    editor.chain().focus().deleteSelection().run();
    show("🗑️ 이미지를 삭제했어요.", 1600);
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
    ✅ Auth Gate UI (hooks 이후에 return → hooks 순서 안전)
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

      {/* ✅ “작동 방식 설명 박스” (너가 원한 ‘쉽게 설명’) */}
      <div className="uf-wrap" style={{ paddingTop: 16 }}>
        <div className="uf-card uf-panel" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>🧠 Scrollytelling 편집 가이드</div>
          <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.55 }}>
            • <b>Scene</b>: 글을 “장면 단위”로 묶는 컨테이너예요. (뷰에서 씬 경계가 보이게 할 수 있어요)<br />
            • <b>Sticky</b>: 스크롤 동안 특정 요소(이미지/문장)를 화면에 고정해서 강조할 수 있어요.<br />
            • <b>Reveal</b>: 스크롤로 등장(페이드/슬라이드)하는 블록이에요.<br />
            • <b>Parallax</b>: 스크롤 속도 차이를 줘서 “깊이감”을 만드는 블록이에요.<br />
            <span style={{ display: "block", marginTop: 6 }}>
              ✅ 버튼으로 블록을 넣고, 그 안에 이미지/텍스트를 채우면 됩니다.
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar (sticky) */}
      <div className="uf-toolbar">
        <div className="uf-wrap">
          <div className="uf-toolbar__inner">
            {/* ===================== TEXT TOOLBAR ===================== */}
            {!imageMode ? (
              <>
                <button className="uf-btn" onClick={() => editor?.chain().focus().toggleBold().run()}>B</button>
                <button className="uf-btn" onClick={() => editor?.chain().focus().toggleItalic().run()}>I</button>
                <button className="uf-btn" onClick={() => editor?.chain().focus().toggleUnderline().run()}>U</button>
                <button className="uf-btn" onClick={() => editor?.chain().focus().toggleHighlight().run()}>🖍</button>

                {/* 폰트색(간단) */}
                <button className="uf-btn" onClick={() => editor?.chain().focus().setColor("#ef4444").run()} title="red">🟥</button>
                <button className="uf-btn" onClick={() => editor?.chain().focus().setColor("#3b82f6").run()} title="blue">🟦</button>
                <button className="uf-btn" onClick={() => editor?.chain().focus().unsetColor().run()} title="reset">✕</button>

                <button className="uf-btn" onClick={() => editor?.chain().focus().setTextAlign("left").run()}>⬅</button>
                <button className="uf-btn" onClick={() => editor?.chain().focus().setTextAlign("center").run()}>↔</button>
                <button className="uf-btn" onClick={() => editor?.chain().focus().setTextAlign("right").run()}>➡</button>

                <button className="uf-btn" onClick={() => editor?.chain().focus().toggleBulletList().run()}>• List</button>
                <button className="uf-btn" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1. List</button>

                <button className="uf-btn" onClick={() => editor?.chain().focus().toggleBlockquote().run()}>❝ Quote</button>
                <button className="uf-btn" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>— Divider</button>

                <button className="uf-btn" onClick={setLink}>🔗 Link</button>

                <label className="uf-btn" style={{ cursor: "pointer" }}>
                  🖼 Upload
                  <input type="file" accept="image/*" onChange={onBodyImageInput} style={{ display: "none" }} />
                </label>

                <button className="uf-btn" onClick={() => insertColumns(2)}>2 Col</button>
                <button className="uf-btn" onClick={() => insertColumns(3)}>3 Col</button>

                <button className="uf-btn" onClick={insertTable}>Table</button>
                <button className="uf-btn" onClick={insertYouTube}>YouTube</button>
                <button className="uf-btn" onClick={insertSoundCloud}>SoundCloud</button>

                {/* ✅ Scrollytelling blocks */}
                <button className="uf-btn" onClick={insertScene}>🎬 Scene</button>
                <button className="uf-btn" onClick={insertStickyImageHint}>📌 Sticky</button>
                <button className="uf-btn" onClick={insertRevealBlock}>✨ Reveal</button>
                <button className="uf-btn" onClick={insertParallaxHint}>🌀 Parallax</button>

                <button className="uf-btn" onClick={() => editor?.chain().focus().undo().run()}>↶</button>
                <button className="uf-btn" onClick={() => editor?.chain().focus().redo().run()}>↷</button>
              </>
            ) : (
              <>
                {/* ===================== IMAGE TOOLBAR ===================== */}
                <button className="uf-btn" onClick={() => setSelectedImageWidth(editor, 100)}>Img 100</button>
                <button className="uf-btn" onClick={() => setSelectedImageWidth(editor, 50)}>Img 50</button>
                <button className="uf-btn" onClick={() => setSelectedImageWidth(editor, 25)}>Img 25</button>

                <button className="uf-btn" onClick={() => setSelectedImageAlign(editor, "left")}>Left</button>
                <button className="uf-btn" onClick={() => setSelectedImageAlign(editor, "center")}>Center</button>
                <button className="uf-btn" onClick={() => setSelectedImageAlign(editor, "right")}>Right</button>

                <button className="uf-btn" onClick={addCaptionToSelectedImage}>Caption +</button>
                <button className="uf-btn" onClick={removeCaptionOrUnwrapFigure}>Caption −</button>

                <button className="uf-btn" onClick={deleteSelectedImage}>🗑 Delete</button>

                {/* ✅ 다시 텍스트툴로 */}
                <button className="uf-btn uf-btn--ghost" onClick={() => setImageMode(false)}>← Back</button>
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
                    <div className="uf-panelHint">
                      커버가 있으면 리스트/뷰에서 더 고급스럽게 보여요 ✨
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="uf-stack" style={{ marginTop: 12 }}>
                  <button className="uf-btn" onClick={() => onSave("draft")}>📝 Save Draft</button>
                  <button className="uf-btn uf-btn--primary" onClick={() => onSave("published")}>🚀 Publish</button>
                </div>

                <div className="uf-panelHint">
                  ✅ 본문에는 이미지 드래그&드롭도 가능해요.<br />
                  ✅ 이미지 클릭하면 “이미지 전용 툴바(크기/정렬/캡션/삭제)”로 바뀌어요.
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
