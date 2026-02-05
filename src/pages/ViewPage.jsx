import React, { useEffect, useMemo, useState } from "react";
import { addComment, getCommentsByArticleId } from "../services/comments";
import { bumpLikes, bumpViews, getArticleByIdNumber } from "../services/articles";
import { go } from "../utils/router";
import CommentBox from "../components/CommentBox";

function formatDate(value) {
  if (!value) return "";
  const d =
    typeof value?.toDate === "function"
      ? value.toDate()
      : value instanceof Date
      ? value
      : null;
  if (!d) return "";
  return d.toLocaleDateString("ko-KR");
}

export default function ViewPage({ id }) {
  const [article, setArticle] = useState(null);
  const [comments, setComments] = useState([]);
  const [busyLike, setBusyLike] = useState(false);

  const idNum = useMemo(() => Number(id || 0), [id]);

  useEffect(() => {
    (async () => {
      if (!idNum) return;
      const a = await getArticleByIdNumber(idNum);
      setArticle(a);

      if (a?.firebaseId) {
        // ✅ 조회수 30분 중복 방지 (세션)
        const key = `viewed:${a.firebaseId}`;
        const now = Date.now();
        const last = Number(sessionStorage.getItem(key) || 0);
        const THIRTY = 30 * 60 * 1000;

        if (!last || now - last > THIRTY) {
          try {
            await bumpViews(a.firebaseId);
            sessionStorage.setItem(key, String(now));
            // 로컬 UI에도 즉시 반영
            setArticle((prev) => (prev ? { ...prev, views: (prev.views || 0) + 1 } : prev));
          } catch (e) {
            console.warn("view bump failed", e);
          }
        }
      }

      // 댓글 로드
      if (idNum) {
        const list = await getCommentsByArticleId(idNum);
        setComments(list);
      }
    })();
  }, [idNum]);

  const like = async () => {
    if (!article?.firebaseId) return;
    // ✅ 브라우저 기준 1회 제한(영구) — 원하면 30분 제한으로 바꿀 수도 있어
    const key = `liked:${article.firebaseId}`;
    if (localStorage.getItem(key)) return alert("이미 좋아요 했어!");

    setBusyLike(true);
    try {
      await bumpLikes(article.firebaseId);
      localStorage.setItem(key, "1");
      setArticle((prev) => (prev ? { ...prev, likes: (prev.likes || 0) + 1 } : prev));
    } finally {
      setBusyLike(false);
    }
  };

  const share = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      alert("링크를 복사했어!");
    } catch {
      prompt("복사해서 공유해줘:", url);
    }
  };

  const submitComment = async ({ name, text }) => {
    await addComment({ articleId: idNum, name, text });
    const list = await getCommentsByArticleId(idNum);
    setComments(list);
  };

  if (!article) {
    return (
      <div className="min-h-screen bg-[#f4f1ea] px-6 py-14">
        <button onClick={() => go("?mode=list")} className="underline">
          ← Back
        </button>
        <div className="mt-10 text-gray-500">글을 불러오는 중...</div>
      </div>
    );
  }

  const cover = article.cover || "";

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-black">
      <div className="max-w-4xl mx-auto px-6 pt-10 pb-20">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => go("?mode=list")} className="text-sm underline">
            ← Back to list
          </button>
          <button onClick={() => go(`?mode=editor&id=${article.id}`)} className="text-sm underline">
            Edit
          </button>
        </div>

        <header className="mt-8">
          <div className="flex items-center gap-3 text-sm text-black/60">
            <span className="font-mono">No.{article.id}</span>
            <span>·</span>
            <span>{article.category}</span>
            {article.createdAt ? (
              <>
                <span>·</span>
                <span>{formatDate(article.createdAt)}</span>
              </>
            ) : null}
          </div>

          <h1 className="font-serif font-black text-4xl md:text-6xl leading-tight mt-4">
            {article.title}
          </h1>

          {article.excerpt ? (
            <p className="mt-4 text-lg text-black/70">{article.excerpt}</p>
          ) : null}

          <div className="flex items-center gap-4 text-sm text-black/60 mt-6">
            <span>👁 {article.views || 0}</span>
            <span>♥ {article.likes || 0}</span>
            <button
              onClick={like}
              disabled={busyLike}
              className="px-4 py-2 rounded-full bg-black text-white font-bold hover:opacity-90 disabled:opacity-50"
            >
              Like
            </button>
            <button
              onClick={share}
              className="px-4 py-2 rounded-full border border-black/15 bg-white font-bold hover:bg-black hover:text-white transition"
            >
              Share
            </button>
          </div>
        </header>

        {cover ? (
          <div className="mt-10 rounded-3xl overflow-hidden border border-black/10 bg-white">
            <img src={cover} alt="" className="w-full h-auto" />
          </div>
        ) : null}

        <article className="mt-12 bg-white rounded-3xl border border-black/10 p-8 md:p-10">
          <div
            className="prose prose-lg max-w-none prose-slate"
            dangerouslySetInnerHTML={{ __html: article.contentHTML || "" }}
          />
        </article>

        {article.mapEmbed ? (
          <div className="mt-12 bg-white rounded-3xl border border-black/10 p-6">
            <div
              className="w-full overflow-hidden rounded-2xl"
              dangerouslySetInnerHTML={{ __html: article.mapEmbed }}
            />
          </div>
        ) : null}

        <CommentBox comments={comments} onSubmit={submitComment} />
      </div>
    </div>
  );
}
