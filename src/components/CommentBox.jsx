// src/components/CommentBox.jsx
import React, { useMemo, useState } from "react";

/**
 * ============================================================================
 * ✅ CommentBox (안정화 버전)
 * - comments가 undefined/null이어도 절대 터지지 않게 방어
 * - loading/error 상태에도 UI가 깨지지 않게 설계
 * ============================================================================
 */
export default function CommentBox({
  comments, // 배열이거나 undefined일 수 있음
  loading = false,
  error = "",
  onSubmit, // (name, text) => Promise<void>
}) {
  // ✅ comments를 "항상 배열"로 만들기 (여기가 핵심)
  const list = useMemo(() => (Array.isArray(comments) ? comments : []), [comments]);

  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!onSubmit) return;

    const n = (name || "Anonymous").trim().slice(0, 40);
    const t = (text || "").trim().slice(0, 1000);

    if (!t) return;

    try {
      setSending(true);
      await onSubmit(n, t);
      setText("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="uf-commentBox">
      <div className="uf-commentBox__head">
        <div className="uf-commentBox__title">Comments</div>
        <div className="uf-commentBox__count">{list.length}</div>
      </div>

      {/* 상태 메시지 */}
      {loading ? <div className="uf-commentBox__hint">⏳ 불러오는 중…</div> : null}
      {error ? <div className="uf-commentBox__error">😵 {error}</div> : null}

      {/* 목록 */}
      {list.length === 0 && !loading ? (
        <div className="uf-commentBox__empty">첫 댓글을 남겨주세요 ✍️</div>
      ) : (
        <div className="uf-commentBox__list">
          {list.map((c) => (
            <div key={c.id} className="uf-comment">
              <div className="uf-comment__meta">
                <b className="uf-comment__name">{c.name || "Anonymous"}</b>
                <span className="uf-comment__date">
                  {c.createdAt?.toDate?.()
                    ? c.createdAt.toDate().toLocaleString("ko-KR")
                    : ""}
                </span>
              </div>
              <div className="uf-comment__text">{c.text || ""}</div>
            </div>
          ))}
        </div>
      )}

      {/* 작성 폼 */}
      <form className="uf-commentBox__form" onSubmit={handleSubmit}>
        <input
          className="uf-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름 (선택)"
        />
        <textarea
          className="uf-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="댓글을 남겨주세요"
        />
        <button className="uf-btn uf-btn--primary" disabled={sending || !text.trim()}>
          {sending ? "전송중…" : "댓글 등록"}
        </button>
      </form>
    </div>
  );
}
