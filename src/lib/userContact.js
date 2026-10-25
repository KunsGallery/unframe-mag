// src/lib/userContact.js
import { deleteField, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

const STAFF_ROLES = new Set(["editor", "admin"]);

export function userContactRef(db, uid) {
  return doc(db, "users", uid, "private", "contact");
}

// Public profiles are readable by anyone. Only staff keep an email there,
// because their email is already public as an article author and the
// author box looks profiles up by it. Everyone else keeps it private.
export function publicEmailChange(profile, email, { isAdmin = false } = {}) {
  const current = profile?.email;
  const isStaff = isAdmin || STAFF_ROLES.has(String(profile?.role || ""));
  if (isStaff) return email && current !== email ? { email } : null;
  return current !== undefined ? { email: deleteField() } : null;
}

export async function syncUserContact(db, user, profile, { isAdmin = false } = {}) {
  if (!user?.uid || !user.email) return;
  await setDoc(userContactRef(db, user.uid), { email: user.email, updatedAt: serverTimestamp() });
  const change = publicEmailChange(profile, user.email, { isAdmin });
  if (change) {
    await updateDoc(doc(db, "users", user.uid), { ...change, updatedAt: serverTimestamp() });
  }
}
