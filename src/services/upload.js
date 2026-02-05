// src/services/upload.js
export async function uploadImage(file) {
  const fd = new FormData();
  fd.append("image", file);

  const res = await fetch("/.netlify/functions/uploadImage", {
    method: "POST",
    body: fd,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data?.url) {
    console.error("uploadImage failed:", res.status, data);
    throw new Error(data?.error || "upload failed");
  }

  return { url: data.url, thumbUrl: data.thumbUrl };
}
