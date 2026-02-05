// src/services/upload.js
import { fileToDataUrl } from "../utils/image";

export async function uploadFile(file) {
  const dataUrl = await fileToDataUrl(file);

  const res = await fetch("/.netlify/functions/uploadImage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl, name: file.name }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok || !data?.url) {
    console.error("upload failed", data);
    throw new Error(data?.error || "upload failed");
  }
  return data.url;
}
