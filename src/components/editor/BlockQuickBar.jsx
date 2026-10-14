import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import {
  Image as ImageIcon,
  LayoutGrid,
  Rows3,
  Columns2,
  Table2,
  PlusSquare,
  MinusSquare,
  Trash2,
} from "lucide-react";
import { useSelectedUfBlock } from "../../hooks/useSelectedUfBlock";
import {
  GALLERY_DEFAULTS,
  SLIDE_GALLERY_DEFAULTS,
  IMAGE_FIT_MODE_OPTIONS,
  IMAGE_HEIGHT_PRESETS,
  TABLE_SIZE_OPTIONS,
} from "../../constants/editorBlocks";

const labels = { Image: "이미지 크기", Align: "정렬", Mode: "배치", Columns: "열", Gap: "간격", Fit: "맞춤", Height: "높이", Rounded: "모서리", Vertical: "세로 정렬", Mobile: "모바일", Delete: "삭제", Size: "크기", Rows: "행", Table: "표", xsmall: "아주 작게", small: "작게", normal: "기본", wide: "넓게", full: "전체", grid: "격자", design: "디자인", start: "위", center: "가운데", "stack on": "세로 쌓기 켜짐", "stack off": "세로 쌓기 꺼짐", "Delete Columns": "다단 삭제", "Add Top": "위에 추가", "Add Below": "아래에 추가", "Add Left": "왼쪽에 추가", "Add Right": "오른쪽에 추가", "Delete Table": "표 삭제" };
function QuickButton({ active = false, onClick, children, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={[
        "min-h-9 px-2 rounded border text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-blue-600",
        disabled
          ? "opacity-40 cursor-not-allowed bg-zinc-100 dark:bg-zinc-900 text-zinc-400 border-zinc-200 dark:border-zinc-800"
          : active
          ? "bg-[#004aad] text-white border-[#004aad]"
          : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800",
      ].join(" ")}
    >
      {labels[children] || children}
    </button>
  );
}

function IconButton({ icon: Icon, label, onClick, disabled = false, danger = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={labels[label] || label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={[
        "min-h-9 px-2 rounded border flex items-center gap-1.5 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-blue-600",
        disabled
          ? "opacity-40 cursor-not-allowed bg-zinc-100 dark:bg-zinc-900 text-zinc-400 border-zinc-200 dark:border-zinc-800"
          : danger
          ? "bg-white dark:bg-zinc-900 text-red-500 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30"
          : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800",
      ].join(" ")}
    >
      <Icon size={13} />
      <span>{labels[label] || label}</span>
    </button>
  );
}

function Group({ icon: Icon, title, children, isDarkMode }) {
  return (
    <div
      className={[
        "py-1 flex flex-wrap items-center gap-1.5",
        isDarkMode
          ? "bg-zinc-950 border-zinc-800"
          : "bg-white border-zinc-200",
      ].join(" ")}
    >
      <div className="flex items-center gap-1 mr-1 text-xs font-medium text-zinc-500">
        <Icon size={13} />
        <span>{labels[title] || title}</span>
      </div>
      {children}
    </div>
  );
}

function updateColumnsCount(editor, selected, nextCols) {
  const current = selected?.content || [];
  let nextContent = current;

  if (nextCols > current.length) {
    nextContent = [
      ...current,
      ...Array.from({ length: nextCols - current.length }).map(() => ({
        type: "column",
        content: [{ type: "paragraph" }],
      })),
    ];
  } else if (nextCols < current.length) {
    nextContent = current.slice(0, nextCols);
  }

  editor
    .chain()
    .focus()
    .command(({ tr, state }) => {
      const pos = selected.pos;
      if (tr.doc.nodeAt(pos) !== selected.node) return false;

      const newNode = state.schema.nodes.columns.create(
        {
          ...selected.attrs,
          columns: nextCols,
        },
        nextContent.map((item) =>
          state.schema.nodes.column.create(
            {},
            item.content?.length
              ? item.content.map((child) => state.schema.nodeFromJSON(child))
              : [state.schema.nodes.paragraph.create()]
          )
        )
      );

      const oldNode = tr.doc.nodeAt(pos);
      if (!oldNode) return false;

      tr.replaceWith(pos, pos + oldNode.nodeSize, newNode);
      return true;
    })
    .run();
}

export default function BlockQuickBar({ editor, isDarkMode }) {
  const selected = useSelectedUfBlock(editor);
  const panel = useRef(null);
  const [anchor, setAnchor] = useState(null);

  useLayoutEffect(() => {
    if (!editor || editor.isDestroyed || !selected) return;
    let frame;
    const measure = () => {
      const dom = editor.view.nodeDOM(selected.pos);
      if (!dom?.getBoundingClientRect) { setAnchor(null); return; }
      const rect = dom.getBoundingClientRect();
      const width = Math.min(480, window.innerWidth - 24);
      setAnchor({ left: window.scrollX + Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), top: window.scrollY + rect.bottom + 6, width, visible: rect.bottom >= 0 && rect.top <= window.innerHeight });
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(editor.view.dom);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("scroll", schedule, true); window.removeEventListener("resize", schedule); };
  }, [editor, selected]);

  if (!editor || editor.isDestroyed) return null;

  const setAttrs = (type, patch) => {
    if (selected?.type !== type || !editor.isEditable) return;
    const node = editor.state.doc.nodeAt(selected.pos);
    if (node !== selected.node) return;
    editor.view.dispatch(editor.state.tr.setNodeMarkup(selected.pos, undefined, { ...node.attrs, ...patch }));
  };
  const tableCommand = (command) => {
    if (editor.state.doc.nodeAt(selected.pos) !== selected.node) return;
    const { $from } = editor.state.selection;
    for (let depth = $from.depth; depth > 0; depth--) {
      if ($from.node(depth) === selected.node) {
        editor.chain().focus()[command]().run();
        return;
      }
    }
  };

  const inTable = selected?.type === "table";
  const tableAttrs = inTable ? selected.attrs : {};
  const selectedTableSize = tableAttrs.tableSize ?? "normal";
  const visibleTypes = new Set(["ufImage", "gallery", "slideGallery", "columns"]);
  const showForBlock = selected && visibleTypes.has(selected.type);
  const showForTable = inTable;

  if ((!showForBlock && !showForTable) || !anchor?.visible || !editor.isEditable) return null;

  return createPortal(
    <div ref={panel} data-uf-quick-settings role="region" aria-label="선택 블록 빠른 설정" style={{ position: "absolute", left: anchor.left, top: anchor.top, width: anchor.width, zIndex: 40 }} className={isDarkMode ? "dark" : ""}>
      <div
        className={[
          "rounded-lg border p-2 flex flex-wrap items-center gap-x-3 gap-y-1 max-h-[45vh] overflow-auto",
          isDarkMode
            ? "bg-zinc-950/95 border-zinc-800"
            : "bg-[#fcfcfc] border-zinc-200",
        ].join(" ")}
      >
        {selected.type === "ufImage" && (
          <label className="w-full text-xs text-zinc-600 dark:text-zinc-300">캡션
            <input className="mt-1 w-full min-h-9 rounded border border-zinc-300 bg-transparent px-2 text-base dark:border-zinc-700" value={selected.attrs.caption ?? ""} onChange={(event) => setAttrs("ufImage", { caption: event.target.value })} />
          </label>
        )}
        {["gallery", "slideGallery"].includes(selected.type) && (selected.attrs.images || []).map((image, index) => (
          <label key={index} className="w-full text-xs text-zinc-600 dark:text-zinc-300">이미지 {index + 1} 캡션
            <input className="mt-1 w-full min-h-9 rounded border border-zinc-300 bg-transparent px-2 text-base dark:border-zinc-700" value={image.caption ?? ""} onChange={(event) => {
              const node = editor.state.doc.nodeAt(selected.pos);
              if (node !== selected.node || node.attrs.images[index] !== image) return;
              const images = node.attrs.images.map((item, i) => i === index ? { ...item, caption: event.target.value } : item);
              setAttrs(selected.type, { images });
            }} />
          </label>
        ))}
        {selected?.type === "ufImage" && (
          <>
            <Group icon={ImageIcon} title="Image" isDarkMode={isDarkMode}>
              {["xsmall", "small", "normal", "wide", "full"].map((size) => (
                <QuickButton
                  key={size}
                  active={(selected.attrs.size ?? "normal") === size}
                  onClick={() => setAttrs("ufImage", { size })}
                >
                  {size}
                </QuickButton>
              ))}
            </Group>

            <Group icon={ImageIcon} title="Align" isDarkMode={isDarkMode}>
              {["left", "center", "right"].map((align) => (
                <QuickButton
                  key={align}
                  active={(selected.attrs.align ?? "center") === align}
                  onClick={() => setAttrs("ufImage", { align })}
                >
                  <span title={{ left: "왼쪽", center: "가운데", right: "오른쪽" }[align]} aria-label={{ left: "왼쪽 정렬", center: "가운데 정렬", right: "오른쪽 정렬" }[align]}>{React.createElement({ left: AlignLeft, center: AlignCenter, right: AlignRight }[align], { size: 16 })}</span>
                </QuickButton>
              ))}
            </Group>
          </>
        )}

        {selected?.type === "gallery" && (
          <>
            <Group icon={LayoutGrid} title="Mode" isDarkMode={isDarkMode}>
              {["grid", "design"].map((mode) => (
                <QuickButton
                  key={mode}
                  active={(selected.attrs.layoutMode ?? GALLERY_DEFAULTS.layoutMode) === mode}
                  onClick={() => setAttrs("gallery", { layoutMode: mode })}
                >
                  {mode}
                </QuickButton>
              ))}
            </Group>

            <Group icon={LayoutGrid} title="Columns" isDarkMode={isDarkMode}>
              {[1, 2, 3, 4].map((n) => (
                <QuickButton
                  key={n}
                  active={Number(selected.attrs.columns ?? 2) === n}
                  onClick={() => setAttrs("gallery", { columns: n })}
                >
                  {n}열
                </QuickButton>
              ))}
            </Group>

            <Group icon={LayoutGrid} title="Gap" isDarkMode={isDarkMode}>
              {[8, 12, 20, 28].map((gap) => (
                <QuickButton
                  key={gap}
                  active={Number(selected.attrs.gap ?? GALLERY_DEFAULTS.gap) === gap}
                  onClick={() => setAttrs("gallery", { gap })}
                >
                  {gap}
                </QuickButton>
              ))}
            </Group>
          </>
        )}

        {selected?.type === "slideGallery" && (
          <>
            <Group icon={Rows3} title="Fit" isDarkMode={isDarkMode}>
              {IMAGE_FIT_MODE_OPTIONS.map((option) => (
                <QuickButton
                  key={option.value}
                  active={
                    (selected.attrs.fitMode ?? SLIDE_GALLERY_DEFAULTS.fitMode) === option.value
                  }
                  onClick={() => setAttrs("slideGallery", { fitMode: option.value })}
                >
                  {option.label}
                </QuickButton>
              ))}
            </Group>

            <Group icon={Rows3} title="Height" isDarkMode={isDarkMode}>
              {IMAGE_HEIGHT_PRESETS.map((height) => (
                <QuickButton
                  key={height}
                  active={
                    Number(
                      selected.attrs.imageHeight ?? SLIDE_GALLERY_DEFAULTS.imageHeight
                    ) === height
                  }
                  onClick={() => setAttrs("slideGallery", { imageHeight: height })}
                >
                  {height}
                </QuickButton>
              ))}
            </Group>

            <Group icon={Rows3} title="Rounded" isDarkMode={isDarkMode}>
              {[0, 12, 20, 28].map((rounded) => (
                <QuickButton
                  key={rounded}
                  active={Number(selected.attrs.rounded ?? SLIDE_GALLERY_DEFAULTS.rounded) === rounded}
                  onClick={() => setAttrs("slideGallery", { rounded })}
                >
                  {rounded}
                </QuickButton>
              ))}
            </Group>
          </>
        )}

        {selected?.type === "columns" && (
          <>
            <Group icon={Columns2} title="Columns" isDarkMode={isDarkMode}>
              {[2, 3].map((n) => (
                <QuickButton
                  key={n}
                  active={Number(selected.attrs.columns ?? 2) === n}
                  onClick={() => updateColumnsCount(editor, selected, n)}
                >
                  {n}열
                </QuickButton>
              ))}
            </Group>

            <Group icon={Columns2} title="Gap" isDarkMode={isDarkMode}>
              {[12, 24, 36].map((gap) => (
                <QuickButton
                  key={gap}
                  active={Number(selected.attrs.gap ?? 24) === gap}
                  onClick={() => setAttrs("columns", { gap })}
                >
                  {gap}
                </QuickButton>
              ))}
            </Group>

            <Group icon={Columns2} title="Vertical" isDarkMode={isDarkMode}>
              {["start", "center"].map((valign) => (
                <QuickButton
                  key={valign}
                  active={(selected.attrs.valign ?? "start") === valign}
                  onClick={() => setAttrs("columns", { valign })}
                >
                  {valign}
                </QuickButton>
              ))}
            </Group>

            <Group icon={Columns2} title="Mobile" isDarkMode={isDarkMode}>
              <QuickButton
                active={selected.attrs.stackOnMobile !== false}
                onClick={() =>
                  setAttrs("columns", { stackOnMobile: !(selected.attrs.stackOnMobile !== false) })
                }
              >
                {selected.attrs.stackOnMobile !== false ? "stack on" : "stack off"}
              </QuickButton>
            </Group>

            <Group icon={Columns2} title="Delete" isDarkMode={isDarkMode}>
              <IconButton
                icon={Trash2}
                label="Delete Columns"
                danger
                onClick={() => {
                  if (editor.state.doc.nodeAt(selected.pos) === selected.node) editor.view.dispatch(editor.state.tr.delete(selected.pos, selected.pos + selected.node.nodeSize));
                }}
              />
            </Group>
          </>
        )}

        {showForTable && (
          <>
            <Group icon={Table2} title="Size" isDarkMode={isDarkMode}>
              {TABLE_SIZE_OPTIONS.map((option) => (
                <QuickButton
                  key={option.value}
                  active={selectedTableSize === option.value}
                  onClick={() => setAttrs("table", { tableSize: option.value })}
                >
                  {option.label}
                </QuickButton>
              ))}
            </Group>

            <Group icon={Table2} title="Rows" isDarkMode={isDarkMode}>
              <IconButton
                icon={PlusSquare}
                label="Add Top"
                onClick={() => tableCommand("addRowBefore")}
              />
              <IconButton
                icon={PlusSquare}
                label="Add Below"
                onClick={() => tableCommand("addRowAfter")}
              />
              <IconButton
                icon={MinusSquare}
                label="Delete"
                onClick={() => tableCommand("deleteRow")}
              />
            </Group>

            <Group icon={Table2} title="Columns" isDarkMode={isDarkMode}>
              <IconButton
                icon={PlusSquare}
                label="Add Left"
                onClick={() => tableCommand("addColumnBefore")}
              />
              <IconButton
                icon={PlusSquare}
                label="Add Right"
                onClick={() => tableCommand("addColumnAfter")}
              />
              <IconButton
                icon={MinusSquare}
                label="Delete"
                onClick={() => tableCommand("deleteColumn")}
              />
            </Group>

            <Group icon={Table2} title="Table" isDarkMode={isDarkMode}>
              <IconButton
                icon={Trash2}
                label="Delete Table"
                danger
                onClick={() => tableCommand("deleteTable")}
              />
            </Group>
          </>
        )}
      </div>
    </div>, document.body
  );
}
