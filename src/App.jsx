import { useEffect, useMemo, useState } from "react";
import { db, auth, googleProvider } from "./firebase";

import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  getDoc,
} from "firebase/firestore";

import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

// ------------------------
// Utils
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

const ADMIN_EMAILS = [
  "gallerykuns@gmail.com",
  "cybog2004@gmail.com",
  "sylove887@gmail.com",
  "support@unframe.kr",
];

const CATEGORIES = ["Exhibition", "Project", "Artist Note", "News"];

const IMGBB_KEY = import.meta.env.VITE_IMGBB_KEY;

// ------------------------
// App
// ------------------------
export default function App() {
  const qs = useQuery();
  const mode = qs.get("mode") || "list";
  const idParam = qs.get("id") || "";

  // -------------------------
  // Auth
  // -------------------------
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

  // -------------------------
  // Data: list/view
  // -------------------------
  const [list, setList] = useState([]);
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [err, setErr] = useState("");

  const fetchList = async () => {
    setLoading(true);
    setErr("");
    try {
      const q = query(
        collection(db, "articles"),
        where("status", "==", "published"),
        orderBy("id", "desc")
      );
      const snap = await getDocs(q);
      setList(snap.docs.map((d) => ({ firebaseId: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const fetchOnePublished = async (id) => {
    if (!id) return;
    setLoading(true);
    setErr("");
    try {
      // ✅ Rules에 맞게 published 조건 포함
      const q = query(
        collection(db, "articles"),
        where("status", "==", "published"),
        where("id", "==", Number(id)),
        limit(1)
      );
      const snap = await getDocs(q);
      setArticle(snap.empty ? null : { firebaseId: snap.docs[0].id, ...snap.docs[0].data() });
    } catch (e) {
      console.error(e);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === "list") fetchList();
    if (mode === "view") fetchOnePublished(idParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, idParam]);

  // -------------------------
  // Editor (Admin)
  // -------------------------
  const [editDocId, setEditDocId] = useState(null); // Firestore docId

  const [form, setForm] = useState({
    id: 1,
    title: "",
    category: "Exhibition",
    excerpt: "",
    status: "draft",
    cover: "",
    tagsText: "", // 콤마로 입력 -> tags 배열로 저장
    createdAt: null, // Firestore Timestamp or null (로드 시 채움)
  });

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
  });

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
      setForm({
        id: nextId,
        title: "",
        category: "Exhibition",
        excerpt: "",
        status: "draft",
        cover: "",
        tagsText: "",
        createdAt: null,
      });
      editor?.commands.setContent("");
    } catch (e) {
      console.error(e);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  // editor 모드에서 관리자면 기본 새 글 세팅
  useEffect(() => {
    if (mode !== "editor") return;
    if (!isAdmin) return;
    if (!editor) return;
    initNewArticle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, isAdmin, editor]);

  // ✅ 관리자: 기존 글 불러오기(드래프트/발행 상관없이)
  const loadForEdit = async (id) => {
    if (!isAdmin) return alert("관리자만 불러올 수 있어요.");
    if (!id) return alert("불러올 id를 입력해줘.");
    setLoading(true);
    setErr("");
    try {
      const q = query(collection(db, "articles"), where("id", "==", Number(id)), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) {
        alert("해당 id 글이 없습니다.");
        return;
      }

      const docSnap = snap.docs[0];
      const data = docSnap.data();

      setEditDocId(docSnap.id);
      setForm({
        id: Number(data.id ?? id),
        title: data.title ?? "",
        category: data.category ?? "Exhibition",
        excerpt: data.excerpt ?? "",
        status: data.status ?? "draft",
        cover: data.cover ?? "",
        tagsText: Array.isArray(data.tags) ? data.tags.join(", ") : "",
        createdAt: data.createdAt ?? null,
      });

      editor?.commands.setContent(data.contentHTML || "");
      alert(`불러오기 완료! (No.${data.id})`);
    } catch (e) {
      console.error(e);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  // ✅ imgbb 커버 업로드
  const handleCoverUpload = async (file) => {
    if (!file) return;
    if (!IMGBB_KEY) return alert("VITE_IMGBB_KEY가 설정되지 않았어요 (.env / Netlify env 확인)");

    setUploadingCover(true);
    setErr("");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      const url = data?.data?.url;

      if (!url) {
        console.error("imgbb response:", data);
        alert("커버 업로드 실패(응답에 url 없음)");
        return;
      }

      setForm((p) => ({ ...p, cover: url }));
    } catch (e) {
      console.error(e);
      alert("커버 업로드 실패");
    } finally {
      setUploadingCover(false);
    }
  };

  // ✅ 저장/발행
  const savePost = async (statusType) => {
    if (!isAdmin) return alert("관리자만 저장/발행할 수 있어요.");
    if (!form.title.trim()) return alert("제목은 필수!");
    if (!editor) return alert("에디터 로딩 중...");

    setLoading(true);
    setErr("");

    const tags = (form.tagsText || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (!editDocId) {
        // CREATE: createdAt 최초 1회 저장
        const payload = {
          id: Number(form.id),
          title: form.title.trim(),
          category: form.category,
          excerpt: form.excerpt.trim(),
          status: statusType,
          contentHTML: editor.getHTML(),

          createdAt: serverTimestamp(),

          cover: form.cover || "",
          tags,

          likes: 0,
          views: 0,
          mapEmbed: "",
        };

        const docRef = await addDoc(collection(db, "articles"), payload);
        setEditDocId(docRef.id);

        alert(statusType === "published" ? "발행 완료!" : "임시저장 완료!");
        if (statusType === "published") go(`/?mode=view&id=${form.id}`);
        return;
      }

      // UPDATE: createdAt은 절대 건드리지 않기(필드에서 아예 제외)
      const payload = {
        id: Number(form.id),
        title: form.title.trim(),
        category: form.category,
        excerpt: form.excerpt.trim(),
        status: statusType,
        contentHTML: editor.getHTML(),

        cover: form.cover || "",
        tags,

      // ✅ 절대 유지해야 하는 것들
      createdAt: currentData.createdAt ?? form.createdAt ?? null,
      likes: currentData.likes ?? 0,
      views: currentData.views ?? 0,
    };

      const current = await getDoc(doc(db, "articles", editDocId));
      const currentData = current.exists() ? current.data() : {};
      await updateDoc(doc(db, "articles", editDocId), payload);

      alert(statusType === "published" ? "재발행 완료!" : "수정 저장 완료!");
      if (statusType === "published") go(`/?mode=view&id=${form.id}`);
    } catch (e) {
      console.error(e);
      setErr(String(e?.message || e));
      alert("저장 실패(권한/인덱스/룰 확인)");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // Header
  // -------------------------
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
            EDITOR
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

  // -------------------------
  // UI
  // -------------------------
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
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
              <h1 className="text-4xl font-bold">List</h1>
              <p className="mt-3 text-white/70">published 글만 노출됩니다.</p>

              <div className="mt-8 space-y-4">
                {list.length === 0 && !loading ? (
                  <div className="text-white/60">발행된 글이 아직 없어요.</div>
                ) : (
                  list.map((a) => (
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

                        <button
                          className="mt-4 inline-flex items-center gap-2 text-sm border-b border-white/40 hover:border-white"
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

              {!loading && !article && (
                <div className="mt-8 text-white/60">해당 글을 찾지 못했어요.</div>
              )}

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

                  {Array.isArray(article.tags) && article.tags.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-2">
                      {article.tags.map((t) => (
                        <span
                          key={t}
                          className="text-xs px-3 py-1 rounded-full border border-white/15 bg-white/5 text-white/70"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-10 rounded-2xl border border-white/15 bg-white/5 p-6">
                    <div
                      className="leading-relaxed text-white/90"
                      dangerouslySetInnerHTML={{ __html: article.contentHTML || "" }}
                    />
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
                      <p className="mt-2 text-white/70">최소 버전: 제목/요약/본문 + 커버 + 태그 + 저장/발행</p>
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
                        Load
                      </button>
                    </div>
                  </div>

                  {/* Meta inputs */}
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        value={form.tagsText}
                        onChange={(e) => setForm((p) => ({ ...p, tagsText: e.target.value }))}
                        placeholder="예: exhibition, seoul, photography"
                      />
                      <div className="mt-2 text-[11px] text-white/50">콤마(,)로 구분해서 입력</div>
                    </div>

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
                          <div className="text-white/50 text-sm mt-2">커버 이미지를 업로드하면 미리보기가 보여요.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* TipTap */}
                  <div className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.25em] text-white/60 mb-3">Body</div>
                    <div className="min-h-[260px] rounded-xl border border-white/10 bg-black/30 p-4">
                      <EditorContent editor={editor} />
                    </div>
                    <div className="mt-3 text-xs text-white/50">
                      TipTap 최소버전(StarterKit). 추후 이미지/정렬/링크/테이블/투표 등 확장 가능.
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="mt-8 flex flex-col md:flex-row gap-3">
                    <button
                      onClick={() => savePost("draft")}
                      className="w-full md:w-auto px-6 py-3 rounded-full border border-white/20 hover:border-white/50"
                    >
                      Save Draft
                    </button>
                    <button
                      onClick={() => savePost("published")}
                      className="w-full md:w-auto px-6 py-3 rounded-full bg-white text-black font-bold hover:opacity-90"
                    >
                      Publish
                    </button>
                  </div>

                  <div className="mt-4 text-xs text-white/50">
                    * createdAt은 “최초 생성 시만” 저장되고, 수정/재발행 시에는 변경되지 않게 처리되어 있어요.
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
