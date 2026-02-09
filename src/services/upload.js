// src/services/upload.js
// =============================================================================
// ✅ Cloudinary Signed Upload (클라이언트)
// - 1) /api/cloudinary-sign (Netlify function) 호출 → timestamp/signature 받기
// - 2) Cloudinary upload endpoint로 file 업로드
// - 3) url/publicId/width/height 등을 표준 형태로 반환
//
// ⚠️ Tip:
// - 504/timeout이 났던 imgbb보다 Cloudinary가 일반적으로 훨씬 안정적
// - 반환 메타(public_id, width/height)는 "튐 방지(aspect-ratio)"에 매우 중요
// =============================================================================

export async function uploadImage(file) {
  if (!file) throw new Error("no file");

  // -------------------------------------------------------------
  // 1) 서버에서 서명 받기
  //    Netlify는 /api/* → /.netlify/functions/* 로 프록시 되게 설정하는 경우가 많음
  //    만약 네 프로젝트가 /api 경로 프록시를 안 쓰면 아래 URL을 바꿔줘:
  //    - "/.netlify/functions/cloudinary-sign"
  // -------------------------------------------------------------
  const signRes = await fetch("/.netlify/functions/cloudinary-sign", {
    method: "GET",
  });

  if (!signRes.ok) {
    const t = await signRes.text().catch(() => "");
    throw new Error(`sign failed (${signRes.status}) ${t}`);
  }

  const { cloudName, apiKey, timestamp, signature, folder } = await signRes.json();

  // -------------------------------------------------------------
  // 2) Cloudinary로 업로드
  // -------------------------------------------------------------
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", apiKey);
  fd.append("timestamp", String(timestamp));
  fd.append("signature", signature);

  // 폴더 강제(선택)
  if (folder) fd.append("folder", folder);

  // -------------------------------------------------------------
  // 3) 업로드 실행
  // -------------------------------------------------------------
  const upRes = await fetch(endpoint, {
    method: "POST",
    body: fd,
  });

  if (!upRes.ok) {
    const t = await upRes.text().catch(() => "");
    console.error("uploadImage failed:", upRes.status, t);
    throw new Error(`upload failed (${upRes.status})`);
  }

  const data = await upRes.json();

  // -------------------------------------------------------------
  // 4) 표준 형태로 반환
  // -------------------------------------------------------------
  return {
    url: data.secure_url || data.url,
    publicId: data.public_id,
    width: data.width,
    height: data.height,
    format: data.format,
    bytes: data.bytes,
  };
}

/**
 * ✅ Cloudinary 최적화 URL 생성기 (뷰에서 사용)
 * - publicId와 원하는 width만 주면 Cloudinary가 자동 최적화(WebP/AVIF 등)
 * - quality=auto, format=auto가 핵심
 */
export function cldImg(publicId, { w = 1200 } = {}) {
  if (!publicId) return "";
  // f_auto,q_auto → 포맷/퀄리티 자동
  return `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || ""}/image/upload/f_auto,q_auto,w_${w}/${publicId}`;
}
