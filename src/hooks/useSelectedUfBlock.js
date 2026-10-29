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
    if (!editor || editor.isDestroyed) return;

    const SUPPORTED = new Set([
      "parallaxImage",
      "stickyStory",
      "ufImage",
      "image",
      "gallery",
      "slideGallery",
      "SlideGallery",
      "columns",
      "ufDivider",
      "ufCallout",
      "ufLinkCard",
      "table",
    ]);

    const findBlock = () => {
      const { state } = editor;
      const sel = state.selection;

      // 1) NodeSelection
      if (sel?.node?.type?.name) {
        const rawName = sel.node.type.name;
        const name = rawName === "SlideGallery" ? "slideGallery" : rawName;
        if (SUPPORTED.has(name)) {
          return {
            type: name,
            pos: sel.from,
            node: sel.node,
            attrs: sel.node.attrs,
            content: sel.node.content?.toJSON?.() || [],
          };
        }
      }

      // 2) TextSelection -> 올라가며 찾기
      const $from = sel.$from;
      for (let depth = $from.depth; depth >= 0; depth--) {
        const node = $from.node(depth);
        const rawName = node?.type?.name;
        const name = rawName === "SlideGallery" ? "slideGallery" : rawName;
        if (name && SUPPORTED.has(name)) {
          return {
            type: name,
            pos: $from.before(depth),
            node,
            attrs: node.attrs,
            content: node.content?.toJSON?.() || [],
          };
        }
      }

      return null;
    };

    let current = null;
    const update = ({ transaction } = {}) => {
      // Keep the input's target through document edits and selection changes.
      if (current && document.activeElement?.closest('[data-uf-quick-settings]')) {
        const mapped = transaction?.mapping.mapResult(current.pos, 1);
        const pos = mapped?.pos ?? current.pos;
        const node = !mapped?.deleted && editor.state.doc.nodeAt(pos);
        current = node?.type === current.node.type
          ? { ...current, pos, node, attrs: node.attrs, content: node.content?.toJSON?.() || [] }
          : null;
      } else {
        current = findBlock();
      }
      setSelected(current);
    };

    update();

    editor.on("selectionUpdate", update);
    editor.on("transaction", update);

    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  return selected;
}
