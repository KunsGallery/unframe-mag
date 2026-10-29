import { Extension } from "@tiptap/core";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";

// Inside these the movable unit is the whole table, not a cell's paragraph.
const LOCKED_PARENTS = new Set(["tableCell", "tableHeader", "tableRow", "table"]);

// Blocks around the cursor from innermost to outermost: { node, pos, parent, index }.
export function movableBlocks(selection) {
  const blocks = [];
  if (selection instanceof NodeSelection && selection.node.isBlock && !LOCKED_PARENTS.has(selection.$from.parent.type.name)) {
    blocks.push({ node: selection.node, pos: selection.from, parent: selection.$from.parent, index: selection.$from.index() });
  }
  const { $from } = selection;
  for (let depth = $from.depth; depth >= 1; depth -= 1) {
    const parent = $from.node(depth - 1);
    if (LOCKED_PARENTS.has(parent.type.name)) continue;
    const node = $from.node(depth);
    if (blocks.some((block) => block.node === node)) continue;
    blocks.push({ node, pos: $from.before(depth), parent, index: $from.index(depth - 1) });
  }
  return blocks;
}

export function findMovableBlock(selection) {
  return movableBlocks(selection)[0] || null;
}

function shiftSelection(selection, doc, delta) {
  if (selection instanceof NodeSelection) return NodeSelection.create(doc, selection.from + delta);
  return TextSelection.create(doc, selection.anchor + delta, selection.head + delta);
}

// Moves the innermost block that has a neighbour that way, so a list item's only
// paragraph moves the whole item, and the last item moves the whole list.
export function moveBlock(state, dispatch, direction) {
  const block = movableBlocks(state.selection).find(({ parent, index }) => {
    const neighbour = index + (direction < 0 ? -1 : 1);
    return neighbour >= 0 && neighbour < parent.childCount;
  });
  if (!block) return false;
  const { node, pos, parent, index } = block;
  const neighbourIndex = index + (direction < 0 ? -1 : 1);
  if (neighbourIndex < 0 || neighbourIndex >= parent.childCount) return false;
  const neighbour = parent.child(neighbourIndex);
  if (dispatch) {
    const tr = state.tr.delete(pos, pos + node.nodeSize);
    const target = direction < 0 ? pos - neighbour.nodeSize : pos + neighbour.nodeSize;
    tr.insert(target, node);
    tr.setSelection(shiftSelection(state.selection, tr.doc, target - pos));
    dispatch(tr.scrollIntoView());
  }
  return true;
}

export function duplicateBlock(state, dispatch) {
  const block = findMovableBlock(state.selection);
  if (!block) return false;
  if (dispatch) {
    const end = block.pos + block.node.nodeSize;
    const tr = state.tr.insert(end, block.node.copy(block.node.content));
    tr.setSelection(shiftSelection(state.selection, tr.doc, block.node.nodeSize));
    dispatch(tr.scrollIntoView());
  }
  return true;
}

export const BlockTools = Extension.create({
  name: "blockTools",
  addCommands() {
    return {
      moveBlockUp: () => ({ state, dispatch }) => moveBlock(state, dispatch, -1),
      moveBlockDown: () => ({ state, dispatch }) => moveBlock(state, dispatch, 1),
      duplicateBlock: () => ({ state, dispatch }) => duplicateBlock(state, dispatch),
    };
  },
  addKeyboardShortcuts() {
    return {
      "Mod-Shift-ArrowUp": () => this.editor.commands.moveBlockUp(),
      "Mod-Shift-ArrowDown": () => this.editor.commands.moveBlockDown(),
      "Mod-d": () => this.editor.commands.duplicateBlock(),
    };
  },
});
