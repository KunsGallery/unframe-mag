import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildArticleSummary } from '../src/lib/articleSummary.js';
import { estimateReadMinutes } from '../src/lib/readingMeta.js';
import { publicEmailChange } from '../src/lib/userContact.js';
import { encode } from '../scripts/lib/firestoreRest.mjs';

const article = {
  editionNo: '012', sortIndex: 12, status: 'published', title: '제목', subtitle: '부제',
  category: 'ART', author: '에디터', authorEmail: 'editor@example.com', cover: 'https://example.com/c.jpg',
  coverMedium: '', contentHTML: `<p>${'가'.repeat(2400)}</p>`, likes: 3, views: 9,
};

test('summaries keep card fields and drop the body, private fields and empty values', () => {
  const summary = buildArticleSummary(article, 'now');
  assert.deepEqual(summary, {
    editionNo: '012', sortIndex: 12, readMinutes: 5, updatedAt: 'now',
    title: '제목', subtitle: '부제', category: 'ART', author: '에디터', cover: 'https://example.com/c.jpg',
  });
  assert.equal(estimateReadMinutes(summary, { min: 2 }), estimateReadMinutes(article, { min: 2 }));
});

test('summary fields stay within the articleSummaries rule allow-list', async () => {
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
  const block = rules.slice(rules.indexOf('match /articleSummaries/'), rules.indexOf('match /counters/articles'));
  const allowed = JSON.parse(block.match(/keys\(\)\.hasOnly\((\[[^\]]+\])\)/)[1].replaceAll("'", '"'));
  const full = buildArticleSummary({ ...article, excerpt: 'e', coverMedium: 'm', coverThumb: 't', relatedEditionNos: ['001'], tags: ['회화'] }, 'now');
  assert.deepEqual(full.tags, ['회화']);
  assert.deepEqual(Object.keys(full).filter((key) => !allowed.includes(key)), []);
});

test('readers lose the public email; staff keep or gain their own', () => {
  assert.equal(publicEmailChange({ role: 'user' }, 'r@example.com'), null);
  assert.equal(Object.keys(publicEmailChange({ role: 'user', email: 'r@example.com' }, 'r@example.com')).join(), 'email');
  assert.notEqual(publicEmailChange({ role: 'user', email: 'r@example.com' }, 'r@example.com').email, 'r@example.com');
  assert.deepEqual(publicEmailChange({ role: 'editor' }, 'e@example.com'), { email: 'e@example.com' });
  assert.equal(publicEmailChange({ role: 'editor', email: 'e@example.com' }, 'e@example.com'), null);
  assert.deepEqual(publicEmailChange({ role: 'user' }, 'a@example.com', { isAdmin: true }), { email: 'a@example.com' });
});

test('client and rules list the same administrators', async () => {
  const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
  const client = await readFile(new URL('../src/constants/admin.js', import.meta.url), 'utf8');
  const emails = (text) => [...text.matchAll(/"([^"\s]+@[^"\s]+)"/g)].map((match) => match[1]).sort();
  const ruleList = rules.slice(rules.indexOf('function isAdminEmail()'), rules.indexOf('function roleOf('));
  assert.ok(emails(ruleList).length > 0);
  assert.deepEqual(emails(ruleList), emails(client));
});

test('migration encodes Firestore REST values', () => {
  assert.deepEqual(encode({ n: 2, f: 1.5, s: 'x', b: true, d: new Date(0) }), { mapValue: { fields: {
    n: { integerValue: '2' }, f: { doubleValue: 1.5 }, s: { stringValue: 'x' }, b: { booleanValue: true },
    d: { timestampValue: '1970-01-01T00:00:00.000Z' },
  } } });
});
