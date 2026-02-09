// src/services/articles.js
// -----------------------------------------------------------------------------
// ✅ Articles service
// - published 글 목록/단건 조회
// - 관리자용: create/update/getNextId 등
// - 공개용: bumpViews/bumpLikes (쿨다운 포함)  ← 오늘의 핵심
//
// ⚠️ Firestore rules에서 일반 유저 update를 likes/views 증가만 허용하는 구조라면
//    updateDoc({ likes: increment(1) }) 같은 "부분 업데이트"가 가장 안전합니다.
// -----------------------------------------------------------------------------

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "../firebase";

/* =============================================================================
  ✅ 내부 유틸: localStorage (쿨다운 기록)
============================================================================= */
function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch {}
}

/** ✅ 글 하나를 "id(Number)"로 찾는 공통 헬퍼 (published만) */
async function findPublishedDocByIdNumber(idNum) {
  const q = query(
    collection(db, "articles"),
    where("status", "==", "published"),
    where("id", "==", Number(idNum)),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0]; // QueryDocumentSnapshot
}

/* =============================================================================
  ✅ ListPage: published 글 목록
============================================================================= */
export async function getPublishedArticles() {
  const q = query(
    collection(db, "articles"),
    where("status", "==", "published"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ firebaseId: d.id, ...d.data() }));
}

/* =============================================================================
  ✅ ViewPage: published 글 단건 조회 (id number)
============================================================================= */
export async function getPublishedArticleByIdNumber(idNum) {
  const d = await findPublishedDocByIdNumber(idNum);
  if (!d) return null;
  return { firebaseId: d.id, ...d.data() };
}

/* =============================================================================
  ✅ (에디터에서도 재사용 가능) id number로 글 조회
  - draft까지 보려면 별도 admin 쿼리 필요하지만
  - 네가 지금은 보통 editor는 관리자만 들어오니까, 기존 로직대로 유지해도 됨
============================================================================= */
export async function getArticleByIdNumber(idNum) {
  // 여기서는 published만 가져오게 해둠 (안전)
  return getPublishedArticleByIdNumber(idNum);
}

/* =============================================================================
  ✅ Editor: 다음 글 id 발급
============================================================================= */
export async function getNextArticleId() {
  const q = query(collection(db, "articles"), orderBy("id", "desc"), limit(1));
  const snap = await getDocs(q);
  return snap.empty ? 1 : Number(snap.docs[0].data().id) + 1;
}

/* =============================================================================
  ✅ Editor: create/update
  - createdAt은 새 글에서만 serverTimestamp()
  - 수정 시 createdAt은 유지(절대 변경 금지)
============================================================================= */
export async function createArticle(payload) {
  // ✅ undefined 금지(룰/데이터 깨짐 방지)
  const clean = sanitizeArticlePayload(payload, { isCreate: true });

  const ref = await addDoc(collection(db, "articles"), {
    ...clean,
    createdAt: serverTimestamp(),
    likes: 0,
    views: 0,
  });

  return ref.id; // firebaseId 리턴
}

export async function updateArticle(firebaseId, payload) {
  if (!firebaseId) throw new Error("firebaseId missing");
  const clean = sanitizeArticlePayload(payload, { isCreate: false });

  // ✅ createdAt 절대 건드리지 않기: update payload에서 제거
  // (룰에서 createdAt 동일성 검사하는 경우가 많아서 안정적)
  delete clean.createdAt;

  await updateDoc(doc(db, "articles", firebaseId), clean);
}

/** ✅ payload 정리(undefined 제거 + 필드 안전화) */
function sanitizeArticlePayload(payload, { isCreate }) {
  const p = payload || {};
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

  // 수정/생성 공통: createdAt은 create에서만 서버타임으로 넣고, update에서는 유지하므로 굳이 안 넣음
  if (!isCreate) {
    // out.createdAt은 넣지 않음(업데이트에서 건드리지 않기)
  }

  // ✅ undefined 제거(Firestore가 싫어함)
  Object.keys(out).forEach((k) => {
    if (out[k] === undefined) delete out[k];
  });

  return out;
}

/* =============================================================================
  ✅ Draft 목록 (optional)
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
  ✅ 핵심 1) Views 증가 (30분 쿨다운)
  - 글마다 별도 키를 사용 → 1번 글이 2번 글에 영향 X
  - 성공했을 때만 localStorage 기록(정확도↑)
============================================================================= */
const VIEW_COOLDOWN_MS = 30 * 60 * 1000;

export async function bumpViews(idNum) {
  const id = Number(idNum);
  if (!id || Number.isNaN(id)) throw new Error("Invalid id");

  const key = `UF_VIEW_AT_V1_${id}`;
  const last = Number(safeGet(key) || 0);
  const now = Date.now();

  // ✅ 쿨다운 안 지났으면 아무것도 안 함(조용히)
  if (last && now - last < VIEW_COOLDOWN_MS) {
    return { ok: true, skipped: true };
  }

  // ✅ 문서 찾기
  const d = await findPublishedDocByIdNumber(id);
  if (!d) throw new Error("Article not found");

  // ✅ 부분 업데이트: views만 +1
  await updateDoc(doc(db, "articles", d.id), {
    views: increment(1),
  });

  // ✅ 성공했을 때만 기록
  safeSet(key, String(now));

  return { ok: true, skipped: false };
}

/* =============================================================================
  ✅ 핵심 2) Likes 증가 (3시간 쿨다운)
  - 성공했을 때만 localStorage 기록
  - 반환값: "다음 likes 수(낙관적)" 를 ViewPage에서 UI에 바로 반영 가능
============================================================================= */
const LIKE_COOLDOWN_MS = 3 * 60 * 60 * 1000;

export async function bumpLikes(idNum) {
  const id = Number(idNum);
  if (!id || Number.isNaN(id)) throw new Error("Invalid id");

  const key = `UF_LIKE_AT_V1_${id}`;
  const last = Number(safeGet(key) || 0);
  const now = Date.now();

  if (last && now - last < LIKE_COOLDOWN_MS) {
    // ✅ ViewPage에서 이 메시지를 보고 "3시간 뒤" 토스트 띄울 수 있게
    const e = new Error("cooldown");
    e.code = "COOLDOWN";
    throw e;
  }

  const d = await findPublishedDocByIdNumber(id);
  if (!d) throw new Error("Article not found");

  const currentLikes = Number(d.data()?.likes || 0);

  await updateDoc(doc(db, "articles", d.id), {
    likes: increment(1),
  });

  safeSet(key, String(now));

  // ✅ 낙관적 next
  return currentLikes + 1;
}
