import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { connectFirestoreEmulator, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../src/firebase/config';
import EditorPage from '../src/Pages/EditorPage';
import '../src/styles/index.css';

// Isolated UI fixture. Never mount a mock identity against a real backend.
if (!import.meta.env.DEV || import.meta.env.VITE_FIREBASE_PROJECT_ID !== 'demo-unframe-mag'
  || !['localhost', '127.0.0.1'].includes(location.hostname)) throw new Error('Local emulator fixture only');
const user = new URLSearchParams(location.search).has('fresh')
  ? { uid: 'qa-fresh', email: 'cybog2004@gmail.com', displayName: '모바일 검수 에디터' }
  : { uid: 'qa-admin', email: 'gallerykuns@gmail.com', displayName: '검수 에디터' };
connectFirestoreEmulator(db, '127.0.0.1', 8085, { mockUserToken: { sub: user.uid, email: user.email, email_verified: true } });
const draft = doc(db, 'articles', 'qa-draft');
if (!(await getDoc(draft)).exists()) await setDoc(draft, {
  title: '전시를 기록하는 새로운 방법', subtitle: '에디터 작업 흐름 검수', category: 'EXHIBITION', status: 'draft',
  authorEmail: user.email, author: user.displayName, cover: '/icons/icon-512.png', coverMedium: '/icons/icon-512.png',
  contentHTML: '<h2>첫 번째 장면</h2><p>전시의 첫인상과 작품에 대한 이야기를 기록합니다.</p><h2>작품을 가까이 보다</h2><p>사진과 캡션, 인터뷰를 함께 편집합니다.</p>',
  likes: 0, views: 0,
});
await setDoc(draft, { createdAt: serverTimestamp(), updatedAt: serverTimestamp(), cover: '/icons/icon-512.png', coverMedium: '/icons/icon-512.png' }, { merge: true });
const counter = doc(db, 'counters', 'articles');
if (!(await getDoc(counter)).exists()) await setDoc(counter, { lastIndex: 0, articleId: '' });
const router = createBrowserRouter([{ path: '*', element: <><header style={{ height: 80, position: 'sticky', top: 0, background: 'white', borderBottom: '1px solid #ddd', zIndex: 50, padding: 24 }}>UNFRAME · Local QA</header><EditorPage user={user} role="admin" onToast={(message) => { document.getElementById('qa-status').textContent = message; }} /><div id="qa-status" role="status" style={{ position: 'fixed', bottom: 10, left: 10, background: 'white', zIndex: 55 }} /></> }]);
createRoot(document.getElementById('root')).render(<RouterProvider router={router} />);
