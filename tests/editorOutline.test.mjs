import assert from 'node:assert/strict';
import test from 'node:test';
import { Schema } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import { buildOutline, moveEditorBlock } from '../src/lib/editorOutline.js';

const schema = new Schema({ nodes: { doc: { content: 'block+' }, text: { group: 'inline' }, paragraph: { group: 'block', content: 'inline*' }, heading: { group: 'block', content: 'inline*', attrs: { level: { default: 2 } } }, gallery: { group: 'block', atom: true, attrs: { images: { default: [] } } } } });
const paragraph = (text) => schema.node('paragraph', {}, text ? schema.text(text) : []);
function makeEditor(nodes) {
  const editor = { state: EditorState.create({ doc: schema.node('doc', {}, nodes) }), isEditable: true, isDestroyed: false };
  editor.view = { dispatch: (tr) => { editor.state = editor.state.apply(tr); }, focus() {} };
  return editor;
}
test('outline uses real top-level positions and labels for text and media', () => {
  const editor = makeEditor([paragraph('한글'), schema.node('gallery'), schema.node('heading', { level: 2 }, schema.text('제목'))]);
  assert.deepEqual(buildOutline(editor.state.doc).map(({ pos, label, heading }) => ({ pos, label, heading })), [{ pos: 0, label: '한글', heading: false }, { pos: 4, label: '사진 갤러리', heading: false }, { pos: 5, label: '제목', heading: true }]);
});
test('moving variable-size blocks in either direction keeps content and selection valid', () => {
  const editor = makeEditor([paragraph('A'), paragraph('Longer'), schema.node('gallery')]);
  assert.equal(moveEditorBlock(editor, 3, -1), true);
  assert.deepEqual(buildOutline(editor.state.doc).map((item) => item.label), ['Longer', 'A', '사진 갤러리']);
  assert.equal(moveEditorBlock(editor, 0, 1), true);
  assert.deepEqual(buildOutline(editor.state.doc).map((item) => item.label), ['A', 'Longer', '사진 갤러리']);
  assert.equal(moveEditorBlock(editor, 11, -1), true);
  assert.deepEqual(buildOutline(editor.state.doc).map((item) => item.label), ['A', '사진 갤러리', 'Longer']);
});
test('invalid destinations, boundary moves and readonly editors do not modify documents', () => {
  const editor = makeEditor([paragraph('A'), paragraph('B')]);
  const before = editor.state.doc.toJSON();
  for (const [pos, direction] of [[0, -1], [3, 1], [2, -1], [0, 2]]) assert.equal(moveEditorBlock(editor, pos, direction), false);
  editor.isEditable = false;
  assert.equal(moveEditorBlock(editor, 0, 1), false);
  assert.deepEqual(editor.state.doc.toJSON(), before);
});
