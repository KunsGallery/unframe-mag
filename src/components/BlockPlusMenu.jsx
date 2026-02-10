import React, { useMemo, useState } from "react";

export default function BlockPlusMenu({ editor }) {
  const [open, setOpen] = useState(false);

  const items = useMemo(() => {
    if (!editor) return [];
    return [
      {
        title: "Scene",
        desc: "스크롤텔링의 ‘장면’ 블록",
        onClick: () => editor.commands.insertScene(),
      },
      {
        title: "Sticky Story",
        desc: "왼쪽 이미지 고정 + 오른쪽 텍스트 흐름",
        onClick: () => editor.commands.insertStickyStory(),
      },
      {
        title: "Parallax Image",
        desc: "스크롤에 따라 이미지가 살짝 이동",
        onClick: () => editor.commands.insertParallaxImage(),
      },
      {
        title: "SceneBreak",
        desc: "장면 구분선(HR). 에디터에서 SCENE BREAK로 보임",
        onClick: () => editor.chain().focus().setHorizontalRule().run(),
      },
      {
        title: "Quote",
        desc: "인용(문단 강조)",
        onClick: () => editor.chain().focus().toggleBlockquote().run(),
      },
    ];
  }, [editor]);

  if (!editor) return null;

  return (
    <>
      <div className="uf-leftPlus">
        <button className="uf-btn uf-btn--primary" type="button" onClick={() => setOpen((v) => !v)}>
          ＋
        </button>
      </div>

      {open && (
        <div className="uf-plusPanel">
          <div className="uf-plusHead">
            <div style={{ fontWeight: 950 }}>Blocks</div>
            <button className="uf-btn uf-btn--ghost" onClick={() => setOpen(false)}>닫기</button>
          </div>

          <div className="uf-plusBody">
            {items.map((it) => (
              <button
                key={it.title}
                type="button"
                className="uf-plusItem"
                onClick={() => {
                  it.onClick();
                  setOpen(false);
                }}
              >
                <div style={{ fontWeight: 950 }}>{it.title}</div>
                <div className="uf-plusDesc">{it.desc}</div>
              </button>
            ))}
          </div>

          <div className="uf-plusFoot">
            팁: Scene → (글/이미지) → SceneBreak → 다음 Scene
          </div>
        </div>
      )}
    </>
  );
}
