import { parseFragment } from 'parse5';

const imageAttributes = new Set(['src', 'data-original-src', 'data-src', 'imagesrc', 'data-image-src']);
const escapeAttribute = (value) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

export function articleImageUrls(article) {
  const urls = new Set();
  for (const key of ['cover', 'coverMedium', 'coverThumb']) if (article[key]) urls.add(article[key]);
  transformImageHtml(article.contentHTML || '', (url) => { if (url) urls.add(url); return url; });
  return [...urls].filter((url) => /^https?:\/\//.test(url));
}

// Parse HTML attributes and JSON structurally, then edit only their source ranges.
// Unrelated text, formatting, captions, and legacy block attributes remain intact.
export function transformImageHtml(html, replaceUrl) {
  const fragment = parseFragment(html, { sourceCodeLocationInfo: true });
  const edits = [];
  function visit(node) {
    for (const attr of node.attrs || []) {
      let value = attr.value;
      if (imageAttributes.has(attr.name)) value = replaceUrl(value);
      else if (attr.name === 'data-images') {
        try {
          const images = JSON.parse(value);
          if (Array.isArray(images) && images.some((image) => image && typeof image === 'object' && replaceUrl(image.src || '') !== (image.src || ''))) value = JSON.stringify(images.map((image) => image && typeof image === 'object' ? { ...image, src: replaceUrl(image.src || '') } : image));
        } catch { /* Leave malformed legacy data untouched. */ }
      }
      if (value === attr.value) continue;
      const location = node.sourceCodeLocation?.attrs?.[attr.name];
      if (location) edits.push({ start: location.startOffset, end: location.endOffset, value: `${attr.name}="${escapeAttribute(value)}"` });
    }
    node.childNodes?.forEach(visit);
  }
  visit(fragment);
  return edits.sort((a, b) => b.start - a.start).reduce((result, edit) => result.slice(0, edit.start) + edit.value + result.slice(edit.end), html);
}

export function replaceArticleImages(article, mapping) {
  const replace = (url) => mapping[url] || url;
  const result = {};
  for (const field of ['cover', 'coverMedium', 'coverThumb']) {
    if (typeof article[field] === 'string' && replace(article[field]) !== article[field]) result[field] = replace(article[field]);
  }
  const html = transformImageHtml(article.contentHTML || '', replace);
  if (typeof article.contentHTML === 'string' && html !== article.contentHTML) result.contentHTML = html;
  return result;
}
