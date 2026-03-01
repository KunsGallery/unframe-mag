// src/hooks/useSelectedUfBlock.js
import { useEffect, useState } from "react";

/**
 * selection 기준으로 현재 편집 중인 UF 블록을 찾아준다.
 * - NodeSelection이면 selection.node
 * - TextSelection이면 $from 위로 올라가며 가장 가까운 지원 블록 찾기
 */
export function useSelectedUfBlock(editor) {
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!editor) return;

    const SUPPORTED = new Set(["parallaxImage", "stickyStory", "ufImage"]);

    const findBlock = () => {
      const { state } = editor;
      const sel = state.selection;

      // 1) NodeSelection
      if (sel?.node?.type?.name) {
        const name = sel.node.type.name;
        if (SUPPORTED.has(name)) {
          return { type: name, attrs: sel.node.attrs };
        }
      }

      // 2) TextSelection -> 올라가며 찾기
      const $from = sel.$from;
      for (let depth = $from.depth; depth >= 0; depth--) {
        const node = $from.node(depth);
        const name = node?.type?.name;
        if (name && SUPPORTED.has(name)) {
          return { type: name, attrs: node.attrs };
        }
      }

      return null;
    };

    const update = () => setSelected(findBlock());

    // 초기 1회
    update();

    // selection/transaction 변화에 반응
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);

    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  return selected; // { type, attrs } | null
}