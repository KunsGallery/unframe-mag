import { useEffect, useState } from 'react';
import { ImageOff, RotateCw } from 'lucide-react';
import health from '../../data/imageHealth.json';
import { reportClientError } from '../../lib/runtimeDiagnostics';

export default function ImageDeliveryLayer({ root, revision }) {
  const [failures, setFailures] = useState([]);
  useEffect(() => {
    if (!root) return;
    const view = root.ownerDocument.defaultView;
    const records = new Map();
    let frame = 0; let serial = 0; let active = true;
    const knownFailures = new Set(health.unavailable);
    const placeholder = (image) => {
      let host;
      try { host = new URL(image.dataset.originalSrc || image.src).hostname; } catch { return false; }
      return host === 'i.ibb.co' && knownFailures.has(image.dataset.originalSrc || image.src) && health.placeholders.some((item) => image.naturalWidth === item.width && image.naturalHeight === item.height);
    };
    const measure = () => {
      if (!active) return;
      frame = 0;
      const origin = root.getBoundingClientRect();
      const result = [];
      for (const [image, record] of records) {
        if (!root.contains(image)) { view.clearTimeout(record.timer); visibility.unobserve(image); records.delete(image); continue; }
        if (!record.failed) continue;
        const slide = image.closest('.uf-slide-gallery__slide');
        const target = image.closest('.uf-gallery__item,.uf-parallax__wrapper,.uf-sticky-story__visual') || image;
        const imageRect = target.getBoundingClientRect();
        const slideRect = slide?.getBoundingClientRect();
        const rect = slideRect ? { ...imageRect.toJSON(), left: slideRect.left, right: slideRect.right, width: slideRect.width } : imageRect;
        const clip = image.closest('.uf-slide-gallery__track')?.getBoundingClientRect();
        const left = clip ? Math.max(rect.left, clip.left) : rect.left;
        const right = clip ? Math.min(rect.right, clip.right) : rect.right;
        if (!rect.width || !rect.height) continue;
        if (right <= left) continue;
        result.push({ key: record.key, left: left - origin.left + root.scrollLeft, top: rect.top - origin.top + root.scrollTop, width: right - left, height: rect.height, retrying: record.retrying, retry: record.retry });
      }
      setFailures(result);
    };
    const schedule = () => { if (!frame && active) frame = view.requestAnimationFrame(measure); };
    const showFailure = (image, record) => {
      view.clearTimeout(record.timer);
      if (!record.failed) reportClientError({ code: 'image-load' }, { source: 'article-image' });
      record.failed = true; record.retrying = false;
      image.classList.add('uf-image-load-failed');
      image.dataset.ufImageState = 'failed';
      schedule();
    };
    const loaded = (image, record) => {
      view.clearTimeout(record.timer);
      if (placeholder(image)) { showFailure(image, record); return; }
      record.failed = false; record.retrying = false;
      image.classList.remove('uf-image-load-failed');
      delete image.dataset.ufImageState;
      schedule();
    };
    const scan = () => {
      for (const image of root.querySelectorAll('img')) {
        const original = image.dataset.originalSrc || image.getAttribute('src');
        if (!original) continue;
        let record = records.get(image);
        if (record?.original === original) continue;
        if (record) view.clearTimeout(record.timer);
        image.classList.remove('uf-image-load-failed');
        delete image.dataset.ufImageState;
        record = { key: ++serial, original, failed: false, fallback: false, retrying: false };
        record.retry = () => {
          if (record.retrying || !image.isConnected) return;
          record.retrying = true;
          record.timer = view.setTimeout(() => showFailure(image, record), 20000);
          image.dataset.ufImageState = 'retrying';
          image.removeAttribute('srcset');
          let url = image.getAttribute('src') || original;
          try { const parsed = new URL(url); if (parsed.hostname === 'i.ibb.co') { parsed.searchParams.set('uf_retry', String(Date.now())); url = parsed.href; } } catch { /* Keep relative image URLs. */ }
          image.src = url;
          schedule();
        };
        records.set(image, record);
        visibility.observe(image);
        if (image.complete && image.naturalWidth) loaded(image, record);
        else if ((image.complete && !image.naturalWidth) || knownFailures.has(original)) showFailure(image, record);
      }
      schedule();
    };
    const onLoad = (event) => { const record = records.get(event.target); if (record) loaded(event.target, record); };
    const onError = (event) => {
      const image = event.target; const record = records.get(image);
      if (!record) return;
      // Try the preserved original once when only a transformed variant failed.
      if (!record.fallback && image.getAttribute('src') !== record.original && !record.retrying) {
        record.fallback = true; image.removeAttribute('srcset'); image.src = record.original; return;
      }
      showFailure(image, record);
    };
    const visibility = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const image = entry.target; const record = records.get(image);
        if (record && !record.failed && !image.complete && !record.timer) record.timer = view.setTimeout(() => showFailure(image, record), 20000);
        visibility.unobserve(image);
      }
    }, { rootMargin: '300px' });
    root.addEventListener('load', onLoad, true);
    root.addEventListener('error', onError, true);
    const mutations = new MutationObserver(scan);
    mutations.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcset', 'data-original-src'] });
    const resize = new ResizeObserver(schedule);
    resize.observe(root);
    view.addEventListener('resize', schedule);
    view.addEventListener('scroll', schedule, { capture: true, passive: true });
    scan();
    return () => {
      active = false; view.cancelAnimationFrame(frame); mutations.disconnect(); resize.disconnect(); visibility.disconnect();
      root.removeEventListener('load', onLoad, true); root.removeEventListener('error', onError, true); view.removeEventListener('resize', schedule);
      view.removeEventListener('scroll', schedule, true);
      records.forEach((record, image) => { view.clearTimeout(record.timer); image.classList.remove('uf-image-load-failed'); delete image.dataset.ufImageState; });
    };
  }, [root, revision]);
  return failures.map((failure) => <div key={failure.key} data-lightbox-ignore="true" className={`uf-image-failure${failure.height < 160 ? ' uf-image-failure--compact' : ''}`} style={{ left: failure.left, top: failure.top, width: failure.width, height: failure.height }} role="status">
    <ImageOff size={24} aria-hidden="true" /><span>사진을 불러오지 못했어요.</span>
    <button type="button" disabled={failure.retrying} onClick={(event) => { event.stopPropagation(); failure.retry(); }}><RotateCw size={16} aria-hidden="true" />{failure.retrying ? '다시 불러오는 중...' : '다시 시도'}</button>
  </div>);
}
