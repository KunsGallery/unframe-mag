// src/lib/uploadWithProgress.js

/**
 * XHR 기반 업로드 (진행률 콜백 제공)
 * - Cloudinary unsigned upload (권장)
 * - imgbb fallback
 *
 * 반환 기본 형식:
 * {
 *   originalUrl,
 *   mediumUrl,
 *   thumbUrl
 * }
 */

function xhrPostForm(url, formData, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const pct = Math.round((evt.loaded / evt.total) * 100);
      onProgress?.(pct);
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300) resolve(json);
        else reject(new Error(json?.error?.message || json?.message || "Upload failed"));
      } catch (e) {
        reject(new Error("Invalid response"));
      }
    };

    xhr.send(formData);
  });
}

/**
 * Cloudinary unsigned upload
 * 필요 env:
 * - VITE_CLOUDINARY_CLOUD_NAME
 * - VITE_CLOUDINARY_UNSIGNED_PRESET
 */
export async function uploadToCloudinaryWithProgress(file, { onProgress } = {}) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const preset = import.meta.env.VITE_CLOUDINARY_UNSIGNED_PRESET;

  if (!cloudName || !preset) {
    throw new Error("Cloudinary env missing: VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UNSIGNED_PRESET");
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", preset);

  const json = await xhrPostForm(url, form, { onProgress });
  const secureUrl = json?.secure_url || json?.url;
  if (!secureUrl) throw new Error("Cloudinary: secure_url missing");

  return {
    originalUrl: secureUrl,
    mediumUrl: secureUrl,
    thumbUrl: secureUrl,
  };
}

/**
 * imgbb upload
 * 필요 env:
 * - VITE_IMGBB_API_KEY
 */
export async function uploadToImgbbWithProgress(file, { onProgress } = {}) {
  const key = import.meta.env.VITE_IMGBB_API_KEY;
  if (!key) throw new Error("imgbb env missing: VITE_IMGBB_API_KEY");

  const url = `https://api.imgbb.com/1/upload?key=${encodeURIComponent(key)}`;
  const form = new FormData();
  form.append("image", file);

  const json = await xhrPostForm(url, form, { onProgress });

  const data = json?.data || {};
  const originalUrl = data?.url || data?.display_url || "";
  const mediumUrl = data?.medium?.url || originalUrl;
  const thumbUrl = data?.thumb?.url || mediumUrl || originalUrl;

  if (!originalUrl) throw new Error("imgbb: url missing");

  return {
    originalUrl,
    mediumUrl,
    thumbUrl,
  };
}

/**
 * 통합 업로드: Cloudinary → 실패 시 imgbb
 * 객체 전체가 필요할 때 사용
 */
export async function uploadImageVariantsWithProgress(file, { onProgress } = {}) {
  try {
    return await uploadToCloudinaryWithProgress(file, { onProgress });
  } catch (e) {
    return await uploadToImgbbWithProgress(file, { onProgress });
  }
}

/**
 * 기존 코드 호환용
 * 문자열 URL 하나만 필요할 때 사용
 */
export async function uploadImageWithProgress(
  file,
  { onProgress, preferMedium = false } = {}
) {
  const result = await uploadImageVariantsWithProgress(file, { onProgress });

  if (preferMedium) {
    return result.mediumUrl || result.originalUrl;
  }

  return result.originalUrl;
}