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

// ✅ 기존 이름(내가 최근에 쓰던 함수)
export async function listComments(articleId) {
  const q = query(
    collection(db, "comments"),
    where("articleId", "==", Number(articleId)),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addComment(articleId, name, text) {
  await addDoc(collection(db, "comments"), {
    articleId: Number(articleId),
    name: (name || "Anonymous").trim().slice(0, 40),
    text: (text || "").trim().slice(0, 1000),
    createdAt: serverTimestamp(),
  });
}

/* ✅ 예전 코드 호환용 alias (Netlify 빌드 깨짐 방지) */
export async function listCommentsByArticleId(articleId) {
  return listComments(articleId);
}
