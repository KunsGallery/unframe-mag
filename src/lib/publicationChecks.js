import { buildSpotifyEmbed, buildYouTubeEmbed } from './ufEmbed.js';

const filled = (value) => typeof value === 'string' && !!value.trim();

export function isPublicationLinkValid(value) {
  if (!filled(value) || /[\s\\]/u.test(value) || [...value].some((char) => char.charCodeAt(0) < 32)) return false;
  if (/^(\/(?!\/)|#)/.test(value)) return true;
  try {
    const url = new URL(value);
    return ['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol)
      && !url.username && !url.password && !!(url.hostname || url.pathname);
  } catch { return false; }
}

// JSON positions follow ProseMirror: doc has no opening token, text uses UTF-16 length.
export function publicationChecks({ title, cover, coverMedium, content, contentJSON } = {}) {
  const issues = [];
  const add = (code, severity, message, field, position = null, extra = {}) =>
    issues.push({ id: `${code}-${issues.length}`, code, severity, message, field, position, ...extra });
  if (!filled(title)) add('missing-title', 'error', '제목을 입력해 주세요.', 'title');
  if (!filled(cover) && !filled(coverMedium)) add('missing-cover', 'warning', '대표 이미지를 추가해 주세요.', 'cover');
  let hasBody = false;
  function visit(node, position) {
    if (!node || typeof node !== 'object') return 0;
    const attrs = node.attrs || {};
    if (node.type === 'text' && filled(node.text)) hasBody = true;
    for (const mark of node.marks || []) {
      if (mark.type === 'link' && !isPublicationLinkValid(mark.attrs?.href))
        add('invalid-link', 'warning', '유효하지 않은 링크를 수정해 주세요.', 'body', position, { href: mark.attrs?.href || '' });
    }
    if (['image', 'ufImage', 'parallaxImage', 'stickyStory'].includes(node.type)) {
      const src = node.type === 'stickyStory' ? attrs.imageSrc : attrs.src;
      if (filled(src)) {
        hasBody = true;
        if (!filled(attrs.alt)) add('missing-alt', 'warning', '이미지 대체 텍스트를 입력해 주세요.', 'body', position);
      }
    }
    if (['gallery', 'slideGallery'].includes(node.type)) {
      const images = Array.isArray(attrs.images) ? attrs.images : [];
      if (!images.some((image) => filled(image?.src)))
        add('empty-gallery', 'warning', '빈 갤러리에 이미지를 추가해 주세요.', 'body', position);
      images.forEach((image, imageIndex) => {
        if (filled(image?.src)) {
          hasBody = true;
          if (!filled(image.alt)) add('missing-alt', 'warning', '갤러리 이미지 대체 텍스트를 입력해 주세요.', 'body', position, { imageIndex });
        }
      });
    }
    if (['ufPlaylist', 'ufPodcast'].includes(node.type)) {
      const url = attrs.url || attrs.embedUrl;
      if (filled(url) && (buildSpotifyEmbed(url) || buildYouTubeEmbed(url))) hasBody = true;
      else add('invalid-link', 'warning', 'Spotify 또는 YouTube 링크를 확인해 주세요.', 'body', position, { href: url || '' });
    }
    if (node.type === 'ufPoll' && filled(attrs.question)) hasBody = true;
    let size = 0;
    for (const child of Array.isArray(node.content) ? node.content : []) {
      size += visit(child, position + (node.type === 'doc' ? 0 : 1) + size);
    }
    if (node.type === 'text') return typeof node.text === 'string' ? node.text.length : 0;
    const containers = ['paragraph', 'heading', 'blockquote', 'bulletList', 'orderedList', 'listItem', 'taskList', 'taskItem', 'codeBlock', 'table', 'tableRow', 'tableCell', 'tableHeader', 'scene', 'columns', 'column', 'stickyStory', 'ufCallout'];
    return node.type === 'doc' ? size : node.content || containers.includes(node.type) ? size + 2 : 1;
  }
  const doc = contentJSON ?? content;
  if (doc?.type === 'doc') visit(doc, 0);
  if (!hasBody) add('missing-body', 'error', '본문을 입력해 주세요.', 'body', 0);
  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  return { issues, errors, warnings, canPublish: errors.length === 0 };
}

export default publicationChecks;
