import React, { useEffect, useState } from "react";
import { addComment, listComments } from "../services/comments";

function fmt(ts) {
  try {
    if (!ts) return "";
    const d = typeof ts?.toDate === "function" ? ts.toDate() : new Date(ts);
    return d.toLocaleString("ko-KR");
  } catch {
    return "";
  }
}

export default function CommentBox({ articleId }) {
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);

  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");

  async function reload() {
    try {
      setLoading(true);
      const list = await listComments(articleId);
      setComments(Array.isArray(list) ? list : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, [articleId]);

  async function onSubmit() {
    try {
      await addComment(articleId, name, msg);
      setMsg("");
      await reload();
    } catch (e) {
      alert(e?.message || "댓글 등록 실패");
    }
  }

  return (
    <div>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Comments</div>

      {loading ? (
        <div style={{ color: "var(--muted)" }}>로딩 중…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {comments.length === 0 ? (
            <div style={{ color: "var(--muted)" }}>첫 댓글을 남겨주세요 ✍️</div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="uf-card uf-card--flat" style={{ padding: 12 }}>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>
                  {c.name || "Anonymous"} <span style={{ color: "var(--muted)", fontWeight: 500, fontSize: 12 }}>· {fmt(c.createdAt)}</span>
                </div>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{c.message}</div>
              </div>
            ))
          )}
        </div>
      )}

      <div style={{ marginTop: 14 }} className="uf-card uf-card--flat">
        <div style={{ padding: 12 }}>
          <div className="uf-row" style={{ gap: 10 }}>
            <input className="uf-input" placeholder="이름(선택)" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div style={{ marginTop: 10 }}>
            <textarea className="uf-textarea" placeholder="댓글을 남겨주세요" value={msg} onChange={(e) => setMsg(e.target.value)} />
          </div>
          <div style={{ marginTop: 10 }}>
            <button className="uf-btn uf-btn--primary" onClick={onSubmit}>댓글 등록</button>
          </div>
        </div>
      </div>
    </div>
  );
}
