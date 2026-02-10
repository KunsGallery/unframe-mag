import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import React from "react";

function StickyView({ node, editor, updateAttributes }) {
  const src = node.attrs.src || "";

  return (
    <div className="uf-nodeBox uf-nodeBox--sticky" data-uf-node="sticky">
      <div className="uf-nodeHead">
        <div className="uf-nodeTitle">STICKY STORY</div>
        <div className="uf-nodeHint">왼쪽 이미지는 스크롤 중 고정, 오른쪽 텍스트만 흐르는 스토리텔링.</div>

        <div className="uf-nodeTools">
          <button
            className="uf-btn uf-btn--ghost"
            type="button"
            onClick={() => {
              const next = window.prompt("Sticky 이미지 URL", src || "https://");
              if (next === null) return;
              updateAttributes({ src: next.trim() });
            }}
          >
            🖼 URL
          </button>

          <button
            className="uf-btn uf-btn--ghost"
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            — SceneBreak
          </button>
        </div>
      </div>

      <div className="uf-stickyStory">
        <div className="uf-stickyMedia">
          {src ? (
            <img src={src} alt="sticky" />
          ) : (
            <div className="uf-stickyPlaceholder">이미지 URL을 넣어주세요</div>
          )}
        </div>

        <div className="uf-stickyText">
          <div data-content />
        </div>
      </div>
    </div>
  );
}

export const StickyStory = Node.create({
  name: "ufStickyStory",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      src: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-uf="sticky"]' }];
  },

  renderHTML({ node }) {
    const src = node.attrs.src || "";
    return [
      "div",
      { "data-uf": "sticky", class: "uf-stickyStory" },
      ["div", { class: "uf-stickyMedia" }, ["img", { src, alt: "sticky" }]],
      ["div", { class: "uf-stickyText" }, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer((props) => <StickyView {...props} />);
  },

  addCommands() {
    return {
      insertStickyStory:
        () =>
        ({ chain }) =>
          chain()
            .focus()
            .insertContent({
              type: this.name,
              attrs: { src: "https://placehold.co/1200x800?text=Sticky+Image" },
              content: [
                { type: "paragraph", content: [{ type: "text", text: "여기에 텍스트를 길게 쓰면 스티키가 살아나요." }] },
                { type: "paragraph", content: [{ type: "text", text: "문단을 여러 개로 늘려보세요." }] },
              ],
            })
            .run(),
    };
  },
});
