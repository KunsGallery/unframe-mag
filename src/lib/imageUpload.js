// src/lib/imageUpload.js
const provider = import.meta.env.VITE_IMAGE_PROVIDER || "cloudinary";

async function uploadCloudinary(file) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !preset) throw new Error("Cloudinary env missing");

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", preset);

  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) throw new Error("Cloudinary upload failed");
  const json = await res.json();
  return json.secure_url;
}

async function uploadImgbb(file) {
  const key = import.meta.env.VITE_IMGBB_API_KEY;
  if (!key) throw new Error("imgbb key missing");

  const url = `https://api.imgbb.com/1/upload?key=${key}`;
  const form = new FormData();
  form.append("image", file);

  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) throw new Error("imgbb upload failed");
  const json = await res.json();
  return json.data.url;
}

export async function uploadImage(file) {
  try {
    if (provider === "imgbb") return await uploadImgbb(file);
    return await uploadCloudinary(file);
  } catch (e) {
    // fallback
    if (provider !== "imgbb") return await uploadImgbb(file);
    throw e;
  }
}