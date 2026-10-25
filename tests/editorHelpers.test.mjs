import assert from 'node:assert/strict';
import test from 'node:test';
import { formatClock, formatRelativeTime, toMillis } from '../src/lib/relativeTime.js';
import { withLinkScheme } from '../src/lib/editorInput.js';
import { matchesSearchTerm, normalizeSearchText } from '../src/lib/koreanSearch.js';

const now = new Date(2026, 9, 26, 15, 0, 0).getTime();

test('relative times step from seconds to calendar dates', () => {
  assert.equal(formatRelativeTime(now - 10_000, now), '방금');
  assert.equal(formatRelativeTime(now + 5_000, now), '방금');
  assert.equal(formatRelativeTime(now - 3 * 60_000, now), '3분 전');
  assert.equal(formatRelativeTime(now - 2 * 3_600_000, now), '2시간 전');
  assert.equal(formatRelativeTime(now - 26 * 3_600_000, now), '어제');
  assert.equal(formatRelativeTime(now - 4 * 86_400_000, now), '4일 전');
  assert.equal(formatRelativeTime(new Date(2026, 8, 1).getTime(), now), '9월 1일');
  assert.equal(formatRelativeTime(new Date(2025, 8, 1).getTime(), now), '2025년 9월 1일');
  assert.equal(formatRelativeTime({ toMillis: () => now - 60_000 }, now), '1분 전');
  assert.equal(formatRelativeTime(null, now), '');
  assert.equal(toMillis('not a date'), null);
  assert.equal(formatClock(new Date(2026, 0, 1, 9, 5)), '09:05');
});

test('bare domains gain https while schemes, paths and anchors stay', () => {
  assert.equal(withLinkScheme(' example.com/a '), 'https://example.com/a');
  assert.equal(withLinkScheme('https://example.com'), 'https://example.com');
  assert.equal(withLinkScheme('mailto:a@example.com'), 'mailto:a@example.com');
  assert.equal(withLinkScheme('/article/001'), '/article/001');
  assert.equal(withLinkScheme('#notes'), '#notes');
  assert.equal(withLinkScheme('hello'), 'hello');
});

test('Korean search matches typed text, spacing and initial consonants', () => {
  const term = (value) => normalizeSearchText(value).replace(/\s+/g, '');
  assert.equal(matchesSearchTerm('슬라이드 갤러리 넘겨 보는 사진', term('갤러리')), true);
  assert.equal(matchesSearchTerm('슬라이드 갤러리', term('ㄱㄹ')), true);
  assert.equal(matchesSearchTerm('각주 footnote', term('FOOT')), true);
  assert.equal(matchesSearchTerm('구분선', term('표')), false);
});
