import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_RELATED_ARTICLES, normalizeRelatedEditionNos, orderRelatedArticles } from '../src/lib/relatedArticles.js';
import { buildArticleSummary } from '../src/lib/articleSummary.js';
import { ARTICLE_CATEGORIES } from '../src/constants/categories.js';

test('related editions are trimmed, unique, never the article itself and capped', () => {
  assert.deepEqual(normalizeRelatedEditionNos([' 002', '003', '002', '', null, '007'], '007'), ['002', '003']);
  assert.deepEqual(normalizeRelatedEditionNos('002'), []);
  const many = Array.from({ length: 20 }, (_, index) => String(index + 1));
  assert.equal(normalizeRelatedEditionNos(many).length, MAX_RELATED_ARTICLES);
});

test('related cards keep the chosen order and skip unpublished editions', () => {
  const articles = [{ editionNo: '001', title: 'A' }, { editionNo: '003', title: 'C' }];
  assert.deepEqual(orderRelatedArticles(['003', '002', '001'], articles).map((item) => item.title), ['C', 'A']);
});

test('summaries carry the related list only when there is one', () => {
  const base = { editionNo: '010', sortIndex: 10, title: '서문', contentHTML: '<p>x</p>' };
  assert.deepEqual(buildArticleSummary({ ...base, relatedEditionNos: ['011', '010', '012'] }, 'now').relatedEditionNos, ['011', '012']);
  assert.equal('relatedEditionNos' in buildArticleSummary({ ...base, relatedEditionNos: [] }, 'now'), false);
});

test("Curator's Note is an article category", () => {
  assert.ok(ARTICLE_CATEGORIES.some((item) => item.key === "CURATOR'S NOTE" && item.label === "Curator's Note"));
});
