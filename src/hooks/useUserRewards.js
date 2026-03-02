// src/hooks/useUserRewards.js
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export async function grantSticker({ uid, stickerId, adminEmail, note }) {
  await setDoc(doc(db, "users", uid, "stickers", stickerId), {
    stickerId,
    grantedAt: serverTimestamp(),
    grantedBy: adminEmail || null,
    note: note || null,
  });
}

export async function revokeSticker({ uid, stickerId }) {
  await deleteDoc(doc(db, "users", uid, "stickers", stickerId));
}

export async function setUserXP({ uid, xp }) {
  await updateDoc(doc(db, "users", uid), {
    xp: Number(xp || 0),
    updatedAt: serverTimestamp(),
  });
}

export async function setUserTier({ uid, tierKey, tierLabel, tierColor, level }) {
  await updateDoc(doc(db, "users", uid), {
    tier: tierKey,
    tierLabel: tierLabel || tierKey,
    tierColor: tierColor || null,
    level: Number(level || 1),
    updatedAt: serverTimestamp(),
  });
}