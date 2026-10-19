export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/heic', 'image/heif']);

export class ImageUploadError extends Error {
  constructor(code, message) { super(message); this.name = 'ImageUploadError'; this.code = code; this.userMessage = message; }
}
export function imageUploadConfig(env = {
  VITE_IMAGE_PROVIDER: import.meta.env.VITE_IMAGE_PROVIDER,
  VITE_CLOUDINARY_CLOUD_NAME: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
  VITE_CLOUDINARY_UPLOAD_PRESET: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
  VITE_CLOUDINARY_UNSIGNED_PRESET: import.meta.env.VITE_CLOUDINARY_UNSIGNED_PRESET,
}) {
  const cloudName = String(env?.VITE_CLOUDINARY_CLOUD_NAME || '').trim();
  const preset = String(env?.VITE_CLOUDINARY_UPLOAD_PRESET || '').trim() || String(env?.VITE_CLOUDINARY_UNSIGNED_PRESET || '').trim();
  const provider = String(env?.VITE_IMAGE_PROVIDER || 'cloudinary').trim().toLowerCase();
  if (provider !== 'cloudinary' || !/^[a-zA-Z0-9_-]+$/.test(cloudName) || !preset) throw new ImageUploadError('image-upload-config', '이미지 저장소 설정을 확인해야 해요. 관리자에게 문의해 주세요.');
  return { cloudName, preset };
}
export function validateImageFile(file) {
  if (!file || !Number.isFinite(file.size) || file.size <= 0) throw new ImageUploadError('image-upload-empty', '비어 있는 파일은 업로드할 수 없어요.');
  if (file.size > MAX_IMAGE_BYTES) throw new ImageUploadError('image-upload-size', '이미지는 20MB 이하로 선택해 주세요.');
  if (!allowedTypes.has(String(file.type).toLowerCase())) throw new ImageUploadError('image-upload-format', 'JPG, PNG, WebP, GIF, AVIF 또는 HEIC 사진을 선택해 주세요.');
}
export function xhrPostForm(url, formData, { onProgress, signal, timeout = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abort);
      if (error) reject(error); else resolve(result);
    };
    const abort = () => { xhr.abort(); finish(new ImageUploadError('image-upload-abort', '이미지 업로드를 취소했어요.')); };
    if (signal?.aborted) { abort(); return; }
    xhr.open('POST', url);
    xhr.timeout = timeout;
    xhr.upload.onprogress = (event) => { if (event.lengthComputable && !settled) onProgress?.(Math.min(99, Math.round(event.loaded / event.total * 100))); };
    xhr.onerror = () => finish(new ImageUploadError('image-upload-network', '연결이 불안정해 업로드하지 못했어요. 연결을 확인한 뒤 다시 시도해 주세요.'));
    xhr.ontimeout = () => finish(new ImageUploadError('image-upload-timeout', '업로드 시간이 초과됐어요. 더 작은 사진으로 다시 시도해 주세요.'));
    xhr.onabort = () => finish(new ImageUploadError('image-upload-abort', '이미지 업로드를 취소했어요.'));
    xhr.onload = () => {
      let result;
      try { result = JSON.parse(xhr.responseText || '{}'); }
      catch { finish(new ImageUploadError('image-upload-response', '이미지 저장소 응답을 확인하지 못했어요. 다시 시도해 주세요.')); return; }
      if (xhr.status < 200 || xhr.status >= 300) {
        const message = xhr.status === 413 || /file size|too large|maximum.*size|size.*maximum/i.test(result.error?.message || '') ? '이미지 용량이 저장소 제한을 초과했어요. 크기를 줄여 주세요.'
          : xhr.status === 429 ? '이미지 요청이 많아요. 잠시 후 다시 시도해 주세요.'
            : /preset|cloud name|unsigned|not enabled|not allowed/i.test(result.error?.message || '') ? '이미지 저장소 업로드 설정을 확인해야 해요. 관리자에게 문의해 주세요.'
              : '이미지를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.';
        finish(new ImageUploadError('image-upload-server', message)); return;
      }
      finish(null, result);
    };
    signal?.addEventListener('abort', abort, { once: true });
    try { xhr.send(formData); } catch { finish(new ImageUploadError('image-upload-network', '이미지를 전송하지 못했어요. 다시 시도해 주세요.')); }
  });
}
export async function uploadToCloudinaryWithProgress(file, options = {}) {
  const { cloudName, preset } = imageUploadConfig();
  validateImageFile(file);
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', preset);
  const result = await xhrPostForm(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, form, options);
  let url;
  try { url = new URL(result.secure_url); } catch { /* Reject incomplete provider responses. */ }
  if (!url || url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || !url.pathname.startsWith(`/${cloudName}/image/upload/`) || url.username || url.password) throw new ImageUploadError('image-upload-response', '저장된 이미지 주소를 확인하지 못했어요. 다시 시도해 주세요.');
  options.onProgress?.(100);
  return url.href;
}
// A failed primary upload must stay failed; never silently switch image hosts.
export const uploadImageWithProgress = uploadToCloudinaryWithProgress;
