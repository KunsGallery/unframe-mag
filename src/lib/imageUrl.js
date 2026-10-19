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
export function getImageSrcSet(value, widths = [320, 480, 640, 800, 1200, 1600]) {
  if (!isCloudinaryImageUrl(value)) return undefined;
  const candidates = [...new Set(widths)].map((width) => [width, getOptimizedImageUrl(value, { width })]);
  if (new Set(candidates.map(([, url]) => url)).size < 2) return undefined;
  return candidates.map(([width, url]) => `${url} ${width}w`).join(', ');
}
export function getCoverImageUrl(article, options = {}) {
  return getOptimizedImageUrl(normalize(article?.coverMedium) || normalize(article?.coverThumb) || normalize(article?.cover), options);
}
export function articleImageAttributes(src, { width = 1600, sizes = '(max-width: 768px) 100vw, 1200px', eager = false, deferred = false } = {}) {
  const attributes = { loading: eager ? 'eager' : 'lazy', decoding: 'async', sizes: isCloudinaryImageUrl(src) ? sizes : undefined, srcset: getImageSrcSet(src), src: getOptimizedImageUrl(src, { width }), 'data-original-src': src || '' };
  if (!deferred) return attributes;
  const { src: deliverySrc, srcset, ...rest } = attributes;
  return { ...rest, 'data-uf-src': deliverySrc, 'data-uf-srcset': srcset };
}

export function galleryImageSizes({ columns = 2, span = 1, layoutMode = 'grid' } = {}) {
  const count = Math.max(1, Math.min(4, Math.round(Number(columns) || 2)));
  const fraction = layoutMode === 'design' ? 0.5 : Math.min(Number(span) === 2 ? 2 : 1, count) / count;
  const mobile = layoutMode !== 'design' && Number(span) === 2 ? 'calc(100vw - 32px)' : 'calc((100vw - 48px) / 2)';
  return `(max-width: 768px) ${mobile}, ${Math.ceil(1152 * fraction)}px`;
}
