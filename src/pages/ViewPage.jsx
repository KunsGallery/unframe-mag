// src/pages/ViewPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { go, getParam } from "../utils/router";

import { isSaved, toggleSaved, getSavedIds } from "../services/bookmarks";

// ✅ comments 서비스: 너가 준 코드 기준(listComments / addComment)
import { listComments, addComment } from "../services/comments";

// ✅ articles 서비스: 프로젝트에 맞춰서 이름만 조정 가능
import { getArticleByIdNumber, bumpViews, bumpLikes } from "../services/articles";

function formatDate(ts) {
  try {
    if (!ts) return "";
    const d =
      typeof ts?.toDate === "function"
        ? ts.toDate()
        : typeof ts === "number"
        ? new Date(ts)
        : new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return "";
  }
}

export default function ViewPage({ id, theme, toggleTheme }) {
  const idNum = Number(id ?? getParam("id"));

  const [a, setA] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ 댓글
  const [comments, setComments] = useState([]);
  const [cName, setCName] = useState("");
  const [cText, setCText] = useState("");
  const [cLoading, setCLoading] = useState(false);

  // ✅ toast
  const [toast, setToast] = useState("");

  // ✅ saved
  const [saved, setSaved] = useState(() => isSaved(idNum));
  const savedCount = useMemo(() => getSavedIds().length, [saved]);

  // ✅ 글 로드 + 조회수 bump
  useEffect(() => {
    if (!Number.isFinite(idNum)) return;

    let alive = true;
    (async () => {
      try {
        setLoading(true);

        const article = await getArticleByIdNumber(idNum);
        if (!alive) return;
        setA(article);

        // ✅ 조회수 +1 (너가 30분 쿨다운 로직 이미 구현한 bumpViews를 사용)
        //    bumpViews 내부에서 “쿨다운/중복방지” 해야 Firestore 룰도 안전함
        bumpViews?.(idNum).catch(() => {});
      } catch (e) {
        console.error(e);
        if (alive) setA(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [idNum]);

  // ✅ 댓글 로드
  useEffect(() => {
    if (!Number.isFinite(idNum)) return;

    let alive = true;
    (async () => {
      try {
        const list = await listComments(idNum);
        if (!alive) return;
        setComments(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      alive = false;
    };
  }, [idNum]);

  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(""), 2600);
  }

  async function onLike() {
    try {
      // ✅ 좋아요 bump (3시간 쿨다운 로직은 bumpLikes 내부에 있어야 “UI/새로고침” 일관됨)
      await bumpLikes(idNum);
      showToast("좋아해주셔서 감사해요💕");

      // ✅ 새로 데이터 반영
      const article = await getArticleByIdNumber(idNum);
      setA(article);
    } catch (e) {
      // 쿨다운 메시지 등 bumpLikes에서 throw한 메시지 표시
      const msg = String(e?.message || e);
      showToast(msg.includes("cooldown") ? "이 글을 향한 애정은 3시간 뒤에 다시 보내주세요💌" : `앗! 좋아요 실패🥲 (${msg})`);
    }
  }

  function onSave() {
    const r = toggleSaved(idNum);
    setSaved(r.saved);

    if (r.saved) {
      showToast("저장했어요⭐ (기기가 바뀌면 북마크도 변경돼요)");
    } else {
      showToast("저장을 해제했어요🧹");
    }
  }

  async function onSubmitComment() {
    try {
      if (!cText.trim()) return showToast("댓글 내용을 적어주세요✍️");

      setCLoading(true);
      await addComment(idNum, cName, cText);
      setCText("");

      const list = await listComments(idNum);
      setComments(Array.isArray(list) ? list : []);

      showToast("댓글이 등록됐어요💬");
    } catch (e) {
      console.error(e);
      showToast("댓글 등록 실패🥲");
    } finally {
      setCLoading(false);
    }
  }

  if (!Number.isFinite(idNum)) {
    return (
      <div className="u-page">
        <div className="u-pageInner">
          <div className="u-paper">
            <h2>잘못된 접근이에요 🥲</h2>
            <button className="u-btn u-btnPrimary" onClick={() => go("?mode=list")}>리스트로</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="u-page">
      {/* ✅ TopNav (View에서도 유지) */}
      <div className="u-topNav u-topNav--solid">
        <div className="u-topNav__inner" style={{ maxWidth: 1200 }}>
          <div className="u-brand" onClick={() => go("?mode=list")}>U#</div>

          <div className="u-navRight">
            <button className="u-navLinkBtn" onClick={() => go("?mode=list")}>Archive</button>

            <button className="u-navLinkBtn u-navLinkBtn--saved" onClick={() => go("?mode=list&page=1")}>
              Saved ({savedCount})
            </button>

            <button className="u-navLinkBtn" onClick={toggleTheme}>
              {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
            </button>
          </div>
        </div>
      </div>

      <div className="u-pageInner">
        <div className="u-paper">
          {loading ? (
            <div className="u-empty">로딩 중… ⏳</div>
          ) : !a ? (
            <div className="u-empty">글을 찾을 수 없어요 🥲</div>
          ) : (
            <>
              {/* ✅ 상단 메타 */}
              <div className="u-viewTop">
                <div className="u-viewMeta">
                  <span className="u-badge">{a.category || "Category"}</span>
                  <span className="u-date">{formatDate(a.createdAt)}</span>
                </div>

                <h1 className="u-viewTitle">{a.title}</h1>
                {a.excerpt && <p className="u-viewExcerpt">{a.excerpt}</p>}

                <div className="u-viewActions">
                  <button className="u-btn u-btnPrimary" onClick={onLike}>💗 Like</button>
                  <button className="u-btn" onClick={onSave}>{saved ? "★ Saved" : "☆ Save"}</button>

                  {/* ✅ Edit 버튼: EditorPage에서 admin guard가 걸려있으니 일단 열어둠 */}
                  <button className="u-btn" onClick={() => go(`?mode=editor&id=${a.id}`)}>✏️ Edit</button>

                  <div className="u-stats">
                    <span>👁 {Number(a.views || 0)}</span>
                    <span>💗 {Number(a.likes || 0)}</span>
                  </div>
                </div>
              </div>

              {/* ✅ cover */}
              {(a.cover || a.coverMedium || a.coverThumb) && (
                <div className="u-viewCover" style={{ backgroundImage: `url(${a.coverMedium || a.coverThumb || a.cover})` }} />
              )}

              {/* ✅ 본문 */}
              <div className="u-viewBody" dangerouslySetInnerHTML={{ __html: a.contentHTML || "" }} />

              {/* ✅ 태그: 뷰에는 “필요할 때만” (요청대로 최소화) */}
              {Array.isArray(a.tags) && a.tags.length > 0 && (
                <div className="u-tags u-tags--view">
                  {a.tags.slice(0, 8).map((t) => (
                    <button key={t} className="u-tag" onClick={() => go(`?mode=list&page=1`)} title="태그 검색은 리스트에서">
                      #{t}
                    </button>
                  ))}
                </div>
              )}

              {/* ✅ Comments */}
              <div className="u-comments">
                <h3 className="u-commentsTitle">Comments</h3>

                <div className="u-commentForm">
                  <input className="u-input" placeholder="이름 (선택)" value={cName} onChange={(e) => setCName(e.target.value)} />
                  <textarea className="u-textarea" placeholder="댓글을 남겨주세요…" value={cText} onChange={(e) => setCText(e.target.value)} />
                  <button className="u-btn u-btnPrimary" onClick={onSubmitComment} disabled={cLoading}>
                    {cLoading ? "등록 중…" : "댓글 등록 💬"}
                  </button>
                </div>

                <div className="u-commentList">
                  {comments.length === 0 ? (
                    <div className="u-empty">첫 댓글을 남겨주세요 ✨</div>
                  ) : (
                    comments.map((c) => (
                      <div className="u-comment" key={c.id}>
                        <div className="u-commentHead">
                          <b>{c.name || "Anonymous"}</b>
                          <span className="u-date">{formatDate(c.createdAt)}</span>
                        </div>
                        <div className="u-commentText">{c.text}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ✅ toast */}
      {toast && <div className="uf-toast">{toast}</div>}
    </div>
  );
}
