// src/tiptap/nodes/StickyStory.js
// -----------------------------------------------------------------------------
// ✅ Sticky Story Node
// - "왼쪽 미디어(스티키) + 오른쪽 텍스트 스텝" 구조를 한 블록으로 제공
// - 에디터에서는 테두리/라벨로 보이고, 내용은 일반 문단으로 계속 작성 가능
// - 뷰에서는 CSS로 2컬럼 + sticky 적용됨
// -----------------------------------------------------------------------------

import { Node, mergeAttributes } from "@tiptap/core";

export const StickyStory = Node.create({
  name: "stickyStory",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      mediaSrc: { default: "" }, // 왼쪽 이미지(대표)
      mediaAlt: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "section[data-uf-sticky]" }];
  },

  renderHTML({ HTMLAttributes }) {
    // ✅ mediaSrc는 data 속성으로 보관(뷰에서 쉽게 읽음)
    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-uf-sticky": "1",
        "data-media-src": HTMLAttributes.mediaSrc || "",
        class: "uf-stickyStory uf-reveal",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      insertStickyStory:
        (attrs = {}) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs,
              content: [
                { type: "paragraph", content: [{ type: "text", text: "스텝 1) 여기에 설명을 써요." }] },
                { type: "paragraph", content: [{ type: "text", text: "스텝 2) 다음 문단을 써요." }] },
              ],
            })
            .run();
        },

      setStickyMedia:
        (mediaSrc) =>
        ({ chain }) =>
          chain().updateAttributes(this.name, { mediaSrc }).run(),
    };
  },
});
