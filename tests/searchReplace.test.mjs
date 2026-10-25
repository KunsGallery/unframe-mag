import assert from 'node:assert/strict';
import test from 'node:test';
import { Schema } from '@tiptap/pm/model';
import { findMatches } from '../src/tiptap/extensions/SearchReplace.js';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*' },
    text: { group: 'inline' },
    footnote: { group: 'inline', inline: true, atom: true },
  },
  marks: { strong: {}, em: {} },
});
const text = (value, ...marks) => schema.text(value, marks.map((name) => schema.marks[name].create()));
const para = (...content) => schema.nodes.paragraph.create(null, content);

test('matches cross mark boundaries and map back to document positions', () => {
  const doc = schema.nodes.doc.create(null, [para(text('회화와 '), text('회', 'strong'), text('화', 'em')), para(text('Hello hello'))]);
  const matches = findMatches(doc, '회화');
  assert.deepEqual(matches, [{ from: 1, to: 3 }, { from: 5, to: 7 }]);
  assert.equal(doc.textBetween(matches[1].from, matches[1].to), '회화');
  assert.equal(findMatches(doc, 'hello').length, 2);
  assert.equal(findMatches(doc, 'hello', { caseSensitive: true }).length, 1);
  assert.deepEqual(findMatches(doc, ''), []);
});

test('inline atoms count as one position and never join words across them', () => {
  const doc = schema.nodes.doc.create(null, [para(text('전'), schema.nodes.footnote.create(), text('시 전시'))]);
  const [match, ...rest] = findMatches(doc, '전시');
  assert.equal(rest.length, 0);
  assert.equal(doc.textBetween(match.from, match.to), '전시');
  assert.equal(match.from, 5);
});
