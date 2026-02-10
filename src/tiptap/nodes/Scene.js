// src/tiptap/nodes/Scene.js
// -----------------------------------------------------------------------------
// ✅ Scene Node
// - 글을 "장면(Scene)" 단위로 묶는 컨테이너 블록
// - 에디터에서는 테두리/라벨로 구분되어 구조가 한눈에 보임
// - 뷰에서는 .uf-scene 로 감싸져서 섹션 연출(reveal 등)의 기준이 됨
// -----------------------------------------------------------------------------

import { Node, mergeAttributes } from "@tiptap/core";

export const Scene = Node.create({
  name: "scene",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      title: { default: "" }, // 씬 제목(옵션)
      variant: { default: "default" }, // 나중에 'hero' 같은 스타일 확장 가능
    };
  },

  parseHTML() {
    return [{ tag: "section[data-uf-scene]" }];
  },

  renderHTML({ HTMLAttributes }) {
    // ✅ data-uf-scene 를 붙여서 ViewPage에서 안정적으로 찾을 수 있게 함
    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-uf-scene": "1",
        class: `uf-scene uf-reveal`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      insertScene:
        (attrs = {}) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs,
              content: [{ type: "paragraph" }],
            })
            .run();
        },
    };
  },
});
