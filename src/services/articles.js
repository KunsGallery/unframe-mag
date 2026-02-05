// src/services/articles.js
import { db } from "../firebase";
import {
  addDoc, collection, doc, getDoc, getDocs, increment,
  limit, orderBy, query, updateDoc, where
} from "firebase/firestore";

export async function getPublishedArticles() {
  const q = query(collection(db, "articles"), where("status", "==", "published"), orderBy("id", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ firebaseId: d.id, ...d.data() }));
}

export async function getArticleByIdNumber(idNumber) {
  const q = query(collection(db, "articles"), where("id", "==", Number(idNumber)), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { firebaseId: d.id, ...d.data() };
}

export async function bumpViews(firebaseId) {
  await updateDoc(doc(db, "articles", firebaseId), { views: increment(1) });
}

export async function bumpLikes(firebaseId) {
  await updateDoc(doc(db, "articles", firebaseId), { likes: increment(1) });
}

export async function getNextArticleId() {
  const q = query(collection(db, "articles"), orderBy("id", "desc"), limit(1));
  const snap = await getDocs(q);
  return snap.empty ? 1 : Number(snap.docs[0].data().id) + 1;
}

export async function upsertArticle({ firebaseId, payload }) {
  if (firebaseId) {
    // createdAt, likes, views 보존
    const cur = await getDoc(doc(db, "articles", firebaseId));
    const curData = cur.exists() ? cur.data() : {};

    const safePayload = {
      ...payload,
      createdAt: curData.createdAt ?? payload.createdAt ?? new Date(),
      likes: curData.likes ?? 0,
      views: curData.views ?? 0,
    };

    await updateDoc(doc(db, "articles", firebaseId), safePayload);
    return { firebaseId, data: safePayload };
  }

  const ref = await addDoc(collection(db, "articles"), {
    ...payload,
    createdAt: payload.createdAt ?? new Date(),
    likes: 0,
    views: 0,
  });
  return { firebaseId: ref.id, data: payload };
}
