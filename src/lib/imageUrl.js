const CLOUDINARY_UPLOAD_PATH = "/image/upload/";

function normalizeUrl(url) {
  return String(url || "").trim();
}

function buildCloudinaryTransformString({
  width,
  quality = "auto",
  format = "auto",
  crop = "fill",
} = {}) {
  const parts = [];

  if (format) parts.push(`f_${format}`);
  if (quality) parts.push(`q_${quality}`);
  if (Number.isFinite(Number(width)) && Number(width) > 0) {
    parts.push(`w_${Math.round(Number(width))}`);
  }
  if (crop) parts.push(`c_${crop}`);

  return parts.length ? `${parts.join(",")}/` : "";
}

export function getOptimizedImageUrl(url, options = {}) {
  const normalized = normalizeUrl(url);
  if (!normalized) return "";
  if (!normalized.includes(CLOUDINARY_UPLOAD_PATH)) return normalized;

  const transform = buildCloudinaryTransformString(options);
  if (!transform) return normalized;

  return normalized.replace(CLOUDINARY_UPLOAD_PATH, `${CLOUDINARY_UPLOAD_PATH}${transform}`);
}

export function getCoverImageUrl(article, options = {}) {
  const coverMedium = normalizeUrl(article?.coverMedium);
  if (coverMedium) return coverMedium;

  const coverThumb = normalizeUrl(article?.coverThumb);
  if (coverThumb) return coverThumb;

  const cover = normalizeUrl(article?.cover);
  if (!cover) return "";

  return getOptimizedImageUrl(cover, options);
}

