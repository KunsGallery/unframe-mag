import { Node, mergeAttributes } from "@tiptap/core";
import React from "react";
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from "@tiptap/react";

function SceneView() {
  return (
    <NodeViewWrapper className="uf-nodeBox uf-nodeBox--scene" data-uf-node="scene">
      <div className="uf-nodeHead">
        <div className="uf-nodeTitle">SCENE</div>
        <div className="uf-nodeHint">장면(섹션) 블록. 여기 안에 텍스트/이미지/인용 등을 넣어.</div>
      </div>
      <div className="uf-nodeBody">
        <NodeViewContent className="uf-nodeContent" />
      </div>
    </NodeViewWrapper>
  );
}

export const Scene = Node.create({
  name: "scene",
  group: "block",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: 'section[data-uf="scene"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-uf": "scene",
        class: "uf-scene uf-reveal",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SceneView);
  },
});
