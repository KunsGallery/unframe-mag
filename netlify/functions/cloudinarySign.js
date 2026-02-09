// netlify/functions/cloudinarySign.js
// -----------------------------------------------------------------------------
// ✅ Cloudinary Signed Upload용 "서명(signature)"을 발급해주는 Netlify Function
// - API_SECRET은 서버(함수)에만 존재해야 안전합니다.
// - 프론트는 이 함수에서 받은 signature/timestamp/api_key로 Cloudinary에 직접 업로드합니다.
//
// 참고: Cloudinary signature 규칙(간단 버전)
// 1) 서명할 파라미터들을 "키=값&키=값" 형태로 정렬해 문자열을 만들고
// 2) 뒤에 API_SECRET을 붙인 뒤
// 3) SHA1 해시를 만든 값이 signature 입니다.
// -----------------------------------------------------------------------------

const crypto = require("crypto");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { ok: false, error: "Method Not Allowed" });
    }

    // ✅ 필수 env
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return json(500, {
        ok: false,
        error: "Missing Cloudinary env vars (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET)",
      });
    }

    // ✅ 업로드 폴더(선택)
    const defaultFolder = process.env.CLOUDINARY_FOLDER || "unframe/articles";

    // ✅ 프론트에서 folder를 보내면 그걸 쓰고, 아니면 기본값
    // (너무 열어두기 싫으면 folder 입력을 무시하고 defaultFolder만 써도 돼)
    const body = safeJson(event.body);
    const folder = String(body?.folder || defaultFolder);

    // ✅ timestamp는 Cloudinary 서명에 필요 (초 단위)
    const timestamp = Math.floor(Date.now() / 1000);

    // ✅ 서명할 파라미터 구성
    // - 최소로 folder + timestamp 정도면 충분
    // - 필요하면 public_id, eager 등도 추가 가능
    const paramsToSign = {
      folder,
      timestamp,
    };

    const signature = signCloudinary(paramsToSign, apiSecret);

    return json(200, {
      ok: true,
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature,
    });
  } catch (e) {
    return json(500, { ok: false, error: String(e?.message || e) });
  }
};

function signCloudinary(params, apiSecret) {
  // ✅ 키 이름 기준 오름차순 정렬
  const keys = Object.keys(params).sort();

  // ✅ "a=1&b=2" 형태 만들기
  const paramString = keys.map((k) => `${k}=${params[k]}`).join("&");

  // ✅ 뒤에 secret 붙여서 SHA1
  return crypto
    .createHash("sha1")
    .update(paramString + apiSecret)
    .digest("hex");
}

function safeJson(raw) {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      // ✅ same-origin이라 굳이 * 필요 없지만, 로컬 테스트 편하게
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
    },
    body: JSON.stringify(body),
  };
}
