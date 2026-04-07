import { Extension } from "@tiptap/core";
import { TextSelection, NodeSelection } from "@tiptap/pm/state";

const BLOCK_TYPES = new Set([
  "ufImage",
  "gallery",
  "slideGallery",
  "columns",
  "ufCallout",
  "ufDivider",
  "stickyStory",
  "parallaxImage",
]);

function insertParagraphAfter(state, dispatch, pos, nodeSize) {
  const paragraph = state.schema.nodes.paragraph?.create();
  if (!paragraph) return false;

  const insertPos = pos + nodeSize;
  const tr = state.tr.insert(insertPos, paragraph);
  tr.setSelection(TextSelection.near(tr.doc.resolve(insertPos + 1)));
  dispatch?.(tr.scrollIntoView());
  return true;
}

function deleteSelectedBlock(state, dispatch) {
  const { selection } = state;
  const node = selection.node;
  if (!node) return false;
  if (!BLOCK_TYPES.has(node.type.name)) return false;

  const tr = state.tr.deleteSelection();
  dispatch?.(tr.scrollIntoView());
  return true;
}

function selectNodeBeforeIfEmptyParagraph(state, dispatch) {
  const { selection } = state;
  if (!selection.empty) return false;

  const $from = selection.$from;
  const parent = $from.parent;

  // 빈 paragraph 안에서만 동작
  if (parent.type.name !== "paragraph") return false;
  if (parent.textContent.length > 0) return false;

  const before = $from.nodeBefore;
  if (!before) return false;
  if (!BLOCK_TYPES.has(before.type.name)) return false;

  const beforePos = $from.pos - before.nodeSize;
  const tr = state.tr.setSelection(NodeSelection.create(state.doc, beforePos));
  dispatch?.(tr.scrollIntoView());
  return true;
}

function ensureParagraphAfterTable(state, dispatch) {
  const { selection } = state;
  const $from = selection.$from;

  for (let depth = $from.depth; depth >= 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === "table") {
      const tablePos = $from.before(depth);
      const afterTablePos = tablePos + node.nodeSize;

      const nextNode = state.doc.nodeAt(afterTablePos);
      if (nextNode && nextNode.type.name === "paragraph") {
        return false;
      }

      const paragraph = state.schema.nodes.paragraph?.create();
      if (!paragraph) return false;

      const tr = state.tr.insert(afterTablePos, paragraph);
      tr.setSelection(TextSelection.near(tr.doc.resolve(afterTablePos + 1)));
      dispatch?.(tr.scrollIntoView());
      return true;
    }
  }

  return false;
}

function insertParagraphAfterClosestContainer(state, dispatch, containerTypes) {
  const { selection } = state;
  if (!selection.empty) return false;

  const $from = selection.$from;

  for (let depth = $from.depth; depth >= 0; depth--) {
    const node = $from.node(depth);
    if (!containerTypes.has(node.type.name)) continue;

    const endPos = $from.end(depth);

    // 커서가 해당 컨테이너의 마지막 위치 근처일 때만
    if ($from.pos < endPos - 1) return false;

    const paragraph = state.schema.nodes.paragraph?.create();
    if (!paragraph) return false;

    const insertPos = $from.after(depth);
    const tr = state.tr.insert(insertPos, paragraph);
    tr.setSelection(TextSelection.near(tr.doc.resolve(insertPos + 1)));
    dispatch?.(tr.scrollIntoView());
    return true;
  }

  return false;
}

export const EditorKeyBehavior = Extension.create({
  name: "editorKeyBehavior",

  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { state, dispatch } = this.editor.view;

        // 1) 블록 선택 상태면 바로 삭제
        if (deleteSelectedBlock(state, dispatch)) return true;

        // 2) 빈 문단에서 Backspace면 이전 커스텀 블록 선택
        if (selectNodeBeforeIfEmptyParagraph(state, dispatch)) return true;

        return false;
      },

      Delete: () => {
        const { state, dispatch } = this.editor.view;
        return deleteSelectedBlock(state, dispatch);
      },

      Enter: () => {
        const { state, dispatch } = this.editor.view;
        const { selection } = state;

        // 1) NodeSelection 상태에서 Enter → 다음 문단 생성
        if (selection.node && BLOCK_TYPES.has(selection.node.type.name)) {
          const pos = selection.from;
          const nodeSize = selection.node.nodeSize;
          return insertParagraphAfter(state, dispatch, pos, nodeSize);
        }

        // 2) 커서가 블록 바로 뒤에 있을 때 Enter → 새 문단 보강
        const $from = selection.$from;
        const before = $from.nodeBefore;
        if (before && BLOCK_TYPES.has(before.type.name) && selection.empty) {
          const paragraph = state.schema.nodes.paragraph?.create();
          if (!paragraph) return false;

          const tr = state.tr.insert(selection.from, paragraph);
          tr.setSelection(TextSelection.near(tr.doc.resolve(selection.from + 1)));
          dispatch?.(tr.scrollIntoView());
          return true;
        }

        // 3) 컬럼 / 콜아웃 / 스티키 끝에서 Enter → 컨테이너 바깥 문단 생성
        if (
          insertParagraphAfterClosestContainer(
            state,
            dispatch,
            new Set(["column", "ufCallout", "stickyStory"])
          )
        ) {
          return true;
        }

        return false;
      },

      "Mod-Enter": () => {
        const { state, dispatch } = this.editor.view;

        // 표 안에서는 Cmd/Ctrl+Enter 로 표 밖 문단 생성
        if (ensureParagraphAfterTable(state, dispatch)) return true;

        return false;
      },
    };
  },
});