import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "../firebase";

export async function listComments(articleId) {
  const q = query(
    collection(db, "comments"),
    where("articleId", "==", Number(articleId)),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addComment(articleId, name, message) {
  const payload = {
    articleId: Number(articleId),
    name: String(name || "").trim().slice(0, 32),
    message: String(message || "").trim().slice(0, 1200),
    createdAt: serverTimestamp(),
  };
  if (!payload.message) throw new Error("empty");
  await addDoc(collection(db, "comments"), payload);
}
