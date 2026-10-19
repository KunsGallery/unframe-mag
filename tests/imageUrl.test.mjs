import assert from 'node:assert/strict';
import test from 'node:test';
import { articleImageAttributes, getCoverImageUrl, getImageSrcSet, getOptimizedImageUrl } from '../src/lib/imageUrl.js';

const original = 'https://res.cloudinary.com/gallery/image/upload/v123/exhibition/photo.jpg';
test('delivery URLs resize down, negotiate format/quality and preserve the original', () => {
  assert.equal(getOptimizedImageUrl(original, { width: 800 }), 'https://res.cloudinary.com/gallery/image/upload/f_auto,q_auto,w_800,c_limit/v123/exhibition/photo.jpg');
  const attrs = articleImageAttributes(original);
  assert.equal(attrs['data-original-src'], original);
  assert.equal(attrs.loading, 'lazy');
  assert.match(attrs.srcset, /480w/); assert.match(attrs.srcset, /1600w/);
  assert.equal(getCoverImageUrl({ coverMedium: original }, { width: 640 }), getOptimizedImageUrl(original, { width: 640 }));
});
test('foreign, signed and already-transformed URLs remain untouched', () => {
  for (const value of ['https://i.ibb.co/a/photo.avif', 'https://example.com/image/upload/photo.jpg', 'https://res.cloudinary.com.evil.test/gallery/image/upload/photo.jpg', 'https://res.cloudinary.com/gallery/image/upload/s--signature--/v1/a.jpg', 'https://res.cloudinary.com/gallery/image/upload/w_1200,c_crop/v1/a.jpg', 'https://res.cloudinary.com/gallery/image/upload/t_banner/v1/a.jpg', '/icons/icon-512.png']) {
    assert.equal(getOptimizedImageUrl(value, { width: 640 }), value);
    assert.equal(getImageSrcSet(value), undefined);
  }
});
test('malformed transformation options cannot inject transformations or unbounded sizes', () => {
  const result = getOptimizedImageUrl(original, { width: 99999, quality: '10/c_crop', format: 'svg' });
  assert.match(result, /f_auto,q_auto,w_2560,c_limit/);
  assert.equal(getOptimizedImageUrl(''), '');
  assert.equal(getCoverImageUrl({}), '');
});
