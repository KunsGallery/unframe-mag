// src/services/articles.js
import {
  collection,
  getDocs,
  query,
  where,
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
  ✅ published 글만 가져오기 (ListPage 용)
  - ⚠️ where + orderBy 조합은 "인덱스" 없으면 실패할 수 있음
  - 그래서 여기서는 orderBy를 DB에서 하지 않고,
    가져온 뒤 프론트에서 createdAt 기준으로 정렬해줌.
============================================================================= */
export async function getPublishedArticles() {
  const q = query(
    collection(db, "articles"),
    where("status", "==", "published")
    // ❌ orderBy("createdAt","desc") 제거 (인덱스 필요해져서 리스트가 통째로 안 뜰 수 있음)
  );

  const snap = await getDocs(q);

  const list = snap.docs.map((d) => ({
    firebaseId: d.id,
    ...d.data(),
  }));

  // ✅ 프론트에서 createdAt desc 정렬 (인덱스 불필요)
  list.sort((a, b) => {
    const ax = a?.createdAt?.toMillis?.() ?? (a?.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0) ?? 0;
    const bx = b?.createdAt?.toMillis?.() ?? (b?.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0) ?? 0;
    return bx - ax;
  });

  return list;
}

/* =============================================================================
  ✅ id(Number)로 published 글 1개 가져오기 (ViewPage public 용)
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
  ✅ (관리자 편집용) firebaseId로 직접 가져오기 (Editor용)
============================================================================= */
export async function getArticleByFirebaseId(firebaseId) {
  const ref = doc(db, "articles", firebaseId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { firebaseId: snap.id, ...snap.data() };
}

/* =============================================================================
  ✅ (관리자 편집용) 글 번호(id)로 글 가져오기
  - EditorPage에서 수정 모드(/write/:id)로 들어올 때 사용
============================================================================= */
export async function getArticleByIdNumber(idNum) {
  // 관리자/비관리자 모두 쓸 수 있지만, rules에서 draft는 admin만 read 가능
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
  ✅ 다음 글 id 생성 (간단 버전)
  - config에 counter를 두는 방식이 더 안전하지만,
    지금 프로젝트 흐름 유지용으로 "최댓값 + 1" 방식을 제공.
============================================================================= */
export async function getNextArticleId() {
  // ✅ published/draft 전부 가져와서 max id 계산
  const snap = await getDocs(collection(db, "articles"));
  let maxId = 0;
  snap.docs.forEach((d) => {
    const id = Number(d.data()?.id || 0);
    if (id > maxId) maxId = id;
  });
  return maxId + 1;
}

/* =============================================================================
  ✅ 글 생성
  - firebaseId는 문서ID(d.id)
  - createdAt은 serverTimestamp()로 넣고,
    rules가 요구하는 필드 누락/undefined 방지
============================================================================= */
export async function createArticle(payload) {
  const safe = {
    ...payload,
    likes: Number(payload?.likes || 0),
    views: Number(payload?.views || 0),
    createdAt: payload?.createdAt ?? serverTimestamp(),
  };

  const ref = await addDoc(collection(db, "articles"), safe);
  return ref.id; // ✅ firebaseId 반환
}

/* =============================================================================
  ✅ 글 업데이트
============================================================================= */
export async function updateArticle(firebaseId, payload) {
  const safe = {
    ...payload,
    likes: Number(payload?.likes || 0),
    views: Number(payload?.views || 0),
    // createdAt은 수정 시에도 유지 (payload.createdAt이 null이면 그대로 두고 싶으면 EditorPage에서 유지 전달)
  };

  await updateDoc(doc(db, "articles", firebaseId), safe);
}

/* =============================================================================
  ✅ Draft 목록 (선택 UI용)
============================================================================= */
export async function listDraftArticles() {
  const q = query(
    collection(db, "articles"),
    where("status", "==", "draft")
    // ⚠️ orderBy 쓰면 인덱스 필요할 수 있어서 생략
  );
  const snap = await getDocs(q);

  const list = snap.docs.map((d) => ({ firebaseId: d.id, ...d.data() }));

  // createdAt desc 정렬
  list.sort((a, b) => {
    const ax = a?.createdAt?.toMillis?.() ?? (a?.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0) ?? 0;
    const bx = b?.createdAt?.toMillis?.() ?? (b?.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0) ?? 0;
    return bx - ax;
  });

  return list;
}

/* =============================================================================
  ✅ likes/views bump (네 rules가 허용하는 범위에서 증가만)
  - 여기서는 간단 버전 (쿨다운/로컬키 기반은 네 기존 로직이 있으면 유지)
============================================================================= */
export async function bumpLikes(idNum) {
  // ⚠️ 기존 프로젝트에 쿨다운 로직이 있으면 그걸 유지하고,
  // 아래는 "증가"만 확실히 되도록 최소 구현.
  const q = query(collection(db, "articles"), where("id", "==", Number(idNum)), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("Article not found");

  const d = snap.docs[0];
  const ref = doc(db, "articles", d.id);

  await updateDoc(ref, { likes: increment(1) });

  const next = Number(d.data()?.likes || 0) + 1;
  return next;
}

export async function bumpViews(idNum) {
  const q = query(collection(db, "articles"), where("id", "==", Number(idNum)), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return;

  const d = snap.docs[0];
  const ref = doc(db, "articles", d.id);

  await updateDoc(ref, { views: increment(1) });
}
