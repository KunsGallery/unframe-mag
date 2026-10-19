export function activateSlideImage(image) {
  const src = image.getAttribute('data-uf-src');
  if (!src) return false;
  const srcset = image.getAttribute('data-uf-srcset');
  // Set responsive candidates before src to avoid an extra fallback download.
  if (srcset) image.setAttribute('srcset', srcset);
  image.setAttribute('src', src);
  image.removeAttribute('data-uf-src');
  image.removeAttribute('data-uf-srcset');
  return true;
}

export function warmSlideImages(track, index) {
  const slides = Array.from(track.querySelectorAll('.uf-slide-gallery__slide'));
  if (!slides.length) return;
  const current = Math.max(0, Math.min(slides.length - 1, Math.trunc(Number(index) || 0)));
  for (const target of new Set([current, (current + 1) % slides.length])) {
    slides[target].querySelectorAll('img[data-uf-src]').forEach(activateSlideImage);
  }
}
