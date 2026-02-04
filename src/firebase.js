import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD26MDUZPTxe2GO8mtDva8KLmEKKWj4jjk",
  authDomain: "uarchive-8e437.firebaseapp.com",
  projectId: "uarchive-8e437",
  storageBucket: "uarchive-8e437.firebasestorage.app",
  messagingSenderId: "563276874950",
  appId: "1:563276874950:web:1d57b5c1fad491fd3203c7",
  measurementId: "G-P1Q60T0TWV",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
