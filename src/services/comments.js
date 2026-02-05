import { db } from "../firebase";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

export async function getCommentsByArticleId(articleId) {
  const q = query(
    collection(db, "comments"),
    where("articleId", "==", Number(articleId)),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addComment({ articleId, name, text }) {
  await addDoc(collection(db, "comments"), {
    articleId: Number(articleId),
    name: (name || "").trim().slice(0, 40),
    text: (text || "").trim().slice(0, 1000),
    createdAt: serverTimestamp(),
  });
}
