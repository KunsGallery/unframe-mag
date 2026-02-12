// src/services/upload.js
// =============================================================================
// Cloudinary Signed Upload (Netlify Function으로 서명 발급)
// - progress 지원 (XMLHttpRequest)
// - 반환: { url, mediumUrl }  // thumb 없음 (요구사항)
// =============================================================================

function withTransform(url, transform) {
  const marker = "/image/upload/";
  const i = url.indexOf(marker);
  if (i === -1) return url;
  return url.slice(0, i + marker.length) + transform + "/" + url.slice(i + marker.length);
}

function xhrUpload(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (e) => {
      if (!onProgress) return;
      if (!e.lengthComputable) return;
      const p = Math.round((e.loaded / e.total) * 100);
      onProgress(p);
    };

    xhr.onload = () => {
      try {
        const ok = xhr.status >= 200 && xhr.status < 300;
        const data = JSON.parse(xhr.responseText || "{}");
        if (!ok) return reject(new Error(`upload failed (${xhr.status})`));
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };

    xhr.onerror = () => reject(new Error("network error"));
    xhr.send(formData);
  });
}

export async function uploadImage(file, opts = {}) {
  if (!file) throw new Error("no file");

  const { onProgress } = opts;

  // 1) signed signature 요청 (Netlify Function)
  const sigRes = await fetch("/.netlify/functions/cloudinary-sign", { method: "POST" });
  if (!sigRes.ok) throw new Error("sign failed");
  const sig = await sigRes.json();

  // 2) cloudinary 업로드 (XHR로 progress)
  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", sig.apiKey);
  fd.append("timestamp", String(sig.timestamp));
  fd.append("signature", sig.signature);
  if (sig.folder) fd.append("folder", sig.folder);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`;

  onProgress?.(1);
  const data = await xhrUpload(uploadUrl, fd, (p) => onProgress?.(p));
  onProgress?.(100);

  const url = data.secure_url;
  if (!url) throw new Error("no secure_url");

  // ✅ mediumUrl만 생성 (thumb 없음)
  const mediumUrl = withTransform(url, "w_1400,c_limit,q_auto,f_auto");

  return { url, mediumUrl };
}
