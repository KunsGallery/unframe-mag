import React, { useState } from "react";

function formatDate(value) {
  if (!value) return "";
  const d =
    typeof value?.toDate === "function"
      ? value.toDate()
      : value instanceof Date
      ? value
      : null;
  if (!d) return "";
  return d.toLocaleString("ko-KR");
}

export default function CommentBox({ comments, onSubmit }) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !text.trim()) return alert("이름/내용을 입력해줘!");
    setBusy(true);
    try {
      await onSubmit({ name, text });
      setText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-16 pt-10 border-t border-black/10">
      <h3 className="font-serif font-bold text-2xl mb-6">
        Comments <span className="text-gray-400 text-base">({comments.length})</span>
      </h3>

      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름"
          className="md:col-span-1 border border-black/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/20"
        />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="댓글 내용"
          className="md:col-span-2 border border-black/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black/20"
        />
        <button
          disabled={busy}
          className="md:col-span-1 rounded-xl bg-black text-white font-bold py-3 hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "등록중..." : "등록"}
        </button>
      </form>

      <div className="space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="rounded-2xl border border-black/10 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="font-bold">{c.name || "익명"}</div>
              <div className="text-xs text-gray-400">{formatDate(c.createdAt)}</div>
            </div>
            <div className="text-gray-700 mt-2 whitespace-pre-wrap">{c.text}</div>
          </div>
        ))}
        {comments.length === 0 ? (
          <div className="text-gray-400 italic">첫 댓글을 남겨주세요.</div>
        ) : null}
      </div>
    </section>
  );
}
