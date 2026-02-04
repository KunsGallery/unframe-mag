import { useEffect, useMemo, useRef, useState } from "react";
import { db, auth, googleProvider } from "./firebase";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

import { useEditor, EditorContent, Node, mergeAttributes, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Youtube from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";

// ✅ 너 환경에서는 named export (default 아님!)
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";


// ------------------------
// URL utils (?mode 유지)
// ------------------------
function useQuery() {
  const [qs, setQs] = useState(() => new URLSearchParams(window.location.search));
  useEffect(() => {
    const onPop = () => setQs(new URLSearchParams(window.location.search));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return qs;
}
function go(url) {
  window.history.pushState({}, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

// ------------------------
// Data normalize (스키마 고정)
// ------------------------
const DEFAULT_ARTICLE = {
  id: 0,
  title: "",
  category: "Exhibition",
  excerpt: "",
  contentHTML: "",
  cover: "",
  tags: [],
  status: "draft",
  createdAt: null,
  likes: 0,
  views: 0,
  mapEmbed: "",

  pollQuestion: "",
  pollOption1: "",
  pollOption2: "",
  pollVotes1: 0,
  pollVotes2: 0,
  pollFreeAnswer: "",
};

function normalizeArticle(raw = {}) {
  const a = { ...DEFAULT_ARTICLE, ...raw };
  a.id = Number(a.id || 0);
  a.title = String(a.title || "");
  a.category = String(a.category || "Exhibition");
  a.excerpt = String(a.excerpt || "");
  a.contentHTML = String(a.contentHTML || "");
  a.cover = String(a.cover || "");
  a.status = String(a.status || "draft");
  a.likes = Number(a.likes || 0);
  a.views = Number(a.views || 0);
  a.mapEmbed = String(a.mapEmbed || "");

  if (!Array.isArray(a.tags)) {
    if (typeof a.tags === "string") {
      a.tags = a.tags.split(",").map((t) => t.trim()).filter(Boolean);
    } else {
      a.tags = [];
    }
  }

  a.pollQuestion = String(a.pollQuestion || "");
  a.pollOption1 = String(a.pollOption1 || "");
  a.pollOption2 = String(a.pollOption2 || "");
  a.pollVotes1 = Number(a.pollVotes1 || 0);
  a.pollVotes2 = Number(a.pollVotes2 || 0);
  a.pollFreeAnswer = String(a.pollFreeAnswer || "");

  a.createdAt = raw.createdAt ?? null;
  return a;
}

function formatDate(createdAt) {
  try {
    if (!createdAt) return "N/A";
    if (createdAt?.seconds) return new Date(createdAt.seconds * 1000).toLocaleDateString("ko-KR");
    if (createdAt instanceof Date) return createdAt.toLocaleDateString("ko-KR");
    return "N/A";
  } catch {
    return "N/A";
  }
}

// ------------------------
// Admin / categories
// ------------------------
const ADMIN_EMAILS = [
  "gallerykuns@gmail.com",
  "cybog2004@gmail.com",
  "sylove887@gmail.com",
  "support@unframe.kr",
];
const CATEGORIES = ["Exhibition", "Project", "Artist Note", "News"];

// ------------------------
// TipTap: FontSize
// ------------------------
const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => el.style.fontSize?.replace("px", "") || null,
            renderHTML: (attrs) => {
              if (!attrs.fontSize) return {};
              return { style: `font-size: ${attrs.fontSize}px` };
            },
          },
        },
      },
    ];
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

// ------------------------
// TipTap: iframe wrapper (map embed 등)
// ------------------------
const IframeNode = Node.create({
  name: "iframe",
  group: "block",
  atom: true,
  addOptions() {
    return { allowFullscreen: true, HTMLAttributes: { class: "iframe-wrapper" } };
  },
  addAttributes() {
    return { src: { default: null }, width: { default: "100%" }, height: { default: "315" } };
  },
  parseHTML() {
    return [{ tag: "iframe" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      this.options.HTMLAttributes,
      ["iframe", mergeAttributes(HTMLAttributes, { frameborder: 0, allowfullscreen: "" })],
    ];
  },
});

// ------------------------
// ✅ TipTap: Column Nodes (Node 방식 2/3단)
// ------------------------
const Columns = Node.create({
  name: "columns",
  group: "block",
  content: "column{2,3}",
  defining: true,

  parseHTML() {
    return [{ tag: "div[data-columns]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-columns": "true",
        class: "u-columns",
      }),
      0,
    ];
  },
});

const Column = Node.create({
  name: "column",
  group: "block",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: "div[data-column]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-column": "true",
        class: "u-column",
      }),
      0,
    ];
  },
});

// ------------------------
// TipTap: Image width support
// ------------------------
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "100%",
        parseHTML: (el) => el.getAttribute("data-width") || "100%",
        renderHTML: (attrs) => ({
          "data-width": attrs.width || "100%",
          style: `width:${attrs.width || "100%"};height:auto;`,
        }),
      },
    };
  },
});

// ------------------------
// Upload helper (Netlify Function -> imgbb)
// ------------------------
async function uploadViaFunction(file) {
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch("/.netlify/functions/uploadCover", { method: "POST", body: fd });
  const data = await res.json();
  if (!data?.ok || !data?.url) throw new Error("upload failed");
  return data.url;
}

// ------------------------
// App
// ------------------------
export default function App() {
  const qs = useQuery();
  const mode = qs.get("mode") || "list";
  const idParam = qs.get("id") || "";

  // Auth
  const [user, setUser] = useState(null);
  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const handleGoogleLogin = async () => {
    await signInWithPopup(auth, googleProvider);
  };
  const handleLogout = async () => {
    await signOut(auth);
  };

  // Common
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // List / View
  const [list, setList] = useState([]);
  const [article, setArticle] = useState(null);

  // Filters
  const [searchText, setSearchText] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  // Comments (4.3)
  const [comments, setComments] = useState([]);
  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentHoneypot, setCommentHoneypot] = useState(""); // 봇용
  const [commentPosting, setCommentPosting] = useState(false);

  // Drafts / Editor
  const [draftList, setDraftList] = useState([]);
  const [editDocId, setEditDocId] = useState(null);

  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [form, setForm] = useState({
    ...DEFAULT_ARTICLE,
    id: 1,
    status: "draft",
    tagsText: "",
  });

  // -------------------------
  // Editor (TipTap)
  // -------------------------
  const editor = useEditor({
    extensions: [
      StarterKit,
      Columns,
      Column,

      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontSize,

      CustomImage.configure({ inline: false, allowBase64: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Youtube.configure({ controls: true }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Placeholder.configure({ placeholder: "당신의 영감을 이곳에 기록하세요..." }),

      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,

      IframeNode,
    ],
    content: "",
    editorProps: {
      handleDrop: async (_, event) => {
        const files = event?.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const file = files[0];
        if (!file.type.startsWith("image/")) return false;

        event.preventDefault();
        try {
          setUploadingImage(true);
          const url = await uploadViaFunction(file);
          editor?.chain().focus().setImage({ src: url, width: "100%" }).run();
        } catch (e) {
          console.error(e);
          alert("드래그 이미지 업로드 실패");
        } finally {
          setUploadingImage(false);
        }
        return true;
      },
      handlePaste: async (_, event) => {
        const items = event?.clipboardData?.items;
        if (!items) return false;

        for (const item of items) {
          if (item.type && item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (!file) continue;

            event.preventDefault();
            try {
              setUploadingImage(true);
              const url = await uploadViaFunction(file);
              editor?.chain().focus().setImage({ src: url, width: "100%" }).run();
            } catch (e) {
              console.error(e);
              alert("붙여넣기 이미지 업로드 실패");
            } finally {
              setUploadingImage(false);
            }
            return true;
          }
        }
        return false;
      },
    },
  });

  // -------------------------
  // Fetch list (published)
  // -------------------------
  const fetchList = async () => {
    setLoading(true);
    setErr("");
    try {
      const q = query(collection(db, "articles"), where("status", "==", "published"), orderBy("id", "desc"));
      const snap = await getDocs(q);
      setList(snap.docs.map((d) => ({ firebaseId: d.id, ...normalizeArticle(d.data()) })));
    } catch (e) {
      console.error(e);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // Fetch one published (view)
  // -------------------------
  const fetchOnePublished = async (id) => {
    if (!id) return;
    setLoading(true);
    setErr("");
    try {
      const q = query(
        collection(db, "articles"),
        where("status", "==", "published"),
        where("id", "==", Number(id)),
        limit(1)
      );
      const snap = await getDocs(q);
      setArticle(
        snap.empty ? null : { firebaseId: snap.docs[0].id, ...normalizeArticle(snap.docs[0].data()) }
      );
    } catch (e) {
      console.error(e);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // Comments
  // -------------------------
  const fetchComments = async (articleId) => {
    if (!articleId) return;
    try {
      const q = query(
        collection(db, "comments"),
        where("articleId", "==", Number(articleId)),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
  };

  // 클라 rate-limit: 15초
  const canPostComment = (articleId) => {
    const key = `comment_cd_${articleId}`;
    const last = Number(localStorage.getItem(key) || 0);
    const now = Date.now();
    if (now - last < 15000) return false;
    localStorage.setItem(key, String(now));
    return true;
  };

  const postComment = async () => {
    if (!article?.id) return;

    if ((commentHoneypot || "").trim() !== "") {
      alert("스팸으로 판단되어 차단되었습니다.");
      return;
    }

    const name = (commentName || "").trim().slice(0, 30);
    const text = (commentText || "").trim().slice(0, 500);

    if (!name || !text) return alert("이름/댓글 내용을 입력해줘!");
    if (!canPostComment(article.id)) return alert("잠시 후 다시 시도해줘! (15초 쿨다운)");

    try {
      setCommentPosting(true);
      await addDoc(collection(db, "comments"), {
        articleId: Number(article.id),
        name,
        text,
        createdAt: serverTimestamp(),
      });
      setCommentText("");
      await fetchComments(article.id);
      alert("댓글 등록 완료!");
    } catch (e) {
      console.error(e);
      alert("댓글 등록 실패(룰/인덱스 확인)");
    } finally {
      setCommentPosting(false);
    }
  };

  // -------------------------
  // Views + Likes
  // -------------------------
  const viewLockRef = useRef(false);
  const incrementView = async (firebaseDocId, articleId) => {
    try {
      if (viewLockRef.current) return;
      viewLockRef.current = true;

      const key = `viewed_${articleId}`;
      const last = Number(localStorage.getItem(key) || 0);
      const now = Date.now();
      const cooldown = 30 * 60 * 1000;

      if (now - last < cooldown) return;

      localStorage.setItem(key, String(now));
      await updateDoc(doc(db, "articles", firebaseDocId), { views: increment(1) });
      setArticle((prev) => (prev ? { ...prev, views: (prev.views || 0) + 1 } : prev));
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => {
        viewLockRef.current = false;
      }, 400);
    }
  };

  const handleLike = async () => {
    if (!article?.firebaseId || !article?.id) return;
    const likeKey = `liked_${article.id}`;
    if (localStorage.getItem(likeKey) === "1") return alert("이미 좋아요를 눌렀어요!");

    try {
      localStorage.setItem(likeKey, "1");
      await updateDoc(doc(db, "articles", article.firebaseId), { likes: increment(1) });
      setArticle((prev) => (prev ? { ...prev, likes: (prev.likes || 0) + 1 } : prev));
    } catch (e) {
      console.error(e);
      localStorage.removeItem(likeKey);
      alert("좋아요 실패");
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("링크를 복사했어요!");
    } catch {
      alert("복사 실패(브라우저 권한 확인)");
    }
  };

  // -------------------------
  // Drafts / Editor helpers
  // -------------------------
  const fetchDrafts = async () => {
    if (!isAdmin) return;
    try {
      const q = query(collection(db, "articles"), where("status", "==", "draft"), orderBy("id", "desc"));
      const snap = await getDocs(q);
      setDraftList(snap.docs.map((d) => ({ firebaseId: d.id, ...normalizeArticle(d.data()) })));
    } catch (e) {
      console.error(e);
      setErr(String(e?.message || e));
    }
  };

  const initNewArticle = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setErr("");
    try {
      const q = query(collection(db, "articles"), orderBy("id", "desc"), limit(1));
      const snap = await getDocs(q);
      let nextId = 1;
      if (!snap.empty) nextId = Number(snap.docs[0].data().id || 0) + 1;

      setEditDocId(null);
      setForm({ ...DEFAULT_ARTICLE, id: nextId, status: "draft", tagsText: "" });
      editor?.commands.setContent("");
    } catch (e) {
      console.error(e);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const loadForEdit = async (id) => {
    if (!isAdmin) return alert("관리자만 가능");
    if (!id) return;

    setLoading(true);
    setErr("");
    try {
      const q = query(collection(db, "articles"), where("id", "==", Number(id)), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) return alert("해당 글 없음");

      const docSnap = snap.docs[0];
      const data = normalizeArticle(docSnap.data());

      setEditDocId(docSnap.id);
      setForm({ ...data, tagsText: Array.isArray(data.tags) ? data.tags.join(", ") : "" });
      editor?.commands.setContent(data.contentHTML || "");
      alert(`불러오기 완료! (No.${data.id})`);
    } catch (e) {
      console.error(e);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const handleCoverUpload = async (file) => {
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await uploadViaFunction(file);
      setForm((p) => ({ ...p, cover: url }));
    } catch (e) {
      console.error(e);
      alert("커버 업로드 실패");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleBodyImageUpload = async (file) => {
    if (!file || !editor) return;
    setUploadingImage(true);
    try {
      const url = await uploadViaFunction(file);
      editor.chain().focus().setImage({ src: url, width: "100%" }).run();
    } catch (e) {
      console.error(e);
      alert("본문 이미지 업로드 실패");
    } finally {
      setUploadingImage(false);
    }
  };

  // Editor actions
  const setLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href;
    const url = prompt("링크 URL을 입력하세요", prev || "https://");
    if (url === null) return;
    if (url.trim() === "") return editor.chain().focus().extendMarkRange("link").unsetLink().run();
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const addYoutube = () => {
    if (!editor) return;
    const url = prompt("YouTube URL을 붙여넣으세요");
    if (!url) return;
    editor.chain().focus().setYoutubeVideo({ src: url, width: 800, height: 450 }).run();
  };

  const insertTable = () => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  // ✅ Node 기반 2/3단 삽입
  const insertTwoColumns = () => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "columns",
        content: [
          { type: "column", content: [{ type: "paragraph" }] },
          { type: "column", content: [{ type: "paragraph" }] },
        ],
      })
      .run();
  };

  const insertThreeColumns = () => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "columns",
        content: [
          { type: "column", content: [{ type: "paragraph" }] },
          { type: "column", content: [{ type: "paragraph" }] },
          { type: "column", content: [{ type: "paragraph" }] },
        ],
      })
      .run();
  };

  const setImageSize = (w) => {
    if (!editor) return;
    editor.chain().focus().updateAttributes("image", { width: w }).run();
  };

  // Save
  const savePost = async (statusType) => {
    if (!isAdmin) return alert("관리자만 저장/발행 가능");
    if (!editor) return alert("에디터 로딩 중...");
    if (!String(form.title || "").trim()) return alert("제목은 필수!");

    setLoading(true);
    setErr("");

    const tags = (form.tagsText || "").split(",").map((t) => t.trim()).filter(Boolean);

    try {
      if (!editDocId) {
        const payload = {
          ...DEFAULT_ARTICLE,
          id: Number(form.id),
          title: String(form.title || "").trim(),
          category: form.category,
          excerpt: String(form.excerpt || "").trim(),
          status: statusType,
          contentHTML: editor.getHTML(),
          cover: form.cover || "",
          tags,
          mapEmbed: form.mapEmbed || "",
          createdAt: serverTimestamp(),
          likes: 0,
          views: 0,
          pollQuestion: form.pollQuestion || "",
          pollOption1: form.pollOption1 || "",
          pollOption2: form.pollOption2 || "",
          pollVotes1: Number(form.pollVotes1 || 0),
          pollVotes2: Number(form.pollVotes2 || 0),
          pollFreeAnswer: form.pollFreeAnswer || "",
        };

        const docRef = await addDoc(collection(db, "articles"), payload);
        setEditDocId(docRef.id);

        alert(statusType === "published" ? "발행 완료!" : "임시저장 완료!");
        await fetchDrafts();
        await fetchList();
        if (statusType === "published") go(`/?mode=view&id=${form.id}`);
        return;
      }

      const current = await getDoc(doc(db, "articles", editDocId));
      const currentData = current.exists() ? normalizeArticle(current.data()) : normalizeArticle({});

      const payload = {
        ...DEFAULT_ARTICLE,
        ...currentData,
        id: Number(form.id),
        title: String(form.title || "").trim(),
        category: form.category,
        excerpt: String(form.excerpt || "").trim(),
        status: statusType,
        contentHTML: editor.getHTML(),
        cover: form.cover || "",
        tags,
        mapEmbed: form.mapEmbed || "",
        createdAt: currentData.createdAt ?? form.createdAt ?? null,
        likes: currentData.likes ?? 0,
        views: currentData.views ?? 0,
        pollQuestion: form.pollQuestion || "",
        pollOption1: form.pollOption1 || "",
        pollOption2: form.pollOption2 || "",
        pollVotes1: Number(form.pollVotes1 || 0),
        pollVotes2: Number(form.pollVotes2 || 0),
        pollFreeAnswer: form.pollFreeAnswer || "",
      };

      await updateDoc(doc(db, "articles", editDocId), payload);
      setForm((p) => ({ ...p, createdAt: payload.createdAt }));

      alert(statusType === "published" ? "재발행 완료!" : "수정 저장 완료!");
      await fetchDrafts();
      await fetchList();
      if (statusType === "published") go(`/?mode=view&id=${form.id}`);
    } catch (e) {
      console.error(e);
      setErr(String(e?.message || e));
      alert("저장 실패(룰/인덱스/권한 확인)");
    } finally {
      setLoading(false);
    }
  };

  // Poll vote
  const handleVote = async (option) => {
    if (!article?.firebaseId || !article?.id) return;
    const key = `voted_${article.id}`;
    if (localStorage.getItem(key) === "1") return alert("이미 투표했어요!");

    const field = option === 1 ? "pollVotes1" : "pollVotes2";
    try {
      localStorage.setItem(key, "1");
      await updateDoc(doc(db, "articles", article.firebaseId), { [field]: increment(1) });
      setArticle((prev) => (prev ? { ...prev, [field]: Number(prev[field] || 0) + 1 } : prev));
      alert("투표 완료!");
    } catch (e) {
      console.error(e);
      localStorage.removeItem(key);
      alert("투표 실패");
    }
  };

  // -------------------------
  // Mode effects
  // -------------------------
  useEffect(() => {
    if (mode === "list") fetchList();
    if (mode === "view") fetchOnePublished(idParam);
    if (mode === "editor") {
      if (isAdmin && editor) {
        initNewArticle();
        fetchDrafts();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, idParam, isAdmin, editor]);

  useEffect(() => {
    if (mode !== "view") return;
    if (!article?.firebaseId || !article?.id) return;

    incrementView(article.firebaseId, article.id);
    fetchComments(article.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, article?.firebaseId, article?.id]);

  // list filtering
  const filteredList = useMemo(() => {
    const s = searchText.trim().toLowerCase();
    const t = tagFilter.trim().toLowerCase();

    return list.filter((a) => {
      const inTag =
        !t ||
        (Array.isArray(a.tags) && a.tags.some((x) => String(x).toLowerCase() === t)) ||
        String(a.category || "").toLowerCase().includes(t);

      if (!inTag) return false;
      if (!s) return true;

      const hay = [a.title, a.excerpt, a.category, ...(Array.isArray(a.tags) ? a.tags : [])]
        .join(" ")
        .toLowerCase();

      return hay.includes(s);
    });
  }, [list, searchText, tagFilter]);

  // header
  const header = useMemo(() => {
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="text-xs tracking-[0.35em] uppercase opacity-70">UNFRAME</div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => go("/?mode=list")}
            className="px-4 py-2 rounded-full border border-white/20 hover:border-white/50"
          >
            LIST
          </button>
          <button
            onClick={() => go("/?mode=editor")}
            className="px-4 py-2 rounded-full border border-white/20 hover:border-white/50"
          >
            WRITE
          </button>

          {user ? (
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-full bg-white text-black font-bold hover:opacity-90"
              title={user.email || ""}
            >
              LOGOUT
            </button>
          ) : (
            <button
              onClick={handleGoogleLogin}
              className="px-4 py-2 rounded-full bg-white text-black font-bold hover:opacity-90"
            >
              SIGN IN
            </button>
          )}
        </div>
      </div>
    );
  }, [user]);

  // UI
  return (
    <div className="min-h-screen bg-black text-white">
      {/* 최소 스타일(표/iframe/컬럼/이미지) */}
      <style>{`
        .ProseMirror table { border-collapse: collapse; width: 100%; margin: 16px 0; }
        .ProseMirror td, .ProseMirror th { border: 1px solid rgba(255,255,255,0.2); padding: 10px; vertical-align: top; }
        .ProseMirror th { background: rgba(255,255,255,0.06); font-weight: 700; }
        .ProseMirror img { display:block; margin: 16px auto; max-width:100%; height:auto; }
        .iframe-wrapper{ position:relative; width:100%; padding-bottom:56.25%; height:0; margin:16px 0; background:#111; border-radius:16px; overflow:hidden; }
        .iframe-wrapper iframe{ position:absolute; top:0; left:0; width:100%; height:100%; border:0; }

        /* ✅ Node-based columns */
        .u-columns { display:flex; gap:24px; align-items:flex-start; margin:24px 0; }
        .u-column { flex:1; min-width:0; }
        @media (max-width: 768px) { .u-columns { flex-direction: column; } }
      `}</style>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {header}

        <div className="mt-10 rounded-3xl border border-white/15 bg-white/5 p-8">
          {loading && <div className="text-white/70">Loading…</div>}
          {err && (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {err}
            </div>
          )}

          {/* LIST */}
          {mode === "list" && (
            <>
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div>
                  <h1 className="text-4xl font-bold">List</h1>
                  <p className="mt-3 text-white/70">published 글만 노출됩니다. (검색/태그 필터)</p>
                </div>

                <div className="flex flex-col md:flex-row gap-3 md:items-center">
                  <input
                    className="w-full md:w-80 bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none"
                    placeholder="검색: 제목/요약/태그"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                  <button
                    className="px-4 py-3 rounded-xl border border-white/15 hover:border-white/40"
                    onClick={() => {
                      setSearchText("");
                      setTagFilter("");
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>

              {tagFilter && (
                <div className="mt-4 text-sm text-white/70">
                  필터: <span className="font-bold">#{tagFilter}</span>{" "}
                  <button className="ml-2 text-xs underline" onClick={() => setTagFilter("")}>
                    해제
                  </button>
                </div>
              )}

              <div className="mt-8 space-y-4">
                {filteredList.length === 0 && !loading ? (
                  <div className="text-white/60">조건에 맞는 글이 없어요.</div>
                ) : (
                  filteredList.map((a) => (
                    <div
                      key={a.firebaseId}
                      className="rounded-2xl border border-white/15 p-6 bg-white/5 flex flex-col md:flex-row gap-6"
                    >
                      <div className="flex-1">
                        <div className="text-xs uppercase tracking-[0.25em] text-white/60">
                          No. {a.id} • {a.category}
                        </div>

                        <div className="mt-2 text-2xl font-bold">{a.title || "(No Title)"}</div>
                        <div className="mt-2 text-white/70 line-clamp-2">{a.excerpt || ""}</div>

                        <div className="mt-3 text-xs text-white/50 flex flex-wrap gap-4">
                          <span>📅 {formatDate(a.createdAt)}</span>
                          <span>👁 {a.views ?? 0}</span>
                          <span>♥ {a.likes ?? 0}</span>
                        </div>

                        {Array.isArray(a.tags) && a.tags.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {a.tags.slice(0, 10).map((t) => (
                              <button
                                key={t}
                                onClick={() => setTagFilter(String(t))}
                                className="text-xs px-3 py-1 rounded-full border border-white/15 bg-white/5 text-white/70 hover:border-white/40"
                              >
                                #{t}
                              </button>
                            ))}
                          </div>
                        )}

                        <button
                          className="mt-5 inline-flex items-center gap-2 text-sm border-b border-white/40 hover:border-white"
                          onClick={() => go(`/?mode=view&id=${a.id}`)}
                        >
                          Read the story →
                        </button>
                      </div>

                      {a.cover ? (
                        <div
                          className="w-full md:w-56 h-40 rounded-2xl overflow-hidden border border-white/10 bg-black/40 cursor-pointer"
                          onClick={() => go(`/?mode=view&id=${a.id}`)}
                        >
                          <img src={a.cover} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* VIEW */}
          {mode === "view" && (
            <>
              <div className="flex items-center justify-between gap-4">
                <h1 className="text-4xl font-bold">View</h1>
                <button
                  className="px-5 py-2 rounded-full bg-white text-black font-bold hover:opacity-90"
                  onClick={() => go("/?mode=list")}
                >
                  Back
                </button>
              </div>

              {!loading && !article && <div className="mt-8 text-white/60">해당 글을 찾지 못했어요.</div>}

              {article && (
                <div className="mt-8">
                  {article.cover ? (
                    <div className="rounded-3xl overflow-hidden border border-white/10 bg-black/40 mb-8">
                      <img src={article.cover} alt="" className="w-full max-h-[520px] object-cover" />
                    </div>
                  ) : null}

                  <div className="text-xs uppercase tracking-[0.25em] text-white/60">
                    No. {article.id} • {article.category}
                  </div>
                  <div className="mt-3 text-4xl font-bold">{article.title}</div>
                  <div className="mt-4 text-white/70 italic">{article.excerpt}</div>

                  <div className="mt-4 text-xs text-white/50 flex flex-wrap gap-4">
                    <span>📅 {formatDate(article.createdAt)}</span>
                    <span>👁 {article.views ?? 0}</span>
                    <span>♥ {article.likes ?? 0}</span>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <button
                      onClick={handleLike}
                      className="px-5 py-2 rounded-full border border-white/15 hover:border-white/40"
                    >
                      ♥ Like
                    </button>
                    <button
                      onClick={handleShare}
                      className="px-5 py-2 rounded-full border border-white/15 hover:border-white/40"
                    >
                      Share
                    </button>
                  </div>

                  {/* Body */}
                  <div className="mt-10 rounded-2xl border border-white/15 bg-white/5 p-6">
                    <div
                      className="leading-relaxed text-white/90"
                      dangerouslySetInnerHTML={{ __html: article.contentHTML || "" }}
                    />
                  </div>

                  {/* Map */}
                  {article.mapEmbed && (
                    <div className="mt-10 rounded-2xl border border-white/15 bg-white/5 p-6">
                      <div className="text-lg font-bold mb-4">📍 Location</div>
                      <div dangerouslySetInnerHTML={{ __html: article.mapEmbed }} />
                    </div>
                  )}

                  {/* Poll */}
                  {article.pollQuestion && (
                    <div className="mt-10 rounded-2xl border border-white/15 bg-white/5 p-6">
                      <div className="text-lg font-bold mb-4">🗳 {article.pollQuestion}</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button
                          className="p-4 rounded-xl border border-white/15 hover:border-white/40 text-left"
                          onClick={() => handleVote(1)}
                        >
                          <div className="font-bold">{article.pollOption1}</div>
                          <div className="text-xs text-white/60 mt-1">votes: {article.pollVotes1}</div>
                        </button>
                        <button
                          className="p-4 rounded-xl border border-white/15 hover:border-white/40 text-left"
                          onClick={() => handleVote(2)}
                        >
                          <div className="font-bold">{article.pollOption2}</div>
                          <div className="text-xs text-white/60 mt-1">votes: {article.pollVotes2}</div>
                        </button>
                      </div>
                      {article.pollFreeAnswer && (
                        <div className="text-xs text-white/60 mt-4 italic">{article.pollFreeAnswer}</div>
                      )}
                    </div>
                  )}

                  {/* Comments */}
                  <div className="mt-12 rounded-2xl border border-white/15 bg-white/5 p-6">
                    <div className="text-lg font-bold mb-6">💬 Comments ({comments.length})</div>

                    <div className="space-y-4 mb-8">
                      {comments.length === 0 ? (
                        <div className="text-white/60">아직 댓글이 없어요.</div>
                      ) : (
                        comments.map((c) => (
                          <div key={c.id} className="rounded-xl border border-white/10 bg-black/30 p-4">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-bold">{c.name}</div>
                              <div className="text-[11px] text-white/40">{formatDate(c.createdAt)}</div>
                            </div>
                            <div className="text-sm text-white/85 mt-2 whitespace-pre-wrap">{c.text}</div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* honeypot */}
                    <input
                      value={commentHoneypot}
                      onChange={(e) => setCommentHoneypot(e.target.value)}
                      className="hidden"
                      tabIndex={-1}
                      autoComplete="off"
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none"
                        placeholder="이름 (최대 30자)"
                        value={commentName}
                        maxLength={30}
                        onChange={(e) => setCommentName(e.target.value)}
                      />
                      <input
                        className="md:col-span-2 bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none"
                        placeholder="댓글 내용 (최대 500자)"
                        value={commentText}
                        maxLength={500}
                        onChange={(e) => setCommentText(e.target.value)}
                      />
                    </div>

                    <button
                      disabled={commentPosting}
                      onClick={postComment}
                      className={`mt-3 w-full md:w-auto px-6 py-3 rounded-xl font-bold ${
                        commentPosting ? "bg-white/40 text-black cursor-not-allowed" : "bg-white text-black hover:opacity-90"
                      }`}
                    >
                      {commentPosting ? "등록 중..." : "댓글 등록"}
                    </button>

                    <div className="mt-3 text-[11px] text-white/50">
                      * 동일 글에 15초 이내 연속 등록은 제한됩니다.
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* EDITOR */}
          {mode === "editor" && (
            <>
              {!user && (
                <div className="text-center py-10">
                  <h1 className="text-4xl font-bold">UNFRAME Editor</h1>
                  <p className="mt-4 text-white/70">관리자 로그인 후 작성할 수 있어요.</p>
                  <button
                    onClick={handleGoogleLogin}
                    className="mt-8 px-6 py-3 rounded-full bg-white text-black font-bold hover:opacity-90"
                  >
                    Sign in with Google
                  </button>
                </div>
              )}

              {user && !isAdmin && (
                <div className="text-center py-10">
                  <h1 className="text-4xl font-bold">Access Denied</h1>
                  <p className="mt-4 text-white/70">
                    이 계정(<b>{user.email}</b>)은 관리자 화이트리스트에 없어요.
                  </p>
                  <button
                    onClick={handleLogout}
                    className="mt-8 px-6 py-3 rounded-full bg-white text-black font-bold hover:opacity-90"
                  >
                    Logout
                  </button>
                </div>
              )}

              {user && isAdmin && (
                <div className="py-2">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <h1 className="text-4xl font-bold">Editor</h1>
                      <p className="mt-2 text-white/70">
                        ✅ 컬럼은 Node 방식(안정) · 이미지 드래그/붙여넣기/업로드 지원
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={initNewArticle}
                        className="px-5 py-2 rounded-full border border-white/20 hover:border-white/50"
                      >
                        New
                      </button>
                      <button
                        onClick={() => {
                          const id = prompt("불러올 글 ID(No.)를 입력하세요");
                          if (id) loadForEdit(id);
                        }}
                        className="px-5 py-2 rounded-full border border-white/20 hover:border-white/50"
                      >
                        Load by ID
                      </button>
                      <button
                        onClick={fetchDrafts}
                        className="px-5 py-2 rounded-full border border-white/20 hover:border-white/50"
                      >
                        Refresh Drafts
                      </button>
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                          <div className="text-xs uppercase tracking-[0.25em] text-white/60 mb-2">No.</div>
                          <input
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none"
                            value={form.id}
                            readOnly
                          />
                          <div className="mt-2 text-[11px] text-white/50">
                            {editDocId ? "편집 중(기존 글)" : "새 글"}
                          </div>
                          <div className="mt-2 text-[11px] text-white/50">
                            createdAt: {formatDate(form.createdAt)}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/15 bg-white/5 p-4 md:col-span-2">
                          <div className="text-xs uppercase tracking-[0.25em] text-white/60 mb-2">Category</div>
                          <select
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none"
                            value={form.category}
                            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        <div className="rounded-2xl border border-white/15 bg-white/5 p-4 md:col-span-3">
                          <div className="text-xs uppercase tracking-[0.25em] text-white/60 mb-2">Title</div>
                          <input
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none"
                            value={form.title}
                            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                            placeholder="제목"
                          />
                        </div>

                        <div className="rounded-2xl border border-white/15 bg-white/5 p-4 md:col-span-3">
                          <div className="text-xs uppercase tracking-[0.25em] text-white/60 mb-2">Excerpt</div>
                          <input
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none"
                            value={form.excerpt}
                            onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
                            placeholder="요약 문구"
                          />
                        </div>

                        <div className="rounded-2xl border border-white/15 bg-white/5 p-4 md:col-span-3">
                          <div className="text-xs uppercase tracking-[0.25em] text-white/60 mb-2">Tags</div>
                          <input
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none"
                            value={form.tagsText || ""}
                            onChange={(e) => setForm((p) => ({ ...p, tagsText: e.target.value }))}
                            placeholder="예: test, 전시, 서울"
                          />
                          <div className="mt-2 text-[11px] text-white/50">콤마(,)로 구분</div>
                        </div>

                        {/* Cover */}
                        <div className="rounded-2xl border border-white/15 bg-white/5 p-4 md:col-span-3">
                          <div className="text-xs uppercase tracking-[0.25em] text-white/60 mb-3">Cover Image</div>
                          <div className="flex flex-col md:flex-row gap-4 items-start">
                            <label className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-black font-bold hover:opacity-90 cursor-pointer">
                              {uploadingCover ? "Uploading..." : "Upload Cover"}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleCoverUpload(e.target.files?.[0])}
                              />
                            </label>

                            {form.cover ? (
                              <div className="w-full md:w-80 rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                                <img src={form.cover} alt="" className="w-full h-48 object-cover" />
                              </div>
                            ) : (
                              <div className="text-white/50 text-sm mt-2">커버 업로드하면 미리보기가 떠요.</div>
                            )}
                          </div>
                        </div>

                        {/* Map embed */}
                        <div className="rounded-2xl border border-white/15 bg-white/5 p-4 md:col-span-3">
                          <div className="text-xs uppercase tracking-[0.25em] text-white/60 mb-2">Google Map iframe</div>
                          <textarea
                            className="w-full min-h-[110px] bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none text-sm"
                            value={form.mapEmbed || ""}
                            onChange={(e) => setForm((p) => ({ ...p, mapEmbed: e.target.value }))}
                            placeholder="<iframe ...></iframe> 코드를 붙여넣기"
                          />
                        </div>

                        {/* Poll */}
                        <div className="rounded-2xl border border-white/15 bg-white/5 p-4 md:col-span-3">
                          <div className="text-xs uppercase tracking-[0.25em] text-white/60 mb-3">Poll</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input
                              className="md:col-span-2 bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none"
                              placeholder="질문"
                              value={form.pollQuestion || ""}
                              onChange={(e) => setForm((p) => ({ ...p, pollQuestion: e.target.value }))}
                            />
                            <input
                              className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none"
                              placeholder="옵션 1"
                              value={form.pollOption1 || ""}
                              onChange={(e) => setForm((p) => ({ ...p, pollOption1: e.target.value }))}
                            />
                            <input
                              className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none"
                              placeholder="옵션 2"
                              value={form.pollOption2 || ""}
                              onChange={(e) => setForm((p) => ({ ...p, pollOption2: e.target.value }))}
                            />
                            <input
                              className="md:col-span-2 bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none"
                              placeholder="보조 텍스트"
                              value={form.pollFreeAnswer || ""}
                              onChange={(e) => setForm((p) => ({ ...p, pollFreeAnswer: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Toolbar */}
                      <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4">
                        <div className="flex flex-wrap gap-2 items-center">
                          <button className="px-3 py-2 rounded-lg border border-white/15 hover:border-white/40" onClick={() => editor?.chain().focus().toggleBold().run()}>
                            Bold
                          </button>
                          <button className="px-3 py-2 rounded-lg border border-white/15 hover:border-white/40" onClick={() => editor?.chain().focus().toggleItalic().run()}>
                            Italic
                          </button>

                          <select
                            className="px-3 py-2 rounded-lg bg-black/40 border border-white/10"
                            defaultValue=""
                            onChange={(e) => {
                              const v = e.target.value;
                              if (!v) return;
                              editor?.chain().focus().setFontSize(v).run();
                              e.target.value = "";
                            }}
                          >
                            <option value="" disabled>Font Size</option>
                            <option value="14">14px</option>
                            <option value="16">16px</option>
                            <option value="20">20px</option>
                            <option value="24">24px</option>
                            <option value="30">30px</option>
                          </select>

                          <input
                            type="color"
                            onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
                            className="w-10 h-10 rounded border border-white/15 bg-transparent"
                            title="Text Color"
                          />

                          <button className="px-3 py-2 rounded-lg border border-white/15 hover:border-white/40" onClick={() => editor?.chain().focus().toggleHighlight().run()}>
                            Highlight
                          </button>

                          <button className="px-3 py-2 rounded-lg border border-white/15 hover:border-white/40" onClick={() => editor?.chain().focus().setTextAlign("left").run()}>
                            Left
                          </button>
                          <button className="px-3 py-2 rounded-lg border border-white/15 hover:border-white/40" onClick={() => editor?.chain().focus().setTextAlign("center").run()}>
                            Center
                          </button>
                          <button className="px-3 py-2 rounded-lg border border-white/15 hover:border-white/40" onClick={() => editor?.chain().focus().setTextAlign("right").run()}>
                            Right
                          </button>

                          <button className={`px-3 py-2 rounded-lg border ${editor?.isActive("link") ? "border-white/60" : "border-white/15"} hover:border-white/40`} onClick={setLink}>
                            Link
                          </button>

                          <label className="px-3 py-2 rounded-lg border border-white/15 hover:border-white/40 cursor-pointer">
                            {uploadingImage ? "Uploading..." : "Upload Image"}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleBodyImageUpload(e.target.files?.[0])} />
                          </label>

                          <button className="px-3 py-2 rounded-lg border border-white/15 hover:border-white/40" onClick={addYoutube}>
                            YouTube
                          </button>

                          <button className="px-3 py-2 rounded-lg border border-white/15 hover:border-white/40" onClick={insertTable}>
                            Table
                          </button>

                          <button className="px-3 py-2 rounded-lg border border-white/15 hover:border-white/40" onClick={insertTwoColumns}>
                            2 Col
                          </button>
                          <button className="px-3 py-2 rounded-lg border border-white/15 hover:border-white/40" onClick={insertThreeColumns}>
                            3 Col
                          </button>

                          <div className="mx-2 h-6 w-px bg-white/15" />

                          <button className="px-3 py-2 rounded-lg border border-white/15 hover:border-white/40" onClick={() => setImageSize("100%")}>
                            Img 100
                          </button>
                          <button className="px-3 py-2 rounded-lg border border-white/15 hover:border-white/40" onClick={() => setImageSize("50%")}>
                            Img 50
                          </button>
                          <button className="px-3 py-2 rounded-lg border border-white/15 hover:border-white/40" onClick={() => setImageSize("25%")}>
                            Img 25
                          </button>

                          <div className="mx-2 h-6 w-px bg-white/15" />

                          <button className="px-3 py-2 rounded-lg border border-white/15 hover:border-white/40" onClick={() => editor?.chain().focus().undo().run()}>
                            Undo
                          </button>
                          <button className="px-3 py-2 rounded-lg border border-white/15 hover:border-white/40" onClick={() => editor?.chain().focus().redo().run()}>
                            Redo
                          </button>
                        </div>
                        <div className="mt-3 text-[11px] text-white/50">
                          * 2/3단은 Node 기반이라 편집 안정성이 좋아요.
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-white/15 bg-white/5 p-4">
                        <div className="text-xs uppercase tracking-[0.25em] text-white/60 mb-3">Body</div>
                        <div className="min-h-[360px] rounded-xl border border-white/10 bg-black/30 p-4">
                          <EditorContent editor={editor} />
                        </div>
                      </div>

                      <div className="mt-6 flex flex-col md:flex-row gap-3">
                        <button onClick={() => savePost("draft")} className="w-full md:w-auto px-6 py-3 rounded-full border border-white/20 hover:border-white/50">
                          Save Draft
                        </button>
                        <button onClick={() => savePost("published")} className="w-full md:w-auto px-6 py-3 rounded-full bg-white text-black font-bold hover:opacity-90">
                          Publish
                        </button>
                      </div>
                    </div>

                    {/* Draft Sidebar */}
                    <div className="lg:col-span-4">
                      <div className="rounded-3xl border border-white/15 bg-white/5 p-5 sticky top-6">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-bold">Draft Articles</div>
                          <button onClick={fetchDrafts} className="text-xs px-3 py-1 rounded-full border border-white/20 hover:border-white/50">
                            Refresh
                          </button>
                        </div>

                        <div className="mt-4 space-y-3 max-h-[560px] overflow-auto pr-1">
                          {draftList.length === 0 ? (
                            <div className="text-white/50 text-sm py-10 text-center">No drafts found.</div>
                          ) : (
                            draftList.map((d) => (
                              <button
                                key={d.firebaseId}
                                onClick={() => loadForEdit(d.id)}
                                className="w-full text-left rounded-2xl border border-white/10 bg-black/30 hover:bg-black/40 p-4 transition"
                              >
                                <div className="text-xs uppercase tracking-[0.2em] text-white/50">
                                  No. {d.id} • {d.category}
                                </div>
                                <div className="mt-1 font-bold truncate">{d.title || "(No Title)"}</div>
                                <div className="mt-1 text-xs text-white/50">createdAt: {formatDate(d.createdAt)}</div>
                              </button>
                            ))
                          )}
                        </div>

                        <div className="mt-4 text-[11px] text-white/50">* draft 클릭 → 바로 불러오기</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
