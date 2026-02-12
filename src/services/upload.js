// src/services/upload.js
export async function uploadImage(file) {
  if (!file) throw new Error("no file");

  // 1) Cloudinary signed upload (추천)
  try {
    const sigRes = await fetch("/.netlify/functions/cloudinary-sign", { method: "POST" });

    if (!sigRes.ok) {
      // 404 포함해서 여기로 빠지면 fallback 시도
      throw new Error(`cloudinary-sign not ok (${sigRes.status})`);
    }

    const sig = await sigRes.json();

    const fd = new FormData();
    fd.append("file", file);
    fd.append("api_key", sig.apiKey);
    fd.append("timestamp", String(sig.timestamp));
    fd.append("signature", sig.signature);
    if (sig.folder) fd.append("folder", sig.folder);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`;
    const upRes = await fetch(uploadUrl, { method: "POST", body: fd });
    if (!upRes.ok) throw new Error(`cloudinary upload failed (${upRes.status})`);

    const data = await upRes.json();
    const url = data.secure_url;
    if (!url) throw new Error("cloudinary: no secure_url");

    // ✅ 너 요청: thumb 말고 medium만 쓴다 → mediumUrl만 의미있게 리턴
    return { url, mediumUrl: url };
  } catch (e) {
    // console.warn("cloudinary path failed, fallback to imgbb:", e?.message || e);
  }

  // 2) fallback: Netlify function uploadImage.js (imgbb)
  try {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/.netlify/functions/uploadImage", {
      method: "POST",
      body: fd,
    });

    if (!res.ok) throw new Error(`uploadImage function failed (${res.status})`);

    const data = await res.json();
    if (!data?.ok || !data?.url) throw new Error("imgbb: invalid response");

    return { url: data.url, mediumUrl: data.mediumUrl || data.url };
  } catch (e) {
    throw new Error(
      `upload failed. (Hint) 로컬에서는 'npx netlify dev'로 실행해야 /.netlify/functions 가 동작해요.\n${e?.message || e}`
    );
  }
}
