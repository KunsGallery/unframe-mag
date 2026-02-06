// src/services/upload.js
export async function uploadImage(file) {
  if (!file) throw new Error("No file");

  const fd = new FormData();
  fd.append("file", file, file.name);

  const endpoint =
  import.meta.env.DEV
    ? "http://localhost:8888/.netlify/functions/uploadImage"
    : `${window.location.origin}/.netlify/functions/uploadImage`;
    
  const res = await fetch(endpoint, {
    method: "POST",
    body: fd,
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    // JSON 파싱 실패 대비
    data = {};
  }

  if (!res.ok || !data?.ok || !data?.url) {
    console.error("uploadImage failed:", res.status, data);
    const msg =
      data?.error ||
      (res.status === 413 ? "File too large (413)" : "") ||
      `upload failed (${res.status})`;
    throw new Error(msg);
  }

  return {
    url: data.url,
    thumbUrl: data.thumbUrl || "",
    mediumUrl: data.mediumUrl || "",
  };
}
