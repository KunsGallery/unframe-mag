// src/services/articles.js
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  getDoc,
  doc,
  updateDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "../firebase";

/* =============================================================================
  ✅ 로컬 쿨다운 키
  - “글별로” 측정되게 id를 키에 포함
============================================================================= */
const VIEW_KEY = (id) => `UF_VIEW_COOLDOWN_${id}`;
const LIKE_KEY = (id) => `UF_LIKE_COOLDOWN_${id}`;

/* ✅ 쿨다운 시간 */
const VIEW_COOLDOWN_MS = 30 * 60 * 1000; // 30분
const LIKE_COOLDOWN_MS = 3 * 60 * 60 * 1000; // 3시간

function now() {
  return Date.now();
}

function canBump(key, cooldownMs) {
  try {
    const last = Number(localStorage.getItem(key) || 0);
    return now() - last >= cooldownMs;
  } catch {
    return true; // localStorage 막힌 환경이면 “허용” (UX 유지)
  }
}

function markBump(key) {
  try {
    localStorage.setItem(key, String(now()));
  } catch {}
}

/* =============================================================================
  ✅ published 글만 가져오기 (ListPage 용)
============================================================================= */
export async function getPublishedArticles() {
  const q = query(
    collection(db, "articles"),
    where("status", "==", "published"),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    firebaseId: d.id,
    ...d.data(),
  }));
}

/* =============================================================================
  ✅ published 글 1개 (ViewPage public 용)
  - rules 안전
============================================================================= */
export async function getPublishedArticleByIdNumber(idNum) {
  const q = query(
    collection(db, "articles"),
    where("status", "==", "published"),
    where("id", "==", Number(idNum)),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const d = snap.docs[0];
  return { firebaseId: d.id, ...d.data() };
}

/* =============================================================================
  ✅ (관리자용) status 무관하게 id로 1개 가져오기 (EditorPage에서 adminOk로 가드)
============================================================================= */
export async function getArticleByIdNumber(idNum) {
  const q = query(
    collection(db, "articles"),
    where("id", "==", Number(idNum)),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const d = snap.docs[0];
  return { firebaseId: d.id, ...d.data() };
}

/* =============================================================================
  ✅ 다음 글 id 발급 (가장 큰 id + 1)
  - 글이 많아도 1개만 읽음
============================================================================= */
export async function getNextArticleId() {
  const q = query(collection(db, "articles"), orderBy("id", "desc"), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return 1;

  const top = snap.docs[0].data();
  const maxId = Number(top?.id || 0);
  return (Number.isFinite(maxId) ? maxId : 0) + 1;
}

/* =============================================================================
  ✅ create (새 글)
  - rules: isAdmin()만 허용
  - undefined 금지(Firestore 에러 방지)
============================================================================= */
export async function createArticle(payload) {
  const safe = {
    id: Number(payload.id),
    title: String(payload.title || ""),
    category: String(payload.category || ""),
    excerpt: String(payload.excerpt || ""),
    contentHTML: String(payload.contentHTML || ""),

    cover: String(payload.cover || ""),
    coverThumb: String(payload.coverThumb || ""),
    coverMedium: String(payload.coverMedium || ""),

    tags: Array.isArray(payload.tags) ? payload.tags : [],
    status: String(payload.status || "published"),

    likes: Number(payload.likes || 0),
    views: Number(payload.views || 0),

    // ✅ createdAt: 새 글이면 serverTimestamp()
    createdAt: payload.createdAt ?? serverTimestamp(),
  };

  const ref = await addDoc(collection(db, "articles"), safe);
  return ref.id; // firebaseId
}

/* =============================================================================
  ✅ update (수정)
  - rules: isAdmin()만 전체 수정 가능
============================================================================= */
export async function updateArticle(firebaseId, payload) {
  if (!firebaseId) throw new Error("missing firebaseId");

  const safe = {
    id: Number(payload.id),
    title: String(payload.title || ""),
    category: String(payload.category || ""),
    excerpt: String(payload.excerpt || ""),
    contentHTML: String(payload.contentHTML || ""),

    cover: String(payload.cover || ""),
    coverThumb: String(payload.coverThumb || ""),
    coverMedium: String(payload.coverMedium || ""),

    tags: Array.isArray(payload.tags) ? payload.tags : [],
    status: String(payload.status || "published"),

    // ✅ createdAt 유지
    createdAt: payload.createdAt ?? null,
  };

  await updateDoc(doc(db, "articles", firebaseId), safe);
}

/* =============================================================================
  ✅ Draft 목록 (관리자용)
============================================================================= */
export async function listDraftArticles() {
  const q = query(
    collection(db, "articles"),
    where("status", "==", "draft"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ firebaseId: d.id, ...d.data() }));
}

/* =============================================================================
  ✅ Views +1 (public)
  - 30분 쿨다운 (글별)
  - rules에서 views 증가만 허용하는 조건이 있으니
    반드시 increment(1)만 수행해야 안전
============================================================================= */
export async function bumpViews(articleId) {
  const id = Number(articleId);
  const key = VIEW_KEY(id);

  if (!canBump(key, VIEW_COOLDOWN_MS)) {
    return null; // 조용히 무시
  }

  // published 글의 doc를 찾아서 업데이트
  const a = await getPublishedArticleByIdNumber(id);
  if (!a?.firebaseId) return null;

  await updateDoc(doc(db, "articles", a.firebaseId), {
    views: increment(1),
  });

  markBump(key);
  return true;
}

/* =============================================================================
  ✅ Likes +1 (public)
  - 3시간 쿨다운 (글별)
  - UI에서 “눌렀을 때 숫자가 계속 올라가는” 문제를 막기 위해
    bumpLikes에서 쿨다운 걸리고, ViewPage는 실패 시 UI 업데이트를 하지 않게 설계
============================================================================= */
export async function bumpLikes(articleId) {
  const id = Number(articleId);
  const key = LIKE_KEY(id);

  if (!canBump(key, LIKE_COOLDOWN_MS)) {
    // ViewPage에서 이 메시지를 보고 “3시간 뒤에…” 토스트 띄움
    throw new Error("cooldown");
  }

  const a = await getPublishedArticleByIdNumber(id);
  if (!a?.firebaseId) throw new Error("Article not found");

  await updateDoc(doc(db, "articles", a.firebaseId), {
    likes: increment(1),
  });

  markBump(key);

  // ✅ 즉시 UI 반영용: “현재 likes + 1” 값을 반환
  return Number(a.likes || 0) + 1;
}
