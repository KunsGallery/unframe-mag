import { db } from "../firebase/config";
import { 
  collection, doc, getDoc, getDocs, addDoc, updateDoc, 
  query, where, orderBy, increment, serverTimestamp 
} from "firebase/firestore";

const COLLECTION_NAME = "articles";

// 1. 아티클 목록 불러오기 (공개된 글만)
export const getPublishedArticles = async () => {
  const q = query(
    collection(db, COLLECTION_NAME), 
    where("status", "==", "published"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// 2. 단일 아티클 불러오기
export const getArticleById = async (docId) => {
  const docRef = doc(db, COLLECTION_NAME, docId);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() };
  }
  return null;
};

// 3. 관리자용: 아티클 저장/수정
export const saveArticle = async (articleData, docId = null) => {
  if (docId) {
    const docRef = doc(db, COLLECTION_NAME, docId);
    await updateDoc(docRef, { ...articleData, updatedAt: serverTimestamp() });
    return docId;
  } else {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...articleData,
      likes: 0,
      views: 0,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }
};

// 4. 일반 사용자용: 조회수/좋아요 증가 (보안 규칙에 허용된 루프홀 활용)
export const bumpMetric = async (docId, type) => {
  const docRef = doc(db, COLLECTION_NAME, docId);
  if (type === "views") {
    await updateDoc(docRef, { views: increment(1) });
  } else if (type === "likes") {
    await updateDoc(docRef, { likes: increment(1) });
  }
};