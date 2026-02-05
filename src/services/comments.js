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
    name: name || "Anonymous",
    text: text || "",
    createdAt: serverTimestamp(),
  });
}
