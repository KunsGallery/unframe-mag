import assert from 'node:assert/strict';
import test from 'node:test';
import { SHARE_CARD_FORMATS, clampLines, drawShareCard, fitText, loadCardImage, prepareQuote, shareCardFileName, wrapText } from '../src/lib/shareCard.js';

// One unit per character keeps widths predictable.
const measure = (value) => [...value].length;

function fakeContext() {
  const calls = [];
  const ctx = {
    font: '', fillStyle: '', textAlign: '', textBaseline: '', globalAlpha: 1,
    save() {}, restore() {},
    measureText(value) { const size = Number(/(\d+)px/.exec(this.font)?.[1] || 10); return { width: [...value].length * size * 0.9 }; },
    fillRect() {}, drawImage(...args) { calls.push(['drawImage', ...args]); },
    fillText(text, x, y) { calls.push(['fillText', text, x, y, this.font]); },
    createLinearGradient() { return { addColorStop() {} }; },
  };
  return { ctx, calls };
}

test('prepareQuote strips wrapping quotes, collapses spaces and clips on a word', () => {
  assert.equal(prepareQuote('  “우리는   프레임 밖에서\r\n\r\n\r\n본다”  '), '우리는 프레임 밖에서\n\n본다');
  const long = prepareQuote('가나다 '.repeat(100), 40);
  assert.ok(long.endsWith('…'));
  assert.ok(long.length <= 41);
  assert.ok(!long.includes(' …'));
});

test('wrapText keeps Korean words whole and splits only oversized words', () => {
  assert.deepEqual(wrapText(measure, '프레임 밖의 이야기를 기록합니다', 8), ['프레임 밖의', '이야기를', '기록합니다']);
  assert.deepEqual(wrapText(measure, '가나다라마바사아자차', 4), ['가나다라', '마바사아', '자차']);
  assert.deepEqual(wrapText(measure, '첫 줄\n둘째 줄', 20), ['첫 줄', '둘째 줄']);
});

test('clampLines ends the last kept line with an ellipsis that fits', () => {
  assert.deepEqual(clampLines(measure, ['가나다라', '마바사아', '자차'], 2, 4), ['가나다라', '마바사…']);
  assert.deepEqual(clampLines(measure, ['가나'], 2, 4), ['가나']);
});

test('fitText shrinks the font until the text fits, then clamps at the minimum', () => {
  const { ctx } = fakeContext();
  const short = fitText(ctx, '짧은 문장', { maxWidth: 900, maxHeight: 400, maxSize: 68, minSize: 34 });
  assert.equal(short.size, 68);
  const long = fitText(ctx, '아주 긴 문장입니다 '.repeat(20), { maxWidth: 900, maxHeight: 400, maxSize: 68, minSize: 34 });
  assert.ok(long.size < 68);
  assert.ok(long.lines.length * long.lineHeight <= 400);
  const huge = fitText(ctx, '끝없이 이어지는 문장 '.repeat(200), { maxWidth: 900, maxHeight: 200, maxSize: 68, minSize: 34 });
  assert.equal(huge.size, 34);
  assert.ok(huge.lines.at(-1).endsWith('…'));
});

test('drawShareCard keeps all text inside the story safe zone and draws the cover only for photo style', () => {
  for (const style of ['photo', 'text']) {
    const { ctx, calls } = fakeContext();
    const image = { width: 2000, height: 1000 };
    drawShareCard(ctx, { format: 'story', style, quote: '긴 문장 '.repeat(60), title: '프레임 밖의 이야기 '.repeat(6), editionNo: 12, category: 'Essay', image });
    const { height, safeTop, safeBottom } = SHARE_CARD_FORMATS.story;
    const texts = calls.filter(([kind]) => kind === 'fillText');
    assert.ok(texts.length > 4);
    for (const [, , , y] of texts) assert.ok(y >= safeTop && y <= height - safeBottom, `text at ${y}`);
    assert.equal(calls.some(([kind]) => kind === 'drawImage'), style === 'photo');
  }
});

test('drawShareCard falls back to the text design without an image', () => {
  const { ctx, calls } = fakeContext();
  drawShareCard(ctx, { format: 'post', style: 'photo', quote: '문장', title: '제목', image: null });
  assert.equal(calls.some(([kind]) => kind === 'drawImage'), false);
});

test('share card displays the category position rather than the global edition number', () => {
  const { ctx, calls } = fakeContext();
  drawShareCard(ctx, { category: 'Essay', categoryNumber: 3, editionNo: 12 });
  assert.ok(calls.some(([kind, text]) => kind === 'fillText' && text === 'ESSAY  ·  NO.3'));
  const fallback = fakeContext();
  drawShareCard(fallback.ctx, { category: 'Essay', editionNo: 12 });
  assert.ok(fallback.calls.some(([kind, text]) => kind === 'fillText' && text === 'ESSAY'));
});

test('shareCardFileName names the format', () => {
  assert.equal(shareCardFileName({ editionNo: 7, format: 'story' }), 'unframe-7-story.png');
  assert.equal(shareCardFileName({ format: 'post' }), 'unframe-article-post.png');
});

test('prepared quotes include their ellipsis within the textarea limit', () => {
  assert.equal(prepareQuote('가'.repeat(300)).length, 280);
});

test('cover image errors and timeouts fall back without leaving the card loading', async () => {
  const OriginalImage = globalThis.Image;
  let instance;
  globalThis.Image = class { constructor() { instance = this; } };
  try {
    assert.equal(await loadCardImage(''), null);
    const failed = loadCardImage('https://example.com/fail.jpg');
    assert.equal(instance.crossOrigin, 'anonymous');
    instance.onerror();
    assert.equal(await failed, null);
    assert.equal(instance.onload, null);
    assert.equal(await loadCardImage('https://example.com/slow.jpg', { timeoutMs: 1 }), null);
    const ready = loadCardImage('https://example.com/ok.jpg');
    const loaded = instance;
    instance.onload();
    assert.equal(await ready, loaded);
  } finally {
    if (OriginalImage === undefined) delete globalThis.Image;
    else globalThis.Image = OriginalImage;
  }
});
