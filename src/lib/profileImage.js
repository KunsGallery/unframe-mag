function readImageUrl(source) {
  if (!source) return "";
  if (typeof source === "string") return String(source).trim();

  const candidates = [
    source.photoURL,
    source.avatarUrl,
    source.profileImage,
    source.imageUrl,
    source.url,
  ];

  for (const candidate of candidates) {
    const value = String(candidate || "").trim();
    if (value) return value;
  }

  return "";
}

function readDisplayName(source) {
  if (!source) return "";
  if (typeof source === "string") return String(source).trim();

  const candidates = [
    source.displayName,
    source.name,
    source.nickname,
    source.authorName,
    source.editorName,
    source.profileName,
    source.fullName,
  ];

  for (const candidate of candidates) {
    const value = String(candidate || "").trim();
    if (value) return value;
  }

  return "";
}

export function resolveProfilePhotoURL(...sources) {
  for (const source of sources) {
    const value = readImageUrl(source);
    if (value) return value;
  }
  return null;
}

export function resolveProfileDisplayName(...sources) {
  for (const source of sources) {
    const value = readDisplayName(source);
    if (value) return value;
  }
  return "";
}

export function getProfileInitials(name) {
  const v = String(name || "").trim();
  if (!v) return "U#";
  return v.slice(0, 2).toUpperCase();
}
