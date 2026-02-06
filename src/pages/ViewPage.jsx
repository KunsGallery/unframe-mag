// src/pages/ViewPage.jsx
import React, { useEffect, useState } from "react";
import { getParam, go } from "../utils/router";
import { getArticleByIdNumber, bumpLikes, bumpViews } from "../services/articles";
import { addComment, listComments } from "../services/comments";
import { isSaved, toggleSaved } from "../services/bookmarks";

// ✅ Firebase Auth
import { auth, googleProvider } from "../firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

const ADMIN_EMAILS = new Set([
  "gallerykuns@gmail.com",
  "cybog2004@gmail.com",
  "sylove887@gmail.com",
]);

function formatDate(createdAt) {
  try {
    if (!createdAt) return "";
    if (typeof createdAt?.seconds === "number") {
      const d = new Date(createdAt.seconds * 1000);
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    }
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

export default function ViewPage() {
  const idNum = Number(getParam("id") || 0);

  const [a, setA] = useState(null);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState(null);

  const [comments, setComments] = useState([]);
  const [name, setName] = useState("");
  const [text, setText] = useState("");

  const [saved, setSaved] = useState(() => (idNum ? isSaved(idNum) : false));

  // ✅ 관리자 여부(뷰에서만 Edit 버튼)
  const [user, setUser] = useState(null);
  const isAdmin = !!user?.email && ADMIN_EMAILS.has(user.email);

  function showToast(message, ms = 2400) {
    setToast(message);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), ms);
  }

  // ✅ auth 구독
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  // ✅ 글/조회수/댓글 로드
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getArticleByIdNumber(idNum);
        if (!alive) return;
        setA(data || null);

        await bumpViews(idNum).catch(() => {});
        const list = await listComments(idNum).catch(() => []);
        if (!alive) return;
        setComments(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error(e);
        showToast("😵 글을 불러오지 못했어요.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [idNum]);

  async function onLike() {
    try {
      const res = await bumpLikes(idNum);
      if (res?.applied === false) {
        showToast(res?.message || "⏳ 이 글을 향한 애정은 3시간 뒤에 다시 보내주세요!");
      } else {
        showToast(res?.message || "좋아해주셔서 감사해요💕");
      }
      if (typeof res?.likes === "number") {
        setA((p) => (p ? { ...p, likes: res.likes } : p));
      }
    } catch (e) {
      console.error(e);
      showToast("😵 좋아요 처리 중 문제가 생겼어요.");
    }
  }

  function onToggleSave() {
    const next = toggleSaved(idNum);
    const nowSaved = next.includes(Number(idNum));
    setSaved(nowSaved);

    if (nowSaved) showToast("⭐ 저장했어요! (기기가 바뀌면 북마크도 변경될 수 있어요)");
    else showToast("🗑️ 저장을 해제했어요.");
  }

  async function onSubmitComment() {
    const nm = name.trim() || "Anonymous";
    const tx = text.trim();
    if (!tx) return showToast("✍️ 댓글 내용을 적어주세요!");

    try {
      await addComment(idNum, nm, tx);
      setText("");
      const list = await listComments(idNum).catch(() => []);
      setComments(Array.isArray(list) ? list : []);
      showToast("💬 댓글이 등록됐어요!");
    } catch (e) {
      console.error(e);
      showToast("😵 댓글 등록에 실패했어요.");
    }
  }

  async function adminLogin() {
    try {
      const r = await signInWithPopup(auth, googleProvider);
      const email = r?.user?.email || "";
      if (!ADMIN_EMAILS.has(email)) {
        showToast("🚫 관리자 계정이 아니에요. 접근 권한이 없어요.");
        await signOut(auth);
      } else {
        showToast("✅ 관리자 로그인 완료!");
      }
    } catch (e) {
      console.error(e);
      showToast("😵 로그인에 실패했어요.");
    }
  }

  if (loading) {
    return (
      <div className="uf-container" style={{ padding: "120px 16px" }}>
        로딩 중… ⏳
      </div>
    );
  }

  if (!a) {
    return (
      <div className="uf-container" style={{ padding: "120px 16px" }}>
        <div style={{ marginBottom: 12 }}>😮 글을 찾을 수 없어요.</div>
        <button className="uf-btn uf-btn--ghost" onClick={() => go("?mode=list")}>
          Back to list →
        </button>
      </div>
    );
  }

  return (
    <div className="uf-view">
      {toast && <div className="uf-toast">{toast}</div>}

      <div className="uf-container uf-viewTop">
        <button className="uf-btn uf-btn--ghost" onClick={() => go("?mode=list")}>
          ← Back to archive
        </button>

        <div className="uf-viewMeta">
          <div className="uf-viewCat">{a.category}</div>
          <div className="uf-viewMetaRow">
            <span>{formatDate(a.createdAt)}</span>
            <span>♥ {Number(a.likes || 0)}</span>
            <span>👁 {Number(a.views || 0)}</span>
          </div>
        </div>

        <h1 className="uf-viewTitle">{a.title}</h1>
        {a.excerpt ? <div className="uf-viewExcerpt">{a.excerpt}</div> : null}

        <div className="uf-viewActions">
          <button className="uf-btn uf-btn--primary" onClick={onLike}>
            ♥ Like
          </button>

          <button className={`uf-btn uf-btn--ghost ${saved ? "is-saved" : ""}`} onClick={onToggleSave}>
            {saved ? "⭐ Saved" : "☆ Save"}
          </button>

          {/* ✅ 관리자만 Edit 노출 */}
          {isAdmin ? (
            <button className="uf-btn uf-btn--ghost" onClick={() => go(`?mode=editor&id=${a.id}`)}>
              ✍️ Edit
            </button>
          ) : (
            // ✅ 관리자면 아니지만 “로그인 버튼”은 보여줄 수도 있음(원하면 삭제)
            <button className="uf-btn uf-btn--ghost" onClick={adminLogin} title="관리자만 로그인 가능">
              🔐 Admin Login
            </button>
          )}
        </div>
      </div>

      {a.cover ? (
        <div className="uf-viewCover">
          <img src={a.cover} alt="cover" />
        </div>
      ) : null}

      <div className="uf-container uf-viewBody">
        {/* eslint-disable-next-line react/no-danger */}
        <div className="uf-prose" dangerouslySetInnerHTML={{ __html: a.contentHTML || "" }} />
      </div>

      <div className="uf-container uf-comments">
        <h3 className="uf-commentsTitle">Comments</h3>

        <div className="uf-commentForm">
          <input className="uf-input" placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
          <textarea className="uf-textarea" placeholder="Write a comment…" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="uf-btn uf-btn--primary" onClick={onSubmitComment}>
            Send 💬
          </button>
        </div>

        <div className="uf-commentList">
          {comments.map((c) => (
            <div key={c.id} className="uf-comment">
              <div className="uf-comment__name">{c.name || "Anonymous"}</div>
              <div className="uf-comment__text">{c.text}</div>
            </div>
          ))}
          {!comments.length && <div className="uf-empty">아직 댓글이 없어요. 첫 댓글을 남겨볼까요? ✨</div>}
        </div>
      </div>
    </div>
  );
}
