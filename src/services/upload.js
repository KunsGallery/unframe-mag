export async function uploadImage(file) {
  if (!file) throw new Error("no file");

  // 1) signed signature 요청
  const sigRes = await fetch("/.netlify/functions/cloudinary-sign", { method: "POST" });
  if (!sigRes.ok) throw new Error("sign failed");
  const sig = await sigRes.json();

  // 2) cloudinary 업로드
  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", sig.apiKey);
  fd.append("timestamp", String(sig.timestamp));
  fd.append("signature", sig.signature);
  if (sig.folder) fd.append("folder", sig.folder);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`;
  const upRes = await fetch(uploadUrl, { method: "POST", body: fd });
  if (!upRes.ok) throw new Error(`upload failed (${upRes.status})`);

  const data = await upRes.json();
  const url = data.secure_url;

  // thumb/medium은 “일단 url만” 리턴해도 충분히 동작
  return { url, thumbUrl: url, mediumUrl: url };
}
