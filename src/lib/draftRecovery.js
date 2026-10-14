const PREFIX = "unframe:draft-recovery:v1:";
const FIELDS = ["title", "subtitle", "category", "cover", "coverMedium", "contentHTML"];

export function recoveryKey(userId, documentId = null) {
  const scope = documentId ? `document:${encodeURIComponent(documentId)}` : "new";
  return userId ? `${PREFIX}${encodeURIComponent(userId)}:${scope}` : null;
}

export function draftSnapshot(meta, contentHTML) {
  return Object.fromEntries(FIELDS.map((field) => [field, String((field === "contentHTML" ? contentHTML : meta?.[field]) ?? "")]));
}

export function readRecovery(storage, key) {
  if (!storage || !key) return null;
  try {
    const record = JSON.parse(storage.getItem(key));
    if (record?.version !== 1 || typeof record.token !== "string" || !Number.isFinite(record.savedAt) ||
        !FIELDS.every((field) => typeof record.snapshot?.[field] === "string")) return null;
    return record;
  } catch {
    return null;
  }
}

export function writeRecovery(storage, key, snapshot) {
  if (!storage || !key) return null;
  const savedAt = Date.now();
  const record = { version: 1, savedAt, token: `${savedAt}:${Math.random()}`, snapshot };
  try {
    storage.setItem(key, JSON.stringify(record));
    return record;
  } catch {
    return null;
  }
}

// A completed request must not delete edits made while it was in flight (or in another tab).
export function removeRecovery(storage, key, expectedToken) {
  if (!storage || !key || !expectedToken) return false;
  try {
    if (readRecovery(storage, key)?.token !== expectedToken) return false;
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function browserRecoveryStorage() {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

// A newly created server draft does not change the editor URL. Remember its ID
// so its per-document recovery remains discoverable after a reload of /editor.
export function activeRecoveryDocument(storage, userId, documentId) {
  const key = recoveryKey(userId);
  if (!storage || !key) return null;
  try {
    if (documentId !== undefined) storage.setItem(`${key}:active`, JSON.stringify(documentId));
    const value = JSON.parse(storage.getItem(`${key}:active`));
    return typeof value === "string" && value ? value : null;
  } catch {
    return null;
  }
}

export function nextEdition(counter, articles) {
  const values = [counter == null ? 0 : counter.lastIndex, ...articles.map((article) => article.sortIndex ?? 0)];
  if (values.some((value) => !Number.isSafeInteger(value) || value < 0)) throw new Error("Invalid article counter");
  const nextIndex = Math.max(...values) + 1;
  if (!Number.isSafeInteger(nextIndex)) throw new Error("Article counter exhausted");
  return { nextIndex, nextEditionNo: String(nextIndex).padStart(3, "0") };
}
