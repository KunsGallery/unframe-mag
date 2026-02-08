// src/services/comments.js
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

/* =============================================================================
  ✅ 댓글 목록
  - ⚠️ where + orderBy(createdAt)는 인덱스 없으면 실패할 수 있음
  - 그래서 DB에서는 where만 하고,
    프론트에서 createdAt desc로 정렬한다.
============================================================================= */
export async function listComments(articleId) {
  const q = query(
    collection(db, "comments"),
    where("articleId", "==", Number(articleId))
    // ❌ orderBy("createdAt","desc") 제거
  );

  const snap = await getDocs(q);

  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // ✅ createdAt desc 정렬 (없으면 맨 아래)
  list.sort((a, b) => {
    const ax = a?.createdAt?.toMillis?.() ?? (a?.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0) ?? 0;
    const bx = b?.createdAt?.toMillis?.() ?? (b?.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0) ?? 0;
    return bx - ax;
  });

  return list;
}

/* =============================================================================
  ✅ 댓글 추가
============================================================================= */
export async function addComment(articleId, name, text) {
  const safeName = (name || "Anonymous").trim().slice(0, 40);
  const safeText = (text || "").trim().slice(0, 1000);

  if (!safeText) throw new Error("empty");

  await addDoc(collection(db, "comments"), {
    articleId: Number(articleId),
    name: safeName,
    text: safeText,
    createdAt: serverTimestamp(),
  });
}

/* ✅ 예전 코드 호환 alias */
export async function listCommentsByArticleId(articleId) {
  return listComments(articleId);
}
