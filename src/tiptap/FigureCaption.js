// src/tiptap/FigureCaption.js
/**
 * ✅ FigureCaption Extension (TipTap v3)
 *
 * 목표
 * - 이미지에 "캡션"을 안정적으로 붙이기 위해, schema(node)를 명확히 정의합니다.
 * - 단순 HTML 삽입(div) 방식은 에디터 편집은 쉬워도 "선택/삭제/이동"이 깨질 수 있어
 *   figure 노드를 만들어 안전하게 다룹니다.
 *
 * 구조(HTML)
 * <figure class="uf-figure" data-align="center">
 *   <img ... />
 *   <figcaption>Caption...</figcaption>
 * </figure>
 *
 * 내부 schema는:
 * - figure: block 노드
 * - content: "image figcaption"
 * - figcaption: 내부에서 텍스트 편집 가능 (inline*)
 */

import { Node, mergeAttributes } from "@tiptap/core";

export const Figure = Node.create({
  name: "figure",

  group: "block",
  content: "image figcaption",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      align: {
        default: "center", // left | center | right
        parseHTML: (el) => el.getAttribute("data-align") || "center",
        renderHTML: (attrs) => ({ "data-align": attrs.align || "center" }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure.uf-figure",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["figure", mergeAttributes({ class: "uf-figure" }, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      /**
       * ✅ wrapSelectionInFigure()
       * - 현재 selection이 "image node"일 때만 동작
       * - image + figcaption을 묶어 <figure>로 바꿉니다
       */
      wrapSelectionInFigure:
        (options = {}) =>
        ({ editor, state, chain }) => {
          const { selection } = state;
          const { $from } = selection;

          // 선택된 node가 image인지 확인
          if (!selection?.node || selection.node.type.name !== "image") {
            return false;
          }

          const imageNode = selection.node;
          const align = options.align || "center";

          // figcaption 노드 생성
          const figcaption = editor.schema.nodes.figcaption.create(
            {},
            editor.schema.text(options.text || "Caption…")
          );

          // figure 노드 생성 (image + figcaption)
          const figure = editor.schema.nodes.figure.create({ align }, [
            imageNode,
            figcaption,
          ]);

          // selection 범위를 figure로 교체
          return chain()
            .focus()
            .command(({ tr }) => {
              tr.replaceRangeWith(selection.from, selection.to, figure);
              return true;
            })
            .run();
        },

      /**
       * ✅ unwrapFigure()
       * - 커서가 figure 내부일 때 figure를 풀어 "image + paragraph"로 변환
       * - 캡션은 일반 paragraph로 변환해서 내용은 유지
       */
      unwrapFigure:
        () =>
        ({ editor, state, chain }) => {
          const { selection } = state;
          const { $from } = selection;

          // figure 부모 찾기
          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            if (node.type.name === "figure") {
              const pos = $from.before(d);
              const figureNode = node;

              // figure 안의 image, figcaption 가져오기
              const img = figureNode.firstChild;
              const cap = figureNode.lastChild;

              // figcaption -> paragraph로 변환(내용 유지)
              const paragraph = editor.schema.nodes.paragraph.create(
                {},
                cap?.content || null
              );

              return chain()
                .focus()
                .command(({ tr }) => {
                  tr.replaceRangeWith(pos, pos + figureNode.nodeSize, [
                    img,
                    paragraph,
                  ]);
                  return true;
                })
                .run();
            }
          }
          return false;
        },

      /**
       * ✅ setFigureAlign(left|center|right)
       * - figure 선택 상태 or 커서가 figure 내부일 때 align 변경
       */
      setFigureAlign:
        (align) =>
        ({ state, chain }) => {
          const { selection } = state;
          const { $from } = selection;

          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            if (node.type.name === "figure") {
              const pos = $from.before(d);
              return chain()
                .focus()
                .command(({ tr }) => {
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    align,
                  });
                  return true;
                })
                .run();
            }
          }
          return false;
        },
    };
  },
});

export const Figcaption = Node.create({
  name: "figcaption",

  group: "", // figure 안에서만 쓰이게 content 제한
  content: "inline*",
  defining: true,

  parseHTML() {
    return [{ tag: "figcaption" }];
  },

  renderHTML() {
    return ["figcaption", { class: "uf-caption" }, 0];
  },
});
