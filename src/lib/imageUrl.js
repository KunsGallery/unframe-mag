const CLOUDINARY_PATH = /^\/[A-Za-z0-9_-]+\/image\/upload\//;
const normalize = (value) => String(value || '').trim();
export function isCloudinaryImageUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com' && !url.username && !url.password && CLOUDINARY_PATH.test(url.pathname); }
  catch { return false; }
}
export function getOptimizedImageUrl(value, { width, quality = 'auto', format = 'auto' } = {}) {
  const original = normalize(value);
  if (!isCloudinaryImageUrl(original)) return original;
  const url = new URL(original);
  const prefix = url.pathname.match(CLOUDINARY_PATH)[0];
  const rest = url.pathname.slice(prefix.length);
  const first = rest.split('/')[0];
  // Keep explicit transforms, signatures and named variants unchanged.
  if (/^s--|^t_|^(?:[a-z]{1,4}_[^/]+,?)+$/.test(first) && !/^v\d+$/.test(first)) return original;
  const size = Math.max(160, Math.min(2560, Math.round(Number(width) || 1600)));
  const safeQuality = /^(auto(?::(?:good|best|eco|low))?|\d{1,2}|100)$/.test(String(quality)) ? quality : 'auto';
  const safeFormat = ['auto', 'webp', 'avif', 'jpg', 'png'].includes(format) ? format : 'auto';
  url.pathname = `${prefix}f_${safeFormat},q_${safeQuality},w_${size},c_limit/${rest}`;
  return url.href;
}
export function getImageSrcSet(value, widths = [480, 800, 1200, 1600]) {
  if (!isCloudinaryImageUrl(value)) return undefined;
  const candidates = [...new Set(widths)].map((width) => [width, getOptimizedImageUrl(value, { width })]);
  if (new Set(candidates.map(([, url]) => url)).size < 2) return undefined;
  return candidates.map(([width, url]) => `${url} ${width}w`).join(', ');
}
export function getCoverImageUrl(article, options = {}) {
  return getOptimizedImageUrl(normalize(article?.coverMedium) || normalize(article?.coverThumb) || normalize(article?.cover), options);
}
export function articleImageAttributes(src, { width = 1600, sizes = '(max-width: 768px) 100vw, 1200px', eager = false } = {}) {
  return { src: getOptimizedImageUrl(src, { width }), srcset: getImageSrcSet(src), sizes: isCloudinaryImageUrl(src) ? sizes : undefined, 'data-original-src': src || '', loading: eager ? 'eager' : 'lazy', decoding: 'async' };
}
