// src/components/BlockPlusMenu.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * ✅ BlockPlusMenu (Notion-like)
 * - 현재 커서가 있는 "블록 줄" 왼쪽에 + 버튼을 띄움
 * - + 클릭 → 블록 삽입 메뉴
 *
 * props:
 * - editor: TipTap editor instance
 * - wrapperRef: 에디터 영역 래퍼(ref). 좌표 계산용
 * - onUploadImage: (file) => Promise<string url>  // 일반 이미지 업로드
 * - onUploadCoverOptional: (file) => ... (필요 없으면 안 씀)
 */
export default function BlockPlusMenu({ editor, wrapperRef, onUploadImage }) {
  const [pos, setPos] = useState({ top: 0, left: 0, visible: false });
  const [open, setOpen] = useState(false);
  const fileRef = useRef(null);
  const stickyFileRef = useRef(null);

  const items = useMemo(() => {
    return [
      { key: "h2", label: "Heading 2", hint: "섹션 제목" },
      { key: "p", label: "Text", hint: "일반 문단" },
      { key: "quote", label: "Quote", hint: "인용" },
      { key: "divider", label: "Scene Break", hint: "장면 구분선(HR)" },
      { key: "image", label: "Image", hint: "이미지 업로드" },
      { key: "parallax", label: "Parallax Image", hint: "패럴럭스 이미지(뷰에서 움직임)" },
      { key: "sticky", label: "Sticky Story", hint: "미디어 고정 + 텍스트 스크롤" },
      { key: "stickyMedia", label: "Sticky Media 지정", hint: "선택한 Sticky Story에 미디어 지정" },
    ];
  }, []);

  // ✅ 커서 위치가 바뀌면 + 버튼 좌표 업데이트
  useEffect(() => {
    if (!editor) return;

    const update = () => {
      try {
        const wrap = wrapperRef?.current;
        if (!wrap) return;

        const sel = editor.state.selection;
        const from = sel?.$from?.pos;
        if (!from) return;

        // viewport 좌표
        const coords = editor.view.coordsAtPos(from);
        const wrapRect = wrap.getBoundingClientRect();

        // ✅ 왼쪽 gutter 위치
        const left = Math.max(8, coords.left - wrapRect.left - 44);
        const top = Math.max(8, coords.top - wrapRect.top - 6);

        setPos({ top, left, visible: true });
      } catch {
        setPos((p) => ({ ...p, visible: false }));
      }
    };

    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    update();

    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor, wrapperRef]);

  // ✅ 바깥 클릭하면 메뉴 닫기
  useEffect(() => {
    const onDown = (e) => {
      if (!open) return;
      const menu = document.querySelector(".uf-plusMenu");
      const btn = document.querySelector(".uf-plusBtn");
      if (menu && menu.contains(e.target)) return;
      if (btn && btn.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  // ✅ 메뉴 액션
  async function run(key) {
    if (!editor) return;

    if (key === "h2") {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
      setOpen(false);
      return;
    }

    if (key === "p") {
      editor.chain().focus().setParagraph().run();
      setOpen(false);
      return;
    }

    if (key === "quote") {
      editor.chain().focus().toggleBlockquote().run();
      setOpen(false);
      return;
    }

    if (key === "divider") {
      // ✅ 씬 구분선 = HR
      editor.chain().focus().setHorizontalRule().run();
      setOpen(false);
      return;
    }

    if (key === "image") {
      setOpen(false);
      fileRef.current?.click();
      return;
    }

    if (key === "parallax") {
      setOpen(false);
      // 업로드 or URL 선택
      const choice = window.prompt("Parallax Image: URL을 붙여넣거나, 비우면 업로드를 선택합니다.", "");
      if (choice && choice.trim()) {
        editor.chain().focus().insertParallaxImage({ src: choice.trim(), speed: 0.25 }).run();
        return;
      }
      // 업로드로
      fileRef.current?.click();
      // 업로드 완료 후 "일반 이미지"로 들어가면 안 되니까,
      // 업로드 핸들러에서 editor에 ParallaxImage로 넣도록 분기할 수 있게 flag 사용:
      fileRef.current.dataset.mode = "parallax";
      return;
    }

    if (key === "sticky") {
      editor.chain().focus().insertStickyStory({ mediaSrc: "" }).run();
      setOpen(false);
      return;
    }

    if (key === "stickyMedia") {
      // ✅ StickyStory 블록 안을 클릭한 상태에서 실행해야 함
      setOpen(false);
      stickyFileRef.current?.click();
      return;
    }
  }

  async function onPickFile(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !editor) return;

    // mode: parallax | normal
    const mode = e.target.dataset.mode || "normal";
    e.target.dataset.mode = "normal";

    const url = await onUploadImage?.(f);
    if (!url) return;

    if (mode === "parallax") {
      editor.chain().focus().insertParallaxImage({ src: url, speed: 0.25 }).run();
    } else {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }

  async function onPickStickyMedia(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !editor) return;

    const url = await onUploadImage?.(f);
    if (!url) return;

    // ✅ 현재 selection이 stickyStory 안이면 해당 노드 attrs 업데이트
    // TipTap의 updateAttributes는 현재 selection 기준으로 동작하므로,
    // 사용자에게 "StickyStory 안을 클릭하고 실행"을 유도함
    editor.chain().focus().setStickyMedia(url).run();
  }

  if (!pos.visible) return null;

  return (
    <>
      {/* + 버튼 */}
      <button
        type="button"
        className="uf-plusBtn"
        style={{ top: pos.top, left: pos.left }}
        onClick={() => setOpen((v) => !v)}
        title="블록 추가"
      >
        +
      </button>

      {/* 메뉴 */}
      {open && (
        <div className="uf-plusMenu" style={{ top: pos.top + 34, left: pos.left }}>
          <div className="uf-plusMenu__title">Add Block</div>
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              className="uf-plusMenu__item"
              onClick={() => run(it.key)}
            >
              <div className="uf-plusMenu__label">{it.label}</div>
              <div className="uf-plusMenu__hint">{it.hint}</div>
            </button>
          ))}

          <div className="uf-plusMenu__tip">
            💡 팁: Sticky Media 지정은 <b>StickyStory 영역을 먼저 클릭</b>한 뒤 사용하세요.
          </div>
        </div>
      )}

      {/* 파일 인풋 (이미지/패럴럭스 공용) */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={onPickFile}
      />

      {/* Sticky Media 전용 인풋 */}
      <input
        ref={stickyFileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={onPickStickyMedia}
      />
    </>
  );
}
