// src/services/upload.js
// -----------------------------------------------------------------------------
// ✅ Cloudinary Signed Upload (프론트에서 Cloudinary로 직접 업로드)
// 흐름:
// 1) Netlify Function(/.netlify/functions/cloudinarySign)에서 signature 발급
// 2) Cloudinary Upload API로 FormData 전송(file + api_key + timestamp + signature + folder)
// 3) 응답(secure_url, public_id)을 받아서 썸네일/미디엄 URL도 함께 구성
//
// 장점:
// - Netlify Function으로 "이미지 자체"를 보내지 않음 → 대용량/타임아웃(504) 크게 줄어듦
// - Cloudinary CDN + 자동 포맷/품질 최적화
// -----------------------------------------------------------------------------

/** ✅ Cloudinary 변환 URL 만들기(thumb/medium 등) */
function buildCloudinaryUrl({ cloudName, publicId, transform = "" }) {
  // transform 예: "f_auto,q_auto,w_480"
  // 결과: https://res.cloudinary.com/<cloud>/image/upload/<transform>/<publicId>
  const t = transform ? `${transform}/` : "";
  return `https://res.cloudinary.com/${cloudName}/image/upload/${t}${publicId}`;
}

/**
 * ✅ 업로드 메인 함수
 * @param {File} file
 * @returns {Promise<{url:string, thumbUrl:string, mediumUrl:string, publicId?:string}>}
 */
export async function uploadImage(file) {
  if (!file) throw new Error("No file");

  // ✅ 1) signature 발급 요청
  const signRes = await fetch("/.netlify/functions/cloudinarySign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // folder는 서버 기본값을 쓰려면 안 보내도 됨
      // folder: "unframe/articles",
    }),
  });

  const signData = await signRes.json().catch(() => ({}));
  if (!signRes.ok || !signData?.ok) {
    console.error("cloudinarySign failed:", signRes.status, signData);
    throw new Error(signData?.error || `sign failed (${signRes.status})`);
  }

  const { cloudName, apiKey, timestamp, signature, folder } = signData;

  // ✅ 2) Cloudinary Upload API로 직접 업로드
  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", apiKey);
  fd.append("timestamp", String(timestamp));
  fd.append("signature", signature);
  fd.append("folder", folder);

  const uploadEndpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const upRes = await fetch(uploadEndpoint, {
    method: "POST",
    body: fd,
  });

  const upData = await upRes.json().catch(() => ({}));
  if (!upRes.ok || !upData?.secure_url || !upData?.public_id) {
    console.error("cloudinary upload failed:", upRes.status, upData);
    throw new Error(upData?.error?.message || `upload failed (${upRes.status})`);
  }

  // ✅ 3) URL 구성
  const url = upData.secure_url; // 원본(Cloudinary가 가진 원본)
  const publicId = upData.public_id;

  // ✅ 리스트/카드용: 너무 저화질이면 q_auto를 더 올리거나 w를 키우면 됨
  // - thumb: 카드 작은 이미지 (예: 640)
  // - medium: 뷰/프리뷰 (예: 1200)
  const thumbUrl = buildCloudinaryUrl({
    cloudName,
    publicId,
    transform: "f_auto,q_auto,w_640,c_limit",
  });

  const mediumUrl = buildCloudinaryUrl({
    cloudName,
    publicId,
    transform: "f_auto,q_auto,w_1400,c_limit",
  });

  return { url, thumbUrl, mediumUrl, publicId };
}
