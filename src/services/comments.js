// src/services/comments.js
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

/** 내부 공용: 댓글 목록 */
async function _fetchComments(articleId) {
  const q = query(
    collection(db, "comments"),
    where("articleId", "==", Number(articleId)),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** ✅ (새 표준) ViewPage가 쓰는 함수명 */
export async function getCommentsByArticleId(articleId) {
  return _fetchComments(articleId);
}

/** ✅ (새 표준) payload 형태로 받기: { articleId, name, text } */
export async function addComment(payload) {
  const articleId = Number(payload?.articleId);
  const name = (payload?.name || "Anonymous").trim().slice(0, 40);
  const text = (payload?.text || "").trim().slice(0, 1000);

  if (!articleId) throw new Error("articleId is required");
  if (!text) throw new Error("text is required");

  await addDoc(collection(db, "comments"), {
    articleId,
    name,
    text,
    createdAt: serverTimestamp(),
  });
}

/* ===========================
   ✅ 기존 코드 호환용 alias들
   - 혹시 다른 파일에서 옛 함수명 쓰고 있어도 안 깨지게
=========================== */

/** 예전: listComments(articleId) */
export async function listComments(articleId) {
  return _fetchComments(articleId);
}

/** 예전: listCommentsByArticleId(articleId) */
export async function listCommentsByArticleId(articleId) {
  return _fetchComments(articleId);
}

/** 예전: addComment(articleId, name, text) 시그니처가 필요하면 */
export async function addCommentLegacy(articleId, name, text) {
  return addComment({ articleId, name, text });
}
