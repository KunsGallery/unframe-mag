// src/pages/ViewPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { getParam, go } from "../utils/router";
import { getArticleByIdNumber, bumpLikes, bumpViews } from "../services/articles";
import { listComments, addComment } from "../services/comments";


function fmtDate(createdAt) {
  if (!createdAt) return "";
  const d =
    typeof createdAt?.toDate === "function"
      ? createdAt.toDate()
      : createdAt instanceof Date
      ? createdAt
      : null;
  if (!d) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function fmtDateTime(createdAt) {
  if (!createdAt) return "";
  const d =
    typeof createdAt?.toDate === "function"
      ? createdAt.toDate()
      : createdAt instanceof Date
      ? createdAt
      : null;
  if (!d) return "";
  return d.toLocaleString("ko-KR");
}

export default function ViewPage() {
  const idNum = useMemo(() => Number(getParam("id") || 0), []);
  const [article, setArticle] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likeBusy, setLikeBusy] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const a = await getArticleByIdNumber(idNum);
      setArticle(a);
      setLoading(false);

      if (!a?.firebaseId) return;

      // ✅ 조회수 +1 (UI도 즉시 +1)
      try {
        await bumpViews(a.firebaseId);
        setArticle((p) => (p ? { ...p, views: (p.views ?? 0) + 1 } : p));
      } catch {}

      // ✅ 댓글 로드
      try {
        const cs = await listComments(idNum);
        setComments(cs);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [idNum]);

  const onLike = async () => {
    if (!article?.firebaseId || likeBusy) return;
    setLikeBusy(true);
    try {
      await bumpLikes(article.firebaseId);
      setArticle((p) => (p ? { ...p, likes: (p.likes ?? 0) + 1 } : p));
    } finally {
      setLikeBusy(false);
    }
  };

  const onComment = async () => {
    if (commentBusy) return;
    const name = prompt("이름") || "Anonymous";
    const text = prompt("댓글 내용") || "";
    if (!text.trim()) return;

    setCommentBusy(true);
    try {
      await addComment(idNum, name, text);
      const cs = await listComments(idNum);
      setComments(cs);
    } catch (e) {
      console.error(e);
      alert("댓글 저장/불러오기 실패(인덱스/권한 확인)");
    } finally {
      setCommentBusy(false);
    }
  };

  if (loading) return <div className="p-8">Loading…</div>;
  if (!article) return <div className="p-8">글을 찾지 못했어.</div>;

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <button className="text-sm underline mb-6" onClick={() => go("?mode=list")}>
          ← Back
        </button>

        {article.cover ? (
          <img
            src={article.cover}
            alt=""
            className="w-full rounded-2xl mb-8 object-cover"
            style={{ maxHeight: 420 }}
          />
        ) : null}

        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <span>NO.{article.id}</span>
          <span>•</span>
          <span>{article.category}</span>
          <span>•</span>
          <span>{fmtDate(article.createdAt)}</span>
        </div>

        <h1 className="text-3xl font-bold mb-3">{article.title}</h1>
        <p className="text-gray-600 mb-6">{article.excerpt}</p>

        <div className="flex items-center gap-4 text-sm mb-10">
          <span>👁 {article.views ?? 0}</span>
          <button
            className="px-3 py-1 rounded-full border hover:bg-black hover:text-white transition"
            onClick={onLike}
            disabled={likeBusy}
          >
            ❤️ {article.likes ?? 0}
          </button>
        </div>

        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: article.contentHTML || "" }}
        />

        {/* ✅ 댓글 섹션 */}
        <div className="mt-14 pt-10 border-t">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">Comments ({comments.length})</h3>
            <button
              className="px-3 py-1 rounded-lg bg-black text-white"
              onClick={onComment}
              disabled={commentBusy}
            >
              {commentBusy ? "등록중…" : "댓글 쓰기"}
            </button>
          </div>

          <div className="space-y-4">
            {comments.map((c) => (
              <div key={c.id} className="p-4 rounded-xl bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold">{c.name}</div>
                  <div className="text-xs text-gray-400">{fmtDateTime(c.createdAt)}</div>
                </div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap mt-2">{c.text}</div>
              </div>
            ))}
            {comments.length === 0 ? (
              <div className="text-sm text-gray-400">첫 댓글을 남겨보세요.</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
