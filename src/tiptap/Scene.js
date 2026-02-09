// src/tiptap/Scene.js
// =============================================================================
// ✅ Scene 노드(섹션) 확장
// - 문서 안에 "섹션 단위"를 만들기 위한 가장 중요한 초석
// - HTML 렌더는 <section data-uf-scene data-variant="...">...</section>
// - 뷰페이지는 이 section들을 기준으로 sticky/reveal/parallax를 적용할 수 있음
//
// variant 종류(현재 MVP):
// - "text"   : 일반 섹션
// - "sticky" : 이미지가 sticky로 붙는 섹션(작가가 1번 이미지 넣고 글 쓰는 방식 권장)
//
// attrs:
// - variant: "text" | "sticky"
// - parallax: 숫자(0~0.4 추천) → 뷰에서 약하게 이미지 이동
// =============================================================================

import { Node, mergeAttributes } from "@tiptap/core";

export const Scene = Node.create({
  name: "scene",

  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "text",
        parseHTML: (el) => el.getAttribute("data-variant") || "text",
        renderHTML: (attrs) => ({ "data-variant": attrs.variant || "text" }),
      },
      parallax: {
        default: 0.12, // 아주 약하게 기본
        parseHTML: (el) => {
          const v = Number(el.getAttribute("data-parallax"));
          return Number.isFinite(v) ? v : 0.12;
        },
        renderHTML: (attrs) => ({ "data-parallax": String(attrs.parallax ?? 0.12) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "section[data-uf-scene]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-uf-scene": "1",
        class: "uf-scene",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      insertScene:
        (attrs = { variant: "text", parallax: 0.12 }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
            content: [{ type: "paragraph", content: [{ type: "text", text: " " }] }],
          });
        },

      insertStickyScene:
        (attrs = { variant: "sticky", parallax: 0.18 }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Sticky Scene (이미지 1개 + 텍스트) ✨" }] },
              { type: "paragraph", content: [{ type: "text", text: "여기에 이미지를 넣고, 아래에 내용을 작성하세요." }] },
            ],
          });
        },
    };
  },
});
