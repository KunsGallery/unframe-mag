// src/pages/ViewPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getArticleByIdNumber, bumpViews, bumpLikes } from "../services/articles";
import { listComments, addComment } from "../services/comments";
import { isSaved, toggleSaved } from "../services/bookmarks";

const VIEW_CD_MS = 30 * 60 * 1000; // 30분
const LIKE_CD_MS = 3 * 60 * 60 * 1000; // 3시간

function now() {
  return Date.now();
}
function keyView(id) {
  return `UF_VIEW_CD_${id}`;
}
function keyLike(id) {
  return `UF_LIKE_CD_${id}`;
}
function canPassCooldown(k, ms) {
  try {
    const last = Number(localStorage.getItem(k) || 0);
    return !last || now() - last >= ms;
  } catch {
    return true;
  }
}
function stampCooldown(k) {
  try {
    localStorage.setItem(k, String(now()));
  } catch {}
}
function formatDate(ts) {
  try {
    if (!ts) return "";
    const d = typeof ts?.toDate === "function" ? ts.toDate() : new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return "";
  }
}
function useToast() {
  const [toast, setToast] = useState(null);
  const tRef = useRef(null);
  const show = (msg, ms = 2200) => {
    setToast(msg);
    window.clearTimeout(tRef.current);
    tRef.current = window.setTimeout(() => setToast(null), ms);
  };
  return { toast, show };
}

export default function ViewPage({ theme, toggleTheme }) {
  const { id } = useParams(); // /article/:id
  const idNum = Number(id);
  const nav = useNavigate();
  const { toast, show } = useToast();

  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState(null);

  const [comments, setComments] = useState([]); // ✅ undefined 방지
  const [cName, setCName] = useState("");
  const [cText, setCText] = useState("");

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);

        const a = await getArticleByIdNumber(idNum);
        if (!alive) return;

        if (!a) {
          show("😮 글을 찾지 못했어요. 목록으로 돌아갈게요.", 2400);
          nav("/", { replace: true });
          return;
        }

        setArticle(a);
        setSaved(!!isSaved(idNum));

        // ✅ 조회수 30분 쿨다운 (아티클별)
        if (canPassCooldown(keyView(idNum), VIEW_CD_MS)) {
          try {
            await bumpViews(idNum, 1); // ✅ 글번호 기반
            stampCooldown(keyView(idNum));
          } catch (e) {
            console.error(e);
          }
        }

        // ✅ 댓글 로드
        try {
          const list = await listComments(idNum);
          if (!alive) return;
          setComments(Array.isArray(list) ? list : []);
        } catch (e) {
          console.error(e);
          setComments([]);
        }
      } catch (e) {
        console.error(e);
        show("😵 글을 불러오지 못했어요.", 2400);
        nav("/", { replace: true });
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [idNum, nav]);

  const coverUrl = useMemo(() => {
    if (!article) return "";
    return article.coverMedium || article.coverThumb || article.cover || "";
  }, [article]);

  async function onLike() {
    if (!article) return;

    if (!canPassCooldown(keyLike(idNum), LIKE_CD_MS)) {
      show("🕒 이 글을 향한 애정은 3시간 뒤에 다시 보내주세요!", 2600);
      return;
    }

    try {
      // ✅ UI는 즉시 +1 (낙관적)
      setArticle((p) => ({ ...p, likes: Number(p?.likes || 0) + 1 }));

      // ✅ 실제 업데이트는 글번호 기준으로
      await bumpLikes(idNum, 1);

      stampCooldown(keyLike(idNum));
      show("좋아해주셔서 감사해요💕", 2000);
    } catch (e) {
      console.error(e);
      show("😵 좋아요 반영에 실패했어요.", 2400);
      // 실패 롤백
      setArticle((p) => ({ ...p, likes: Math.max(0, Number(p?.likes || 0) - 1) }));
    }
  }

  function onToggleSave() {
    try {
      toggleSaved(idNum);
      const next = !!isSaved(idNum);
      setSaved(next);
      show(next ? "⭐ 저장했어요! (기기가 바뀌면 저장도 바뀝니다)" : "🧹 저장을 해제했어요!", 2600);
    } catch (e) {
      console.error(e);
      show("😵 저장 처리에 실패했어요.", 2200);
    }
  }

  async function onSubmitComment() {
    const name = (cName || "Anonymous").trim();
    const text = (cText || "").trim();
    if (!text) return show("✍️ 댓글 내용을 입력해주세요!", 1800);

    try {
      await addComment(idNum, name, text);
      setCText("");
      const list = await listComments(idNum);
      setComments(Array.isArray(list) ? list : []);
      show("💬 댓글이 등록됐어요! 감사합니다", 2000);
    } catch (e) {
      console.error(e);
      show("😵 댓글 등록에 실패했어요.", 2200);
    }
  }

  if (loading) {
    return (
      <div className="uf-container uf-viewWrap">
        {toast && <div className="uf-toast">{toast}</div>}
        <div className="uf-max">로딩 중… ⏳</div>
      </div>
    );
  }
  if (!article) return null;

  return (
    <div className="uf-container uf-viewWrap">
      {toast && <div className="uf-toast">{toast}</div>}

      <div className="uf-viewTopbar">
        <div className="uf-viewTopbarInner">
          <div className="uf-brand" onClick={() => nav("/")}>
            U#
          </div>

          <div className="uf-topActions">
            <button className="uf-btn" onClick={toggleTheme}>
              {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
            </button>

            {/* ✅ Edit: query param으로 id 전달 */}
            <button className="uf-btn" onClick={() => nav(`/write?id=${idNum}`)}>
              ✍️ Edit
            </button>

            <button className="uf-btn" onClick={() => nav("/")}>
              ← List
            </button>
          </div>
        </div>
      </div>

      <article className="uf-article">
        {coverUrl ? (
          <div className="uf-heroCover">
            <img src={coverUrl} alt="cover" />
          </div>
        ) : null}

        <div className="uf-metaRow">
          <span className="uf-badge">{article.category || "Category"}</span>
          <span>🗓 {formatDate(article.createdAt)}</span>
          <span>👁 {Number(article.views || 0)}</span>
          <span>💗 {Number(article.likes || 0)}</span>
        </div>

        <h1 className="uf-title">{article.title || "(no title)"}</h1>
        {article.excerpt ? <p className="uf-excerpt">{article.excerpt}</p> : null}

        <div className="uf-actionBar">
          <button className="uf-btn uf-btn--primary" onClick={onLike}>
            💗 Like
          </button>

          <button className="uf-btn" onClick={onToggleSave}>
            {saved ? "★ Saved" : "☆ Save"}
          </button>

          <button
            className="uf-btn"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
                show("🔗 링크를 복사했어요!", 1800);
              } catch {
                show("😵 복사에 실패했어요.", 1800);
              }
            }}
          >
            🔗 Share
          </button>
        </div>

        <div className="uf-content" dangerouslySetInnerHTML={{ __html: article.contentHTML || "" }} />

        <div style={{ marginTop: 18 }}>
          <div className="uf-card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>💬 Comments</div>

            <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
              <input className="uf-input" placeholder="이름 (선택)" value={cName} onChange={(e) => setCName(e.target.value)} />
              <input className="uf-input" placeholder="댓글을 남겨주세요" value={cText} onChange={(e) => setCText(e.target.value)} />
              <button className="uf-btn uf-btn--primary" onClick={onSubmitComment}>
                댓글 등록
              </button>
            </div>

            {comments.length === 0 ? (
              <div className="uf-muted">아직 댓글이 없어요 🥲</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {comments.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      padding: 12,
                      background: "var(--card-2)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 700 }}>{c.name || "Anonymous"}</div>
                      <div className="uf-muted2" style={{ fontSize: 12 }}>
                        {formatDate(c.createdAt)}
                      </div>
                    </div>
                    <div style={{ marginTop: 6, lineHeight: 1.6 }}>{c.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="uf-btn" onClick={() => nav("/")}>
            ← Back to List
          </button>
          <button className="uf-btn" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            ⬆️ Top
          </button>
        </div>
      </article>
    </div>
  );
}
