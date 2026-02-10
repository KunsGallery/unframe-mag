import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import React from "react";

function SceneView({ node, editor, updateAttributes }) {
  return (
    <div className="uf-nodeBox uf-nodeBox--scene" data-uf-node="scene">
      <div className="uf-nodeHead">
        <div className="uf-nodeTitle">SCENE</div>
        <div className="uf-nodeHint">한 장면(블록) 단위. 아래에 텍스트/이미지/인용 등을 넣어.</div>
        <div className="uf-nodeTools">
          <button
            className="uf-btn uf-btn--ghost"
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="SceneBreak"
          >
            — SceneBreak
          </button>
        </div>
      </div>

      <div className="uf-nodeContent">
        {/* contentDOM 자리 */}
        <div data-content />
      </div>
    </div>
  );
}

export const Scene = Node.create({
  name: "ufScene",
  group: "block",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: 'section[data-uf="scene"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["section", { ...HTMLAttributes, "data-uf": "scene", class: "uf-scene" }, 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer((props) => <SceneView {...props} />);
  },

  addCommands() {
    return {
      insertScene:
        () =>
        ({ chain }) =>
          chain()
            .focus()
            .insertContent({
              type: this.name,
              content: [{ type: "paragraph", content: [{ type: "text", text: "새 Scene을 시작해요 ✨" }] }],
            })
            .run(),
    };
  },
});
