import assert from 'node:assert/strict';
import test from 'node:test';
import { Schema } from '@tiptap/pm/model';
import { EditorState, NodeSelection, TextSelection } from '@tiptap/pm/state';
import { TEXT_SIZE_STEPS, copyFormatting, hasFormatting, stepTextSize, textSizeLabel, textSizeRatio } from '../src/lib/textFormatting.js';
import { duplicateBlock, findMovableBlock, moveBlock } from '../src/tiptap/extensions/BlockTools.js';

test('text sizes read relative and legacy px values', () => {
  assert.equal(textSizeRatio(null), 1);
  assert.equal(textSizeRatio('1.5em'), 1.5);
  assert.equal(textSizeRatio('36px'), 2);
  assert.equal(textSizeLabel(null), '기본');
  assert.equal(textSizeLabel('1.25em'), '125%');
  assert.equal(textSizeLabel('24px'), '24px');
});

test('stepTextSize walks the scale and joins it from old px sizes', () => {
  assert.equal(stepTextSize(null, 1), '1.125em');
  assert.equal(stepTextSize(null, -1), '0.875em');
  assert.equal(stepTextSize('1.125em', -1), null);
  assert.equal(stepTextSize(TEXT_SIZE_STEPS.at(-1), 1), TEXT_SIZE_STEPS.at(-1));
  assert.equal(stepTextSize('0.75em', -1), '0.75em');
  // 24px ≈ 1.33: up goes to the next larger step, down to the next smaller one.
  assert.equal(stepTextSize('24px', 1), '1.5em');
  assert.equal(stepTextSize('24px', -1), '1.25em');
});

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'text*', marks: '_', toDOM: () => ['p', 0] },
    image: { group: 'block', atom: true, selectable: true, toDOM: () => ['img'] },
    bulletList: { group: 'block', content: 'listItem+', toDOM: () => ['ul', 0] },
    listItem: { content: 'paragraph+', toDOM: () => ['li', 0] },
    text: {},
  },
  marks: {
    bold: { toDOM: () => ['strong', 0] },
    link: { attrs: { href: {} }, toDOM: () => ['a', 0] },
    textStyle: { attrs: { fontSize: { default: null } }, toDOM: () => ['span', 0] },
  },
});
const p = (text) => schema.node('paragraph', null, text ? [schema.text(text)] : []);
const texts = (state) => { const out = []; state.doc.forEach((node) => out.push(node.type.name === 'paragraph' ? node.textContent : node.type.name)); return out; };
const apply = (state, command) => { let next = state; const ok = command(state, (tr) => { next = state.apply(tr); }); return { ok, next }; };
// Cursor inside the nth top-level block.
function stateAt(doc, index, offset = 1) {
  let pos = 0;
  for (let i = 0; i < index; i += 1) pos += doc.child(i).nodeSize;
  return EditorState.create({ doc, selection: TextSelection.create(doc, pos + offset) });
}

test('moveBlock swaps the cursor block with its neighbour and keeps the cursor in it', () => {
  const doc = schema.node('doc', null, [p('one'), p('two'), p('three')]);
  const down = apply(stateAt(doc, 0, 2), (s, d) => moveBlock(s, d, 1));
  assert.ok(down.ok);
  assert.deepEqual(texts(down.next), ['two', 'one', 'three']);
  assert.equal(down.next.selection.$from.parent.textContent, 'one');
  const up = apply(down.next, (s, d) => moveBlock(s, d, -1));
  assert.deepEqual(texts(up.next), ['one', 'two', 'three']);
  assert.equal(apply(stateAt(doc, 0), (s, d) => moveBlock(s, d, -1)).ok, false);
  assert.equal(apply(stateAt(doc, 2), (s, d) => moveBlock(s, d, 1)).ok, false);
});

test('moveBlock moves a selected image and list items within their list', () => {
  const doc = schema.node('doc', null, [p('a'), schema.node('image'), p('b')]);
  const state = EditorState.create({ doc, selection: NodeSelection.create(doc, 3) });
  const { next } = apply(state, (s, d) => moveBlock(s, d, -1));
  assert.deepEqual(texts(next), ['image', 'a', 'b']);
  assert.ok(next.selection instanceof NodeSelection);

  const list = schema.node('bulletList', null, [schema.node('listItem', null, [p('x')]), schema.node('listItem', null, [p('y')])]);
  const listDoc = schema.node('doc', null, [list]);
  const inFirst = EditorState.create({ doc: listDoc, selection: TextSelection.create(listDoc, 3) });
  assert.equal(findMovableBlock(inFirst.selection).node.type.name, 'paragraph');
  // The paragraph has no sibling in its item, so the whole list item moves instead.
  const moved = apply(inFirst, (s, d) => moveBlock(s, d, 1));
  assert.ok(moved.ok);
  assert.deepEqual(moved.next.doc.child(0).content.content.map((item) => item.textContent), ['y', 'x']);
  assert.equal(moved.next.selection.$from.parent.textContent, 'x');
});

test('duplicateBlock inserts a copy after the block and moves the cursor into it', () => {
  const doc = schema.node('doc', null, [p('one'), p('two')]);
  const { ok, next } = apply(stateAt(doc, 0, 2), duplicateBlock);
  assert.ok(ok);
  assert.deepEqual(texts(next), ['one', 'one', 'two']);
  assert.equal(next.selection.from, 2 + doc.child(0).nodeSize);
});

test('format painter copies formatting marks but not links; hasFormatting sees them', () => {
  const styled = schema.text('hi', [schema.marks.bold.create(), schema.marks.link.create({ href: 'https://a.kr' }), schema.marks.textStyle.create({ fontSize: '1.5em' })]);
  const doc = schema.node('doc', null, [schema.node('paragraph', null, [styled, schema.text(' plain')])]);
  const state = EditorState.create({ doc, selection: TextSelection.create(doc, 1, 3) });
  assert.deepEqual(copyFormatting(state).map((mark) => mark.type).sort(), ['bold', 'textStyle']);
  assert.equal(hasFormatting(state), true);
  assert.equal(hasFormatting(EditorState.create({ doc, selection: TextSelection.create(doc, 4, 9) })), false);
});
