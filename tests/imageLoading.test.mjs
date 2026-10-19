import assert from 'node:assert/strict';
import test from 'node:test';
import { articleImageAttributes, galleryImageSizes } from '../src/lib/imageUrl.js';
import { activateSlideImage, warmSlideImages } from '../src/lib/slideImageLoading.js';

const original = 'https://res.cloudinary.com/gallery/image/upload/v1/photo.jpg';
test('responsive selection is configured before assigning image sources', () => {
  const keys = Object.keys(articleImageAttributes(original));
  assert.ok(keys.indexOf('sizes') < keys.indexOf('srcset'));
  assert.ok(keys.indexOf('loading') < keys.indexOf('src'));
  assert.match(articleImageAttributes(original).srcset, /320w/);
  assert.match(articleImageAttributes(original).srcset, /640w/);
  assert.equal(articleImageAttributes('/local.jpg').sizes, undefined);
});
test('gallery fallback sizes account for columns, spanning and mobile design layout', () => {
  assert.match(galleryImageSizes({ columns: 4 }), /288px$/);
  assert.match(galleryImageSizes({ columns: 2 }), /576px$/);
  assert.match(galleryImageSizes({ columns: 2, span: 2 }), /calc\(100vw - 32px\), 1152px$/);
  assert.match(galleryImageSizes({ columns: 4, span: 2, layoutMode: 'design' }), /\/ 2\), 576px$/);
  assert.doesNotMatch(galleryImageSizes({ columns: -1 }), /NaN|Infinity/);
});
function image() {
  const attrs = new Map(Object.entries(articleImageAttributes(original, { deferred: true })));
  const writes = [];
  return { attrs, writes, getAttribute: (key) => attrs.get(key), setAttribute: (key, value) => { writes.push(key); attrs.set(key, value); }, removeAttribute: (key) => attrs.delete(key) };
}
test('deferred slides preserve the original and captions in the node without starting downloads', () => {
  const attrs = articleImageAttributes(original, { deferred: true });
  assert.equal(attrs.src, undefined); assert.equal(attrs.srcset, undefined);
  assert.equal(attrs['data-original-src'], original);
  assert.match(attrs['data-uf-src'], /f_auto,q_auto/);
  assert.match(attrs['data-uf-srcset'], /640w/);
});
test('promotion assigns responsive candidates before src and is idempotent', () => {
  const node = image();
  assert.equal(activateSlideImage(node), true);
  assert.deepEqual(node.writes, ['srcset', 'src']);
  assert.equal(node.attrs.get('data-original-src'), original);
  assert.equal(node.attrs.has('data-uf-src'), false);
  assert.equal(activateSlideImage(node), false);
});
test('only the current and following slide are promoted, including jump and wraparound', () => {
  const images = Array.from({ length: 5 }, image);
  const track = { querySelectorAll: () => images.map((node) => ({ querySelectorAll: () => [node] })) };
  warmSlideImages(track, 0);
  assert.deepEqual(images.map((node) => node.attrs.has('src')), [true, true, false, false, false]);
  warmSlideImages(track, 4);
  assert.deepEqual(images.map((node) => node.attrs.has('src')), [true, true, false, false, true]);
  warmSlideImages({ querySelectorAll: () => [] }, 0);
  const single = image();
  warmSlideImages({ querySelectorAll: () => [{ querySelectorAll: () => [single] }] }, 99);
  assert.deepEqual(single.writes, ['srcset', 'src']);
});
