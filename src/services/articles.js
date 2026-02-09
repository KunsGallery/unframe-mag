// src/services/articles.js
// -----------------------------------------------------------------------------
// ✅ Articles service
// - 공개용: published 목록/단건 조회
// - 관리자용: create/update/getNextId/draft list
// - 공개용 통계: bumpViews/bumpLikes (쿨다운 포함)
//
// ✅ 이번 수정의 핵심
// 1) cover는 URL string을 유지(리스트/뷰 호환) + coverMeta에 object 저장
// 2) contentJSON 저장/유지 (scrollytelling/scene 확장용 초석)
// 3) getArticleByIdNumber는 draft 포함 조회(에디터가 사용)
// -----------------------------------------------------------------------------

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
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

/* =============================================================================
  ✅ 내부 유틸: 타입 안전 변환
============================================================================= */
function asNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asString(v) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function isPlainObject(x) {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

/* =============================================================================
  ✅ id(Number)로 published 문서 찾기 (공개용)
============================================================================= */
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
  ✅ id(Number)로 "draft 포함" 문서 찾기 (관리자/에디터용)
  - Firestore rules에서 draft 읽기는 관리자만 허용되어 있어야 함.
============================================================================= */
async function findAnyDocByIdNumber(idNum) {
  const q = query(
    collection(db, "articles"),
    where("id", "==", Number(idNum)),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0];
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
  ✅ Editor: id number로 글 조회 (draft 포함)
  - 에디터가 이 함수 사용하면 "Edit에서 내용 못 불러옴" 문제 해결됨.
============================================================================= */
export async function getArticleByIdNumber(idNum) {
  const d = await findAnyDocByIdNumber(idNum);
  if (!d) return null;
  return { firebaseId: d.id, ...d.data() };
}

/* =============================================================================
  ✅ Editor: 다음 글 id 발급
============================================================================= */
export async function getNextArticleId() {
  const q = query(collection(db, "articles"), orderBy("id", "desc"), limit(1));
  const snap = await getDocs(q);
  return snap.empty ? 1 : asNumber(snap.docs[0].data().id, 0) + 1;
}

/* =============================================================================
  ✅ Editor: create/update
  - createdAt은 새 글에서만 serverTimestamp()
  - 수정 시 createdAt은 유지(절대 변경 금지)
  - ✅ contentJSON 저장
  - ✅ coverMeta 저장 + cover는 URL string 유지(리스트/뷰 호환)
============================================================================= */
export async function createArticle(payload) {
  const clean = sanitizeArticlePayload(payload, { isCreate: true });

  const ref = await addDoc(collection(db, "articles"), {
    ...clean,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),

    // 통계 기본값(없으면 bump에서 increment가 동작하지만, 기본 세팅이 더 깔끔)
    likes: 0,
    views: 0,
  });

  return ref.id; // firebaseId 리턴
}

export async function updateArticle(firebaseId, payload) {
  if (!firebaseId) throw new Error("firebaseId missing");

  const clean = sanitizeArticlePayload(payload, { isCreate: false });

  // ✅ createdAt 절대 건드리지 않기
  delete clean.createdAt;

  // ✅ 수정시간 기록(선택)
  clean.updatedAt = serverTimestamp();

  await updateDoc(doc(db, "articles", firebaseId), clean);
}

/* =============================================================================
  ✅ payload 정리(undefined 제거 + 필드 안전화 + 호환성
  ------------------------------------------------------------
  cover 처리(중요):
  - 입력이 string이면: cover = string, coverMeta = null/유지
  - 입력이 object({url, publicId, width...})이면:
      cover = url string (기존 UI 호환)
      coverMeta = object (추후 parallax/ratio 등에 사용)
  ------------------------------------------------------------
  contentJSON 처리(중요):
  - TipTap getJSON() 결과를 그대로 저장(맵/배열 구조 Firestore OK)
============================================================================= */
function sanitizeArticlePayload(payload, { isCreate }) {
  const p = payload || {};

  const id = asNumber(p.id, 0);
  const title = asString(p.title).trim();
  const category = asString(p.category || "Exhibition");
  const excerpt = asString(p.excerpt).trim();

  // status
  const status = p.status === "draft" ? "draft" : "published";

  // content
  const contentHTML = asString(p.contentHTML || "");
  const contentJSON = isPlainObject(p.contentJSON) ? p.contentJSON : null;

  // cover: (string or object)
  // ✅ 절대 cover 필드를 object로 저장하지 말자(리스트/기존 코드 호환 깨짐)
  let cover = "";
  let coverMeta = null;

  if (typeof p.cover === "string") {
    cover = p.cover;
  } else if (isPlainObject(p.cover) && typeof p.cover.url === "string") {
    cover = p.cover.url;
    // meta는 필요한 것만 저장(불필요 데이터 폭증 방지)
    coverMeta = {
      url: p.cover.url,
      publicId: asString(p.cover.publicId || ""),
      width: asNumber(p.cover.width || 0, 0),
      height: asNumber(p.cover.height || 0, 0),
      format: asString(p.cover.format || ""),
      bytes: asNumber(p.cover.bytes || 0, 0),
    };
  } else if (typeof p.coverUrl === "string") {
    // 혹시 payload에서 coverUrl로 올 수도 있으면 대응
    cover = p.coverUrl;
  }

  // 기존 필드 유지(너 프로젝트가 coverThumb/coverMedium을 쓰고 있으면 계속 지원)
  const coverThumb = asString(p.coverThumb || "");
  const coverMedium = asString(p.coverMedium || "");

  // tags
  const tags = Array.isArray(p.tags)
    ? p.tags.map((x) => asString(x)).filter(Boolean).slice(0, 30)
    : [];

  const out = {
    id,
    title,
    category,
    excerpt,
    status,
    contentHTML,

    // ✅ scrollytelling 초석: JSON도 함께 저장
    // - null이면 저장 안 해도 되지만, update에서 지워지지 않게 null 저장은 비추
    ...(contentJSON ? { contentJSON } : {}),

    // ✅ cover는 URL string
    cover,
    coverThumb,
    coverMedium,

    // ✅ coverMeta는 object (있을 때만)
    ...(coverMeta ? { coverMeta } : {}),

    tags,
  };

  // ✅ undefined 제거(Firestore 싫어함)
  Object.keys(out).forEach((k) => {
    if (out[k] === undefined) delete out[k];
  });

  // create 시 최소 유효성 검사(원하면 더 강하게)
  if (isCreate) {
    if (!id || Number.isNaN(id)) throw new Error("Invalid id");
    if (!title) throw new Error("Title required");
  }

  return out;
}

/* =============================================================================
  ✅ Draft 목록 (optional)
  - draft에도 createdAt이 없으면 orderBy에서 에러가 나므로
    create 시 createdAt을 무조건 넣는 현재 구조가 안전
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
============================================================================= */
const VIEW_COOLDOWN_MS = 30 * 60 * 1000;

export async function bumpViews(idNum) {
  const id = Number(idNum);
  if (!id || Number.isNaN(id)) throw new Error("Invalid id");

  const key = `UF_VIEW_AT_V1_${id}`;
  const last = asNumber(safeGet(key) || 0, 0);
  const now = Date.now();

  // ✅ 쿨다운 안 지났으면 조용히 스킵
  if (last && now - last < VIEW_COOLDOWN_MS) {
    return { ok: true, skipped: true };
  }

  // ✅ published만 대상으로 증가(공개 글만 통계 증가)
  const d = await findPublishedDocByIdNumber(id);
  if (!d) throw new Error("Article not found");

  await updateDoc(doc(db, "articles", d.id), {
    views: increment(1),
  });

  safeSet(key, String(now));
  return { ok: true, skipped: false };
}

/* =============================================================================
  ✅ 핵심 2) Likes 증가 (3시간 쿨다운)
============================================================================= */
const LIKE_COOLDOWN_MS = 3 * 60 * 60 * 1000;

export async function bumpLikes(idNum) {
  const id = Number(idNum);
  if (!id || Number.isNaN(id)) throw new Error("Invalid id");

  const key = `UF_LIKE_AT_V1_${id}`;
  const last = asNumber(safeGet(key) || 0, 0);
  const now = Date.now();

  if (last && now - last < LIKE_COOLDOWN_MS) {
    const e = new Error("cooldown");
    e.code = "COOLDOWN";
    throw e;
  }

  const d = await findPublishedDocByIdNumber(id);
  if (!d) throw new Error("Article not found");

  const currentLikes = asNumber(d.data()?.likes || 0, 0);

  await updateDoc(doc(db, "articles", d.id), {
    likes: increment(1),
  });

  safeSet(key, String(now));

  // ✅ 낙관적 next (레이스가 있어도 UX엔 충분)
  return currentLikes + 1;
}
