// src/services/articles.js
import {
  collection,
  addDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "../firebase";

/* =========================
   ✅ Cooldown (article별)
========================= */
const VIEW_TTL_MS = 30 * 60 * 1000; // 30분
const LIKE_TTL_MS = 3 * 60 * 60 * 1000; // 3시간

function nowMs() {
  return Date.now();
}
function lsGetNum(key) {
  try {
    return Number(localStorage.getItem(key) || 0);
  } catch {
    return 0;
  }
}
function lsSetNum(key, v) {
  try {
    localStorage.setItem(key, String(v));
  } catch {}
}
function cooldownKey(type, idNum) {
  return `uf:${type}:${Number(idNum)}`;
}

export function getCooldownRemainingMs(type, idNum) {
  const ttl = type === "view" ? VIEW_TTL_MS : LIKE_TTL_MS;
  const key = cooldownKey(type, idNum);
  const last = lsGetNum(key);
  if (!last) return 0;
  const remain = ttl - (nowMs() - last);
  return remain > 0 ? remain : 0;
}
export function canBump(type, idNum) {
  return getCooldownRemainingMs(type, idNum) === 0;
}
function markBumped(type, idNum) {
  lsSetNum(cooldownKey(type, idNum), nowMs());
}
export function formatRemain(ms) {
  if (!ms) return "";
  const m = Math.ceil(ms / 60000);
  if (m < 60) return `${m}분`;
  const h = Math.ceil(m / 60);
  return `${h}시간`;
}

/* =========================
   ✅ Schema normalize (안전장치)
========================= */
export function normalizeArticle(raw = {}, firebaseId = "") {
  const a = raw || {};
  return {
    firebaseId,
    id: Number(a.id || 0),
    title: String(a.title || ""),
    category: String(a.category || "Exhibition"),
    excerpt: String(a.excerpt || ""),
    contentHTML: String(a.contentHTML || ""),
    cover: String(a.cover || ""),
    coverThumb: String(a.coverThumb || ""),
    tags: Array.isArray(a.tags) ? a.tags.filter(Boolean).map(String) : [],
    status: String(a.status || "published"),
    likes: Number(a.likes || 0),
    views: Number(a.views || 0),
    createdAt: a.createdAt ?? null,
    pollQuestion: a.pollQuestion ?? "",
    pollOption1: a.pollOption1 ?? "",
    pollOption2: a.pollOption2 ?? "",
    pollVotes1: Number(a.pollVotes1 || 0),
    pollVotes2: Number(a.pollVotes2 || 0),
    pollFreeAnswer: a.pollFreeAnswer ?? "",
    mapEmbed: a.mapEmbed ?? "",
  };
}

/* =========================
   ✅ Read time
========================= */
export function estimateReadMinutesFromHTML(html) {
  const text = String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const chars = text.length;
  return Math.max(1, Math.ceil(chars / 900));
}

/* =========================
   ✅ 내부: id(글 넘버)로 문서 스냅샷 찾기
========================= */
async function getArticleDocSnapByIdNumber(idNum) {
  const q = query(collection(db, "articles"), where("id", "==", Number(idNum)), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0];
}

/* =========================
   ✅ CRUD
========================= */
export async function getNextArticleId() {
  const q = query(collection(db, "articles"), orderBy("id", "desc"), limit(1));
  const snap = await getDocs(q);
  return snap.empty ? 1 : Number(snap.docs[0].data().id) + 1;
}

export async function getArticleByIdNumber(idNum) {
  const docSnap = await getArticleDocSnapByIdNumber(idNum);
  if (!docSnap) return null;
  return normalizeArticle(docSnap.data(), docSnap.id);
}

export async function getPublishedArticles() {
  const q = query(
    collection(db, "articles"),
    where("status", "==", "published"),
    orderBy("id", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => normalizeArticle(d.data(), d.id));
}

export async function listDraftArticles() {
  const q = query(collection(db, "articles"), where("status", "==", "draft"), orderBy("id", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => normalizeArticle(d.data(), d.id));
}

export async function createArticle(payload) {
  const safe = normalizeArticle(payload, "");
  if (!safe.createdAt) safe.createdAt = new Date();

  // ✅ Firestore는 undefined 저장 불가 → firebaseId 필드를 아예 제거
  const { firebaseId, ...toSave } = safe;

  const docRef = await addDoc(collection(db, "articles"), toSave);
  return docRef.id;
}

export async function updateArticle(firebaseId, payload) {
  if (!firebaseId) throw new Error("firebaseId missing");
  const safe = { ...payload };
  delete safe.firebaseId;
  await updateDoc(doc(db, "articles", String(firebaseId)), safe);
}

/* =========================
   ✅ bump views/likes
========================= */
export async function bumpViews(idNum) {
  if (!canBump("view", idNum)) return null;
  const docSnap = await getArticleDocSnapByIdNumber(idNum);
  if (!docSnap) throw new Error("Article not found");

  await updateDoc(docSnap.ref, { views: increment(1) });
  markBumped("view", idNum);

  const current = Number(docSnap.data()?.views || 0);
  return current + 1;
}

export async function bumpLikes(idNum) {
  if (!canBump("like", idNum)) return null;
  const docSnap = await getArticleDocSnapByIdNumber(idNum);
  if (!docSnap) throw new Error("Article not found");

  await updateDoc(docSnap.ref, { likes: increment(1) });
  markBumped("like", idNum);

  const current = Number(docSnap.data()?.likes || 0);
  return current + 1;
}

/* =========================
   ✅ Prev/Next
========================= */
export async function getPrevNextPublished(currentId) {
  const prevQ = query(
    collection(db, "articles"),
    where("status", "==", "published"),
    where("id", "<", Number(currentId)),
    orderBy("id", "desc"),
    limit(1)
  );
  const nextQ = query(
    collection(db, "articles"),
    where("status", "==", "published"),
    where("id", ">", Number(currentId)),
    orderBy("id", "asc"),
    limit(1)
  );

  const [prevSnap, nextSnap] = await Promise.all([getDocs(prevQ), getDocs(nextQ)]);
  const prev = prevSnap.empty ? null : normalizeArticle(prevSnap.docs[0].data(), prevSnap.docs[0].id);
  const next = nextSnap.empty ? null : normalizeArticle(nextSnap.docs[0].data(), nextSnap.docs[0].id);
  return { prev, next };
}

/* =========================
   ✅ Editor Pick
========================= */
export async function getEditorPickId() {
  const ref = doc(db, "config", "home");
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const v = snap.data()?.editorPickId;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function getEditorPickArticle() {
  const idNum = await getEditorPickId();
  if (!idNum) return null;
  return await getArticleByIdNumber(idNum);
}
