// src/services/articles.js
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";

/** ✅ published 글 목록 */
export async function getPublishedArticles() {
  const q = query(
    collection(db, "articles"),
    where("status", "==", "published"),
    orderBy("id", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ firebaseId: d.id, ...d.data() }));
}

/** 다음 글 번호(id) */
export async function getNextArticleId() {
  const q = query(collection(db, "articles"), orderBy("id", "desc"), limit(1));
  const snap = await getDocs(q);
  return snap.empty ? 1 : Number(snap.docs[0].data().id) + 1;
}

/** id(넘버링)로 글 1개 */
export async function getArticleByIdNumber(idNum) {
  const q = query(collection(db, "articles"), where("id", "==", Number(idNum)), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { firebaseId: d.id, ...d.data() };
}

/** 새 글 생성 */
export async function createArticle(payload) {
  const data = {
    ...payload,
    id: Number(payload.id),
    createdAt: payload.createdAt ?? serverTimestamp(),
    likes: payload.likes ?? 0,
    views: payload.views ?? 0,
  };
  const ref = await addDoc(collection(db, "articles"), data);
  return ref.id;
}

/** 글 업데이트 (createdAt 유지) */
export async function updateArticle(firebaseId, payload) {
  const ref = doc(db, "articles", firebaseId);

  const cur = await getDoc(ref);
  const curData = cur.exists() ? cur.data() : {};

  const data = {
    ...payload,
    id: Number(payload.id),
    createdAt: curData.createdAt ?? payload.createdAt ?? null,
    likes: curData.likes ?? payload.likes ?? 0,
    views: curData.views ?? payload.views ?? 0,
  };

  await updateDoc(ref, data);
}

/** draft 목록 */
export async function listDraftArticles() {
  const q = query(
    collection(db, "articles"),
    where("status", "==", "draft"),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ firebaseId: d.id, ...d.data() }));
}

/** ✅ 조회수 +1 */
export async function bumpViews(firebaseId) {
  if (!firebaseId) return;
  await updateDoc(doc(db, "articles", firebaseId), { views: increment(1) });
}

/** ✅ 좋아요 +1 */
export async function bumpLikes(firebaseId) {
  if (!firebaseId) return;
  await updateDoc(doc(db, "articles", firebaseId), { likes: increment(1) });
}
