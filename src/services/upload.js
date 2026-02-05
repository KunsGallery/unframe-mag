// src/services/upload.js
export async function uploadImage(file) {
  if (!file) throw new Error("No file");

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

  // thumbUrl이 함수에서 내려오면 같이 반환(없어도 OK)
  return { url: data.url, thumbUrl: data.thumbUrl || "" };
}
