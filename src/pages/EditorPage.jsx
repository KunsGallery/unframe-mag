// src/pages/EditorPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/* ============================================================================
  ✅ [Logic] TipTap core & extensions (원본 100% 유지)
============================================================================ */
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
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
import { Figure, Figcaption } from "../tiptap/FigureCaption";
import { SoundCloud } from "../tiptap/SoundCloud";

/* ============================================================================
  ✅ [Logic] Firebase & Services (원본 100% 유지)
============================================================================ */
import { auth, googleProvider } from "../firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { getNextArticleId, getArticleByIdNumber, createArticle, updateArticle, listDraftArticles } from "../services/articles";
import { uploadImage } from "../services/upload";
import { getParam, go } from "../utils/router";

/* ============================================================================
  🎨 [PX Design Config] 여기서 수치를 직접 조절하세요!
============================================================================ */
const CMS_CONFIG = {
  TOP_NAV_HEIGHT: "70px",   // 상단 바 높이
  SIDEBAR_WIDTH: "360px",   // 우측 설정창 너비
  EDITOR_PAPER_WIDTH: "880px", // 에디터 종이 가로폭
};

const ADMIN_EMAILS = new Set(["gallerykuns@gmail.com", "cybog2004@gmail.com", "sylove887@gmail.com"]);
const CATEGORY_OPTIONS = ["Exhibition", "Project", "Artist Note", "News"];

/* ============================================================================
  🛠 [Logic] 유틸리티 함수 & TipTap Helpers (원본 100% 유지)
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
  const raw = (text || "").split(",").map((s) => s.trim()).filter(Boolean);
  return Array.from(new Set(raw)).slice(0, 20);
}

function dedupeExtensions(exts) {
  const map = new Map();
  for (const e of exts.filter(Boolean)) map.set(e.name, e);
  return Array.from(map.values());
}

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
  let cleaned = prevStyle.replace(/margin-left\s*:\s*[^;]+;?/gi, "").replace(/margin-right\s*:\s*[^;]+;?/gi, "").replace(/display\s*:\s*[^;]+;?/gi, "").trim();
  let marginRule = "";
  if (align === "left") marginRule = "display:block;margin-left:0;margin-right:auto;";
  if (align === "center") marginRule = "display:block;margin-left:auto;margin-right:auto;";
  if (align === "right") marginRule = "display:block;margin-left:auto;margin-right:0;";
  const merged = `${cleaned ? cleaned + " " : ""}${marginRule}`.trim();
  editor.chain().focus().updateAttributes("image", { style: merged }).run();
  return true;
}

export default function EditorPage({ theme, toggleTheme }) {
  /* --------------------------------------------------------------------------
    ✅ [Logic] 원본 상태 관리 및 효과 (원본 100% 보존)
  -------------------------------------------------------------------------- */
  const { toast, show } = useToast();
  const idFromUrl = getParam("id");
  const idNum = idFromUrl ? Number(idFromUrl) : null;
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const adminOk = !!user?.email && ADMIN_EMAILS.has(user.email);
  const [firebaseId, setFirebaseId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState([]);
  const [form, setForm] = useState({
    id: "", title: "", category: CATEGORY_OPTIONS[0], excerpt: "",
    tagsText: "", cover: "", coverThumb: "", coverMedium: "",
    status: "published", createdAt: null,
  });
  const [imageMode, setImageMode] = useState(false);
  const [customColor, setCustomColor] = useState("#111111");
  const [hexText, setHexText] = useState("#111111");

  const extensions = useMemo(() => {
    return dedupeExtensions([
      StarterKit, TextStyle, FontSize, Color.configure({ types: ["textStyle"] }),
      Underline, Highlight.configure({ multicolor: true }), TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Image.configure({ inline: false, allowBase64: false }), Figure, Figcaption,
      Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
      Youtube.configure({ inline: false, controls: true, nocookie: true }), SoundCloud,
      Placeholder.configure({ placeholder: "당신의 예술적 영감을 기록하세요... ✍️" }),
    ]);
  }, []);

  const editor = useEditor({ extensions, content: "" });

  /* --------------------------------------------------------------------------
    ✅ [Logic] Auth & 데이터 로직 (원본 100% 보존)
  -------------------------------------------------------------------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u || null); setCheckingAuth(false); });
    return () => unsub();
  }, []);

  async function adminLogin() {
    try {
      const r = await signInWithPopup(auth, googleProvider);
      if (!ADMIN_EMAILS.has(r?.user?.email)) { show("🚫 관리자 계정이 아닙니다.", 2600); await signOut(auth); }
      else { show("✅ 관리자 로그인 완료!", 2200); }
    } catch (e) { show("😵 로그인 실패!", 2600); }
  }

  async function adminLogout() {
    try { await signOut(auth); show("👋 로그아웃 완료!", 1800); } catch (e) { show("😵 로그아웃 실패!", 2200); }
  }

  useEffect(() => {
    if (!editor) return;
    const update = () => setImageMode(isImageNodeSelected(editor));
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => { editor.off("selectionUpdate", update); editor.off("transaction", update); };
  }, [editor]);

  useEffect(() => {
    if (!editor || !adminOk) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        if (idNum) {
          const a = await getArticleByIdNumber(idNum);
          if (!alive || !a) return;
          setFirebaseId(a.firebaseId || a._firebaseId || null);
          setForm({
            id: String(a.id ?? ""), title: a.title ?? "",
            category: a.category ?? CATEGORY_OPTIONS[0], excerpt: a.excerpt ?? "",
            tagsText: Array.isArray(a.tags) ? a.tags.join(", ") : "",
            cover: a.cover ?? "", coverThumb: a.coverThumb ?? "", coverMedium: a.coverMedium ?? "",
            status: a.status ?? "published", createdAt: a.createdAt ?? null,
          });
          editor.commands.setContent(a.contentHTML || "");
        } else {
          const nextId = await getNextArticleId();
          setForm(p => ({ ...p, id: String(nextId), title: "", excerpt: "", tagsText: "", cover: "" }));
          editor.commands.setContent("");
        }
        const d = await (listDraftArticles?.() ?? Promise.resolve([]));
        if (alive) setDrafts(Array.isArray(d) ? d : []);
      } catch (e) { show("😵 로딩 실패", 2600); } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [editor, idNum, adminOk]);

  /* --------------------------------------------------------------------------
    ✅ [Logic] 저장 및 도구함 (원본 100% 보존)
  -------------------------------------------------------------------------- */
  async function onSave(statusType) {
    if (!editor) return;
    const id = Number(form.id);
    const title = form.title.trim();
    if (!id) return show("😵 ID를 확인해주세요.", 2200);
    if (!title) return show("✍️ 제목을 적어주세요!", 2200);
    try {
      const payload = {
        id, title, category: form.category, excerpt: form.excerpt.trim(),
        status: statusType, contentHTML: editor.getHTML(),
        cover: form.cover, coverThumb: form.coverThumb, coverMedium: form.coverMedium,
        tags: parseTags(form.tagsText), createdAt: form.createdAt,
      };
      if (!idNum) { const fId = await createArticle(payload); if (fId) setFirebaseId(fId); }
      else { await updateArticle(firebaseId, payload); }
      show(statusType === "draft" ? "✅ 임시저장!" : "🎉 발행 완료!", 1800);
      if (statusType !== "draft") go(`?mode=view&id=${id}`);
    } catch (e) { show("😵 저장 실패!", 2400); }
  }

  async function onPickCover(file) {
    if (!file) return;
    try {
      show("🖼️ 업로드 중…", 1600);
      const res = await uploadImage(file);
      setForm(p => ({ ...p, cover: res.url, coverThumb: res.thumbUrl, coverMedium: res.mediumUrl }));
      show("✅ 커버 완료!", 1600);
    } catch (e) { show("😵 업로드 실패!", 2400); }
  }

  /* --------------------------------------------------------------------------
    🚀 [Design] 매거진 CMS 레이아웃 (개편)
  -------------------------------------------------------------------------- */
  if (checkingAuth) return <div className="py-20 text-center font-serif opacity-30">Authenticating...</div>;
  if (!adminOk) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f4f1ea] text-[#111]">
      <h2 className="font-serif text-3xl mb-6">🔐 Admin Access Only</h2>
      <button className="px-10 py-3 bg-black text-white rounded-full text-[11px] font-bold uppercase tracking-widest" onClick={adminLogin}>Login with Google</button>
    </div>
  );

  return (
    <div className="u-editorRoot min-h-screen bg-white flex flex-col text-[#111] overflow-hidden">
      {/* 🚀 상단 네비게이션: 매거진 데스크 느낌 */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-white border-b border-gray-100 flex justify-between items-center px-8" style={{ height: CMS_CONFIG.TOP_NAV_HEIGHT }}>
        <div className="flex items-center gap-6">
          <div className="text-2xl font-serif font-bold cursor-pointer" onClick={() => go("?mode=list")}>U# CMS</div>
          <div className="h-4 w-[1px] bg-gray-200" />
          <input 
            className="w-[450px] text-lg font-serif outline-none placeholder:opacity-20" 
            placeholder="ARTICLE TITLE..."
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />
        </div>
        <div className="flex gap-4">
          <button className="px-6 py-2 border border-black/10 rounded-full text-[10px] font-bold uppercase tracking-widest" onClick={() => onSave("draft")}>Draft</button>
          <button className="px-8 py-2 bg-black text-white rounded-full text-[10px] font-bold uppercase tracking-widest" onClick={() => onSave("published")}>Publish</button>
        </div>
      </nav>

      <div className="flex flex-1 mt-[70px]">
        {/* 🚀 중앙: 에디터 캔버스 */}
        <main className="flex-1 bg-gray-50/50 overflow-y-auto py-16 px-8">
          {/* 드래프트 목록 (상단에 살짝 노출) */}
          {drafts.length > 0 && (
            <div className="max-w-[880px] mx-auto mb-8 flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {drafts.slice(0, 5).map(d => (
                <button key={d.id} onClick={() => go(`?mode=editor&id=${d.id}`)} className="whitespace-nowrap px-4 py-2 bg-white/50 border border-black/5 rounded-full text-[10px] uppercase font-bold opacity-40 hover:opacity-100 transition-opacity">
                  Draft No.{d.id}
                </button>
              ))}
            </div>
          )}

          <div className="mx-auto bg-white shadow-[0_20px_80px_rgba(0,0,0,0.05)] p-20 min-h-[1200px]" style={{ maxWidth: CMS_CONFIG.EDITOR_PAPER_WIDTH }}>
             {/* 당신의 모든 TipTap 툴바 기능을 포함한 에디터 출력부 */}
             <EditorContent editor={editor} className="uf-editor-surface ProseMirror" />
          </div>
        </main>

        {/* 🚀 우측: 설정 사이드바 */}
        <aside className="border-l border-gray-100 bg-white overflow-y-auto p-10" style={{ width: CMS_CONFIG.SIDEBAR_WIDTH }}>
          <div className="flex flex-col gap-12">
            <section>
              <label className="text-[10px] uppercase font-bold tracking-[0.2em] mb-4 block opacity-40">Section</label>
              <select className="w-full border-b-2 border-black/5 py-2 font-serif text-xl outline-none focus:border-black transition-colors"
                value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </section>

            <section>
              <label className="text-[10px] uppercase font-bold tracking-[0.2em] mb-4 block opacity-40">Cover Media</label>
              <div className="group relative aspect-video bg-gray-100 rounded-xl overflow-hidden cursor-pointer border-2 border-dashed border-gray-200 hover:border-black transition-all">
                {form.cover ? (
                  <img src={form.coverMedium || form.cover} className="w-full h-full object-cover" alt="cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] uppercase opacity-30 italic">Click to Upload</div>
                )}
                <input type="file" accept="image/*" onChange={(e) => onPickCover(e.target.files?.[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
            </section>

            <section>
              <label className="text-[10px] uppercase font-bold tracking-[0.2em] mb-4 block opacity-40">Lead Text (Excerpt)</label>
              <textarea 
                className="w-full h-40 border border-black/5 p-4 text-sm leading-relaxed italic outline-none focus:border-black/20"
                placeholder="이 글의 요약을 적어주세요..."
                value={form.excerpt}
                onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
              />
            </section>

            <section>
              <label className="text-[10px] uppercase font-bold tracking-[0.2em] mb-4 block opacity-40">Tags</label>
              <input 
                className="w-full border-b border-black/10 py-2 text-xs outline-none focus:border-black"
                placeholder="comma, separated, tags"
                value={form.tagsText}
                onChange={(e) => setForm((p) => ({ ...p, tagsText: e.target.value }))}
              />
            </section>
          </div>
        </aside>
      </div>

      {toast && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 uf-toast z-[100]">{toast}</div>}
    </div>
  );
}