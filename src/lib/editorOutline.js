import { NodeSelection, TextSelection } from '@tiptap/pm/state';

const labels = { paragraph: '문단', heading: '제목', ufImage: '이미지', image: '이미지', gallery: '사진 갤러리', slideGallery: '슬라이드 갤러리', columns: '다단 구성', parallaxImage: '패럴랙스 이미지', stickyStory: '스크롤 스토리', ufCallout: '인용 / 안내', ufDivider: '구분선', ufPlaylist: '플레이리스트', ufPodcast: '팟캐스트', ufPoll: '투표', table: '표', bulletList: '목록', orderedList: '번호 목록', blockquote: '인용', scene: '장면' };

export function buildOutline(doc) {
  const items = [];
  doc.forEach((node, pos, index) => {
    items.push({ pos, index, size: node.nodeSize, type: node.type.name, label: node.textContent?.trim().slice(0, 70) || labels[node.type.name] || node.type.name, heading: node.type.name === 'heading', level: node.attrs.level || 0 });
  });
  return items;
}

export function focusEditorBlock(editor, pos) {
  if (!editor || editor.isDestroyed) return;
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  const selection = node.isAtom && NodeSelection.isSelectable(node)
    ? NodeSelection.create(editor.state.doc, pos)
    : TextSelection.near(editor.state.doc.resolve(Math.min(pos + 1, editor.state.doc.content.size)));
  editor.view.dispatch(editor.state.tr.setSelection(selection));
  editor.view.focus();
  const dom = editor.view.nodeDOM(pos);
  const element = dom?.nodeType === 1 ? dom : dom?.parentElement;
  element?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
}

export function moveEditorBlock(editor, pos, direction) {
  if (!editor?.isEditable || editor.isDestroyed) return false;
  const items = buildOutline(editor.state.doc);
  const index = items.findIndex((item) => item.pos === pos);
  const other = items[index + direction];
  const current = items[index];
  if (!current || !other || ![-1, 1].includes(direction)) return false;
  const node = editor.state.doc.nodeAt(pos);
  const destination = direction < 0 ? other.pos : other.pos + other.size - current.size;
  const tr = editor.state.tr.delete(pos, pos + current.size).insert(destination, node);
  tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(destination + 1, tr.doc.content.size))));
  editor.view.dispatch(tr);
  editor.view.focus();
  return true;
}
