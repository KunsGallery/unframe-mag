import {
  collection, getDocs, query, where, orderBy, limit,
  addDoc, updateDoc, serverTimestamp, increment, doc
} from "firebase/firestore";
import { db } from "../firebase";

function safeGet(key){ try { return localStorage.getItem(key); } catch { return null; } }
function safeSet(key,val){ try { localStorage.setItem(key,val); } catch {} }

async function findPublishedDocByIdNumber(idNum) {
  const q = query(
    collection(db, "articles"),
    where("status", "==", "published"),
    where("id", "==", Number(idNum)),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0];
}

export async function getPublishedArticles() {
  const q = query(
    collection(db, "articles"),
    where("status", "==", "published"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ firebaseId: d.id, ...d.data() }));
}

export async function getPublishedArticleByIdNumber(idNum) {
  const d = await findPublishedDocByIdNumber(idNum);
  if (!d) return null;
  return { firebaseId: d.id, ...d.data() };
}

// ✅ 관리자 편집 페이지에서도 이걸 사용 (규칙상 공개로도 안전하게)
export async function getArticleByIdNumber(idNum) {
  // 지금은 published만. (admin-only draft 보려면 별도 규칙/쿼리 필요)
  return getPublishedArticleByIdNumber(idNum);
}

export async function getNextArticleId() {
  const q = query(collection(db, "articles"), orderBy("id", "desc"), limit(1));
  const snap = await getDocs(q);
  return snap.empty ? 1 : Number(snap.docs[0].data().id) + 1;
}

export async function createArticle(payload) {
  const clean = sanitizeArticlePayload(payload);
  const ref = await addDoc(collection(db, "articles"), {
    ...clean,
    createdAt: serverTimestamp(),
    likes: 0,
    views: 0,
  });
  return ref.id;
}

export async function updateArticle(firebaseId, payload) {
  const clean = sanitizeArticlePayload(payload);
  delete clean.createdAt;
  await updateDoc(doc(db, "articles", firebaseId), clean);
}

function sanitizeArticlePayload(p) {
  const out = {
    id: Number(p.id),
    title: String(p.title || "").trim(),
    category: String(p.category || "Exhibition"),
    excerpt: String(p.excerpt || "").trim(),
    status: p.status === "draft" ? "draft" : "published",
    contentHTML: String(p.contentHTML || ""),
    cover: String(p.cover || ""),
    coverThumb: String(p.coverThumb || ""),
    coverMedium: String(p.coverMedium || ""),
    tags: Array.isArray(p.tags) ? p.tags.map(String).filter(Boolean).slice(0, 30) : [],
  };
  Object.keys(out).forEach((k) => out[k] === undefined && delete out[k]);
  return out;
}

export async function listDraftArticles() {
  const q = query(
    collection(db, "articles"),
    where("status", "==", "draft"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ firebaseId: d.id, ...d.data() }));
}

const VIEW_COOLDOWN_MS = 30 * 60 * 1000;
export async function bumpViews(idNum) {
  const id = Number(idNum);
  const key = `UF_VIEW_AT_V1_${id}`;
  const last = Number(safeGet(key) || 0);
  const now = Date.now();
  if (last && now - last < VIEW_COOLDOWN_MS) return { ok: true, skipped: true };

  const d = await findPublishedDocByIdNumber(id);
  if (!d) throw new Error("Article not found");
  await updateDoc(doc(db, "articles", d.id), { views: increment(1) });
  safeSet(key, String(now));
  return { ok: true, skipped: false };
}

const LIKE_COOLDOWN_MS = 3 * 60 * 60 * 1000;
export async function bumpLikes(idNum) {
  const id = Number(idNum);
  const key = `UF_LIKE_AT_V1_${id}`;
  const last = Number(safeGet(key) || 0);
  const now = Date.now();
  if (last && now - last < LIKE_COOLDOWN_MS) {
    const e = new Error("cooldown");
    e.code = "COOLDOWN";
    throw e;
  }

  const d = await findPublishedDocByIdNumber(id);
  if (!d) throw new Error("Article not found");
  const currentLikes = Number(d.data()?.likes || 0);

  await updateDoc(doc(db, "articles", d.id), { likes: increment(1) });
  safeSet(key, String(now));
  return currentLikes + 1;
}
