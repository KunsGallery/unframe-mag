import { Node, mergeAttributes } from "@tiptap/core";
import React from "react";
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from "@tiptap/react";

function StickyStoryView({ node, updateAttributes }) {
  const { src = "", caption = "" } = node.attrs;

  return (
    <NodeViewWrapper className="uf-nodeBox uf-nodeBox--sticky" data-uf-node="stickyStory">
      <div className="uf-nodeHead">
        <div className="uf-nodeTitle">STICKY STORY</div>
        <div className="uf-nodeHint">왼쪽(이미지) sticky + 오른쪽(텍스트) 스크롤 스토리텔링.</div>
      </div>

      <div className="uf-stickyStory">
        <div className="uf-stickyMedia">
          {src ? <img src={src} alt={caption || "sticky"} /> : <div className="uf-nodeEmpty">이미지 없음</div>}
          <div style={{ padding: 10 }}>
            <input
              className="uf-input"
              placeholder="이미지 URL (업로드 버튼으로 넣는 걸 추천)"
              value={src}
              onChange={(e) => updateAttributes({ src: e.target.value })}
            />
            <div style={{ height: 8 }} />
            <input
              className="uf-input"
              placeholder="caption (선택)"
              value={caption}
              onChange={(e) => updateAttributes({ caption: e.target.value })}
            />
          </div>
        </div>

        <div className="uf-stickyText">
          <NodeViewContent className="uf-nodeContent" />
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export const StickyStory = Node.create({
  name: "stickyStory",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      src: { default: "" },
      caption: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'section[data-uf="sticky"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { src, caption } = node.attrs;

    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-uf": "sticky",
        class: "uf-scene uf-reveal",
      }),
      [
        "div",
        { class: "uf-stickyStory" },
        [
          "div",
          { class: "uf-stickyMedia" },
          src ? ["img", { src, alt: caption || "" }] : ["div", {}, ""],
        ],
        ["div", { class: "uf-stickyText" }, 0],
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(StickyStoryView);
  },
});
