import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log("[firebase env check]", {
  apiKey: firebaseConfig.apiKey ? "OK" : "MISSING",
  authDomain: firebaseConfig.authDomain ? "OK" : "MISSING",
  projectId: firebaseConfig.projectId ? "OK" : "MISSING",
  storageBucket: firebaseConfig.storageBucket ? "OK" : "MISSING",
  messagingSenderId: firebaseConfig.messagingSenderId ? "OK" : "MISSING",
  appId: firebaseConfig.appId ? "OK" : "MISSING",
});

if (
  !firebaseConfig.apiKey ||
  !firebaseConfig.authDomain ||
  !firebaseConfig.projectId ||
  !firebaseConfig.appId
) {
  throw new Error("Firebase env missing in deployed build");
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);