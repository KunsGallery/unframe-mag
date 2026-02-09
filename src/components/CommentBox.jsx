// src/components/CommentBox.jsx
import React, { useEffect, useState } from "react";
import { addComment, listComments } from "../services/comments";

/* =============================================================================
  ✅ 날짜 포맷 (Timestamp/number/string 대응)
============================================================================= */
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
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function CommentBox({ articleId }) {
  const [loading, setLoading] = useState(true);

  // ✅ 절대 undefined로 두지 않기 (중요!)
  const [comments, setComments] = useState([]);

  const [name, setName] = useState("");
  const [text, setText] = useState("");

  const [err, setErr] = useState("");

  async function load() {
    try {
      setErr("");
      setLoading(true);
      const list = await listComments(articleId);
      setComments(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
      setErr("댓글을 불러오지 못했어요 😵");
      setComments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (articleId == null) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  async function onSubmit(e) {
    e.preventDefault();
    const n = name.trim();
    const t = text.trim();

    if (!t) {
      setErr("댓글 내용을 입력해주세요 ✍️");
      return;
    }

    try {
      setErr("");
      await addComment(articleId, n, t);
      setText("");
      await load();
    } catch (e2) {
      console.error(e2);
      setErr("댓글 작성에 실패했어요 😵");
    }
  }

  return (
    <div className="uf-card uf-card--flat" style={{ padding: 14 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>💬 Comments</div>

      {/* ✅ 입력 폼 */}
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        <input
          className="uf-input"
          placeholder="이름 (선택)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <textarea
          className="uf-textarea"
          placeholder="댓글을 남겨주세요…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="uf-btn uf-btn--primary" type="submit">
            등록하기
          </button>
          {err ? <div style={{ color: "#ef4444", fontSize: 13 }}>{err}</div> : null}
        </div>
      </form>

      {/* ✅ 목록 */}
      {loading ? (
        <div style={{ color: "var(--muted)" }}>로딩 중… ⏳</div>
      ) : comments.length === 0 ? (
        <div style={{ color: "var(--muted)" }}>첫 댓글을 남겨보세요 ✨</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {comments.map((c) => (
            <div
              key={c.id}
              style={{
                padding: 12,
                borderRadius: 14,
                border: "1px solid var(--line)",
                background: "var(--panel)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 800 }}>
                  {String(c.name || "Anonymous").slice(0, 40)}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {formatDate(c.createdAt)}
                </div>
              </div>

              <div style={{ marginTop: 6, lineHeight: 1.6 }}>
                {String(c.text || "")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
