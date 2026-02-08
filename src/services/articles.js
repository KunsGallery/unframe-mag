// src/services/articles.js
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "../firebase";

/* =============================================================================
  ✅ 내부 유틸: 글번호(id)로 문서 1개 찾기
  - 반환: { firebaseId, ...data } 또는 null
============================================================================= */
async function findByIdNumber(idNum) {
  const n = Number(idNum);
  if (!n || Number.isNaN(n)) return null;

  const q = query(collection(db, "articles"), where("id", "==", n), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const d = snap.docs[0];
  return { firebaseId: d.id, ...d.data() };
}

/* =============================================================================
  ✅ (외부 사용) 글번호로 글 가져오기
============================================================================= */
export async function getArticleByIdNumber(idNum) {
  return await findByIdNumber(idNum);
}

/* =============================================================================
  ✅ 다음 글 번호(id) 만들기
============================================================================= */
export async function getNextArticleId() {
  const q = query(collection(db, "articles"), orderBy("id", "desc"), limit(1));
  const snap = await getDocs(q);
  return snap.empty ? 1 : Number(snap.docs[0].data().id) + 1;
}

/* =============================================================================
  ✅ published 글 목록 (ListPage 용)
============================================================================= */
export async function getPublishedArticles() {
  const q = query(collection(db, "articles"), where("status", "==", "published"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ firebaseId: d.id, ...d.data() }));
}

/* =============================================================================
  ✅ draft 글 목록 (EditorPage Draft 박스 용)
============================================================================= */
export async function listDraftArticles() {
  const q = query(collection(db, "articles"), where("status", "==", "draft"), orderBy("id", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ firebaseId: d.id, ...d.data() }));
}

/* =============================================================================
  ✅ 글 생성
  - createdAt은 serverTimestamp로 최초 생성
  - likes/views는 0으로 시작
============================================================================= */
export async function createArticle(payload) {
  const clean = stripUndefined(payload);

  // createdAt은 "최초 생성" 시에만 설정 (수정에서 건드리지 않기)
  if (!clean.createdAt) clean.createdAt = serverTimestamp();

  if (typeof clean.likes !== "number") clean.likes = 0;
  if (typeof clean.views !== "number") clean.views = 0;

  const ref = await addDoc(collection(db, "articles"), clean);
  return ref.id; // firebaseId
}

/* =============================================================================
  ✅ 글 수정
  - createdAt은 절대 변경하지 않는게 목표
============================================================================= */
export async function updateArticle(firebaseId, payload) {
  if (!firebaseId) throw new Error("firebaseId missing");
  const clean = stripUndefined(payload);

  // ✅ createdAt은 수정에서 건드리지 않도록 제거(안전)
  delete clean.createdAt;

  await updateDoc(doc(db, "articles", firebaseId), clean);
}

/* =============================================================================
  ✅ 좋아요 증가
  - target: (1) firebaseId 문자열 or (2) 글번호 숫자
  - delta: 기본 1
============================================================================= */
export async function bumpLikes(target, delta = 1) {
  const inc = Number(delta) || 1;

  // 1) firebaseId로 들어오면 바로 업데이트
  if (typeof target === "string" && target.length > 10) {
    await updateDoc(doc(db, "articles", target), { likes: increment(inc) });
    return;
  }

  // 2) 글번호로 들어오면 문서 찾아서 업데이트
  const a = await findByIdNumber(target);
  if (!a?.firebaseId) throw new Error("Article not found");
  await updateDoc(doc(db, "articles", a.firebaseId), { likes: increment(inc) });
}

/* =============================================================================
  ✅ 조회수 증가 (View 진입 시)
  - target: firebaseId 또는 글번호
============================================================================= */
export async function bumpViews(target, delta = 1) {
  const inc = Number(delta) || 1;

  if (typeof target === "string" && target.length > 10) {
    await updateDoc(doc(db, "articles", target), { views: increment(inc) });
    return;
  }

  const a = await findByIdNumber(target);
  if (!a?.firebaseId) throw new Error("Article not found");
  await updateDoc(doc(db, "articles", a.firebaseId), { views: increment(inc) });
}

/* =============================================================================
  ✅ undefined 제거 (Firestore는 undefined 저장 불가)
============================================================================= */
function stripUndefined(obj) {
  const out = {};
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v !== undefined) out[k] = v;
  });
  return out;
}
