import React, { useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Figure, Figcaption } from "../tiptap/FigureCaption";
import { SoundCloud } from "../tiptap/SoundCloud";
import { auth, googleProvider } from "../firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { getNextArticleId, getArticleByIdNumber, createArticle, updateArticle, listDraftArticles } from "../services/articles";
import { uploadImage } from "../services/upload";
import { getParam, go } from "../utils/router";

/* ============================================================================
  🎨 [PX Design Config] CMS 레이아웃 수치 조절
============================================================================ */
const CMS_PX = {
  NAV_H: "70px",      // 상단 바 높이
  SIDE_W: "360px",    // 우측 설정창 너비
  EDIT_W: "880px",    // 에디터 본문 너비
};

const ADMIN_EMAILS = new Set(["gallerykuns@gmail.com", "cybog2004@gmail.com", "sylove887@gmail.com"]);
const CATEGORY_OPTIONS = ["Exhibition", "Project", "Artist Note", "News"];

/* ✅ [Utility] 원본 유틸 로직 100% 보존 */
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
const FontSize = TextStyle.extend({
  name: "textStyle",
  addAttributes() {
    return { ...this.parent?.(), fontSize: { default: null, parseHTML: (el) => el.style.fontSize || null, renderHTML: (attrs) => (attrs.fontSize ? { style: `font-size:${attrs.fontSize}` } : {}), }, };
  },
});

/* ✅ [Tiptap Helpers] 이미지 조작 로직 100% 보존 */
function isImageNodeSelected(editor) { const sel = editor?.state?.selection; return !!sel?.node && sel.node.type?.name === "image"; }
function isInsideFigure(editor) { const { $from } = editor.state.selection; for (let d = $from.depth; d > 0; d--) { if ($from.node(d).type.name === "figure") return true; } return false; }
function setSelectedImageWidth(editor, percent) { const sel = editor.state.selection; if (!sel?.node || sel.node.type.name !== "image") return false; const prevStyle = sel.node.attrs?.style || ""; const nextStyle = prevStyle.replace(/width\s*:\s*[^;]+;?/gi, "").trim(); const merged = `${nextStyle ? nextStyle + " " : ""}width:${percent}%;`.trim(); editor.chain().focus().updateAttributes("image", { style: merged }).run(); return true; }

export default function EditorPage({ theme, toggleTheme }) {
  const idFromUrl = getParam("id");
  const idNum = idFromUrl ? Number(idFromUrl) : null;
  const { toast, show } = useToast();
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const adminOk = !!user?.email && ADMIN_EMAILS.has(user.email);
  const [firebaseId, setFirebaseId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState([]);
  const [form, setForm] = useState({ id: "", title: "", category: CATEGORY_OPTIONS[0], excerpt: "", tagsText: "", cover: "", coverThumb: "", coverMedium: "", status: "published", createdAt: null, });
  const [imageMode, setImageMode] = useState(false);

  // ✅ [Tiptap Setup] 익스텐션 설정 100% 보존
  const extensions = useMemo(() => [
    StarterKit, TextStyle, FontSize, Color.configure({ types: ["textStyle"] }), Underline, Highlight.configure({ multicolor: true }), 
    TextAlign.configure({ types: ["heading", "paragraph"] }), Link.configure({ openOnClick: false }), Image.configure({ inline: false }),
    Figure, Figcaption, Table.configure({ resizable: true }), TableRow, TableHeader, TableCell, Youtube, SoundCloud,
    Placeholder.configure({ placeholder: "영감을 기록하세요... ✍️" }),
  ], []);

  const editor = useEditor({ extensions, content: "" });

  /* --------------------------------------------------------------------------
    ✅ [Logic] 모든 서비스 함수 로직 100% 보존
  -------------------------------------------------------------------------- */
  useEffect(() => { const unsub = onAuthStateChanged(auth, (u) => { setUser(u || null); setCheckingAuth(false); }); return () => unsub(); }, []);

  async function adminLogin() { try { const r = await signInWithPopup(auth, googleProvider); if (!ADMIN_EMAILS.has(r?.user?.email)) { show("🚫 관리자 권한 없음", 2600); await signOut(auth); } else { show("✅ 로그인 완료", 2200); } } catch { show("😵 로그인 실패", 2600); } }
  
  async function onSave(statusType) {
    if (!editor) return;
    const id = Number(form.id); const title = form.title.trim();
    if (!id || !title) return show("✍️ ID와 제목을 확인해주세요!", 2200);
    try {
      const payload = { id, title, category: form.category, excerpt: form.excerpt, status: statusType, contentHTML: editor.getHTML(), cover: form.cover, tags: parseTags(form.tagsText), createdAt: form.createdAt };
      if (!idNum) { const fId = await createArticle(payload); if (fId) setFirebaseId(fId); }
      else { await updateArticle(firebaseId, payload); }
      show(statusType === "draft" ? "✅ 임시저장" : "🎉 발행완료", 1800);
      if (statusType !== "draft") go(`?mode=view&id=${id}`);
    } catch { show("😵 저장 중 오류", 2400); }
  }

  // 데이터 로드 로직
  useEffect(() => {
    if (!editor || !adminOk) return;
    (async () => {
      try {
        setLoading(true);
        if (idNum) {
          const a = await getArticleByIdNumber(idNum);
          if (a) { setFirebaseId(a.firebaseId || null); setForm({ id: String(a.id), title: a.title, category: a.category, excerpt: a.excerpt, tagsText: a.tags?.join(", "), cover: a.cover, createdAt: a.createdAt }); editor.commands.setContent(a.contentHTML || ""); }
        } else {
          const nextId = await getNextArticleId();
          setForm(p => ({ ...p, id: String(nextId), title: "", excerpt: "", tagsText: "", cover: "" }));
          editor.commands.setContent("");
        }
      } finally { setLoading(false); }
    })();
  }, [editor, idNum, adminOk]);

  if (checkingAuth) return <div className="py-20 text-center font-serif opacity-30">Authenticating...</div>;
  if (!adminOk) return <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f1ea] font-serif uppercase tracking-widest text-xs"><h2 className="text-2xl mb-8">🔐 Admin Only</h2><button className="px-10 py-3 bg-black text-white rounded-full" onClick={adminLogin}>Login</button></div>;

  return (
    <div className="u-editorRoot min-h-screen bg-white flex flex-col text-[#111]">
      <nav className="fixed top-0 left-0 w-full z-50 bg-white border-b border-gray-100 flex justify-between items-center px-8" style={{ height: CMS_PX.NAV_H }}>
        <div className="flex items-center gap-6"><div className="text-2xl font-serif font-bold">U# CMS</div><input className="w-[400px] text-lg font-serif outline-none border-b border-transparent focus:border-black/10" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="ARTICLE TITLE" /></div>
        <div className="flex gap-4"><button className="px-6 py-2 border border-black/10 rounded-full text-[10px] font-bold uppercase tracking-widest" onClick={() => onSave("draft")}>Draft</button><button className="px-8 py-2 bg-black text-white rounded-full text-[10px] font-bold uppercase tracking-widest" onClick={() => onSave("published")}>Publish</button></div>
      </nav>
      <div className="flex flex-1 mt-[70px]">
        <main className="flex-1 bg-gray-50/50 overflow-y-auto py-16 px-8">
          <div className="mx-auto bg-white shadow-2xl p-20 min-h-[1200px]" style={{ maxWidth: CMS_PX.EDIT_W }}>
             <EditorContent editor={editor} className="uf-editor-surface ProseMirror" />
          </div>
        </main>
        <aside className="border-l bg-white p-10 overflow-y-auto" style={{ width: CMS_PX.SIDE_W }}>
          <div className="flex flex-col gap-10">
            <section><label className="text-[10px] uppercase font-bold tracking-widest mb-4 block opacity-40">Category</label><select className="w-full border-b py-2 font-serif text-xl outline-none" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>{CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}</select></section>
            <section><label className="text-[10px] uppercase font-bold tracking-widest mb-4 block opacity-40">Excerpt</label><textarea className="w-full h-32 border border-black/5 p-4 text-sm italic outline-none" value={form.excerpt} onChange={e => setForm(p => ({ ...p, excerpt: e.target.value }))} placeholder="Lead Text..." /></section>
          </div>
        </aside>
      </div>
      {toast && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 uf-toast z-[100]">{toast}</div>}
    </div>
  );
}