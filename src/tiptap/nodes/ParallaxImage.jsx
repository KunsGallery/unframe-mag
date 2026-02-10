import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import React from "react";

function ParallaxView({ node, updateAttributes }) {
  const src = node.attrs.src || "";
  return (
    <div className="uf-nodeBox uf-nodeBox--parallax" data-uf-node="parallax">
      <div className="uf-nodeHead">
        <div className="uf-nodeTitle">PARALLAX IMAGE</div>
        <div className="uf-nodeHint">스크롤할 때 이미지가 살짝 떠다니는 효과.</div>
        <div className="uf-nodeTools">
          <button
            className="uf-btn uf-btn--ghost"
            type="button"
            onClick={() => {
              const next = window.prompt("Parallax 이미지 URL", src || "https://");
              if (next === null) return;
              updateAttributes({ src: next.trim() });
            }}
          >
            🖼 URL
          </button>
        </div>
      </div>

      {src ? (
        <img className="uf-parallax" data-parallax="1" src={src} alt="parallax" />
      ) : (
        <div className="uf-stickyPlaceholder">이미지 URL을 넣어주세요</div>
      )}
    </div>
  );
}

export const ParallaxImage = Node.create({
  name: "ufParallaxImage",
  group: "block",
  atom: true,
  defining: true,

  addAttributes() {
    return {
      src: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'img[data-uf="parallax"]' }];
  },

  renderHTML({ node }) {
    const src = node.attrs.src || "";
    return ["img", { "data-uf": "parallax", class: "uf-parallax", "data-parallax": "1", src, alt: "parallax" }];
  },

  addNodeView() {
    return ReactNodeViewRenderer((props) => <ParallaxView {...props} />);
  },

  addCommands() {
    return {
      insertParallaxImage:
        () =>
        ({ chain }) =>
          chain()
            .focus()
            .insertContent({
              type: this.name,
              attrs: { src: "https://placehold.co/1400x900?text=Parallax" },
            })
            .run(),
    };
  },
});
