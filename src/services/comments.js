// src/services/comments.js
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

/* =============================================================================
  ✅ 댓글 목록 (인덱스 없이 안전)
  - where만 사용하고 orderBy는 제거
  - 가져온 뒤 프론트에서 createdAt desc 정렬
============================================================================= */
export async function listComments(articleId) {
  const q = query(
    collection(db, "comments"),
    where("articleId", "==", Number(articleId))
  );

  const snap = await getDocs(q);
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // ✅ createdAt desc 정렬 (createdAt이 null일 수도 있어서 안전하게)
  list.sort((a, b) => {
    const ax = a.createdAt?.toMillis?.() ?? (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
    const bx = b.createdAt?.toMillis?.() ?? (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
    return bx - ax;
  });

  return list;
}

/* =============================================================================
  ✅ 댓글 추가
============================================================================= */
export async function addComment(articleId, name, text) {
  await addDoc(collection(db, "comments"), {
    articleId: Number(articleId),
    name: (name || "Anonymous").trim().slice(0, 40),
    text: (text || "").trim().slice(0, 1000),
    createdAt: serverTimestamp(),
  });
}

/* ✅ 예전 코드 호환용 alias */
export async function listCommentsByArticleId(articleId) {
  return listComments(articleId);
}
