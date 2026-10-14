import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

test("quick settings retain and map their input target, then reject its deletion", async () => {
  let selected;
  let focused = false;
  const handlers = {};
  const type = { name: "ufImage" };
  const first = { type, attrs: { caption: "first" } };
  const second = { type, attrs: { caption: "second" } };
  const nodes = new Map([[0, first], [3, second]]);
  const editor = {
    state: { selection: { from: 0, node: first }, doc: { nodeAt: (pos) => nodes.get(pos) } },
    on: (name, callback) => { handlers[name] = callback; },
    off() {},
  };
  const context = vm.createContext({ document: { get activeElement() { return { closest: () => focused }; } } });
  const react = new vm.SyntheticModule(["useState", "useEffect"], function () {
    this.setExport("useState", () => [null, (value) => { selected = value; }]);
    this.setExport("useEffect", (callback) => callback());
  }, { context });
  const module = new vm.SourceTextModule(await readFile(new URL("../src/hooks/useSelectedUfBlock.js", import.meta.url), "utf8"), { context });
  await module.link(() => react);
  await module.evaluate();
  module.namespace.useSelectedUfBlock(editor);
  assert.equal(selected.pos, 0);
  focused = true;
  editor.state.selection = { from: 3, node: second };
  handlers.selectionUpdate();
  assert.equal(selected.node, first);
  nodes.delete(0);
  nodes.set(2, first);
  handlers.transaction({ transaction: { mapping: { mapResult: () => ({ pos: 2, deleted: false }) } } });
  assert.equal(selected.pos, 2);
  assert.equal(selected.node, first);
  nodes.set(2, second);
  handlers.transaction({ transaction: { mapping: { mapResult: () => ({ pos: 2, deleted: true }) } } });
  assert.equal(selected, null);
  focused = false;
  handlers.selectionUpdate();
  assert.equal(selected.node, second);
});
