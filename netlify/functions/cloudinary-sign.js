// netlify/functions/cloudinary-sign.js
// =============================================================================
// ✅ Cloudinary Signed Upload: 서명(signature) 발급 API
// - 브라우저에 API_SECRET을 절대 노출하면 안 됨 → 서버(넷리파이 함수)에서만 사용
// - 클라이언트는 이 API를 호출해 timestamp/signature를 받고,
//   Cloudinary upload endpoint로 직접 업로드함
// =============================================================================

import crypto from "crypto";

export async function handler(event) {
  try {
    // -------------------------------------------------------------
    // 1) 환경변수
    // -------------------------------------------------------------
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const folder = process.env.CLOUDINARY_FOLDER || ""; // 선택

    if (!cloudName || !apiKey || !apiSecret) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Missing Cloudinary env vars",
          required: ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"],
        }),
      };
    }

    // -------------------------------------------------------------
    // 2) signature는 "업로드 파라미터 + api_secret"로 만든 해시
    //    Cloudinary 규칙: 파라미터를 알파벳순으로 querystring 만든 뒤 + api_secret
    // -------------------------------------------------------------
    const timestamp = Math.floor(Date.now() / 1000);

    // 업로드에 포함할 파라미터(서명에 들어갈 것들)
    // - folder를 강제하고 싶으면 여기 넣으면 됨
    // - 나중에 public_id를 강제하고 싶으면 넣을 수 있음
    const paramsToSign = {
      timestamp,
      ...(folder ? { folder } : {}),
    };

    // 알파벳 순 정렬 → "key=value&key=value" 형태 만들기
    const sorted = Object.keys(paramsToSign)
      .sort()
      .map((k) => `${k}=${paramsToSign[k]}`)
      .join("&");

    // signature = sha1(sorted + api_secret)
    const signature = crypto
      .createHash("sha1")
      .update(sorted + apiSecret)
      .digest("hex");

    // -------------------------------------------------------------
    // 3) 클라이언트에게 반환(SECRET은 절대 반환 금지)
    // -------------------------------------------------------------
    return {
      statusCode: 200,
      body: JSON.stringify({
        cloudName,
        apiKey,
        timestamp,
        signature,
        folder,
      }),
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e?.message || String(e) }),
    };
  }
}
