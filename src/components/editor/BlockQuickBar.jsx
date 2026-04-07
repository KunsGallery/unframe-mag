import React from "react";
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

function QuickButton({ active = false, onClick, children, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "h-8 px-3 rounded-lg border text-[10px] font-black uppercase tracking-[0.18em] italic transition",
        disabled
          ? "opacity-40 cursor-not-allowed bg-zinc-100 dark:bg-zinc-900 text-zinc-400 border-zinc-200 dark:border-zinc-800"
          : active
          ? "bg-[#004aad] text-white border-[#004aad]"
          : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function IconButton({ icon: Icon, label, onClick, disabled = false, danger = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "h-8 px-3 rounded-lg border flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] italic transition",
        disabled
          ? "opacity-40 cursor-not-allowed bg-zinc-100 dark:bg-zinc-900 text-zinc-400 border-zinc-200 dark:border-zinc-800"
          : danger
          ? "bg-white dark:bg-zinc-900 text-red-500 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30"
          : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800",
      ].join(" ")}
    >
      <Icon size={13} />
      <span>{label}</span>
    </button>
  );
}

function Group({ icon: Icon, title, children, isDarkMode }) {
  return (
    <div
      className={[
        "rounded-xl border px-3 py-2 flex flex-wrap items-center gap-2",
        isDarkMode
          ? "bg-zinc-950 border-zinc-800"
          : "bg-white border-zinc-200",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 mr-2 text-[10px] font-black uppercase tracking-[0.22em] italic text-zinc-400">
        <Icon size={13} />
        <span>{title}</span>
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
      const { from, to } = state.selection;
      let pos = null;

      state.doc.nodesBetween(from, to, (node, p) => {
        if (node.type.name === "columns" && pos == null) {
          pos = p;
        }
      });

      if (pos == null) return false;

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

  if (!editor) return null;

  const setAttrs = (type, patch) => {
    editor.commands.updateAttributes(type, patch);
  };

  const inTable = editor.isActive("table");
  const visibleTypes = new Set(["ufImage", "gallery", "slideGallery", "columns"]);
  const showForBlock = selected && visibleTypes.has(selected.type);
  const showForTable = inTable;

  if (!showForBlock && !showForTable) return null;

  return (
    <div className="mb-6">
      <div
        className={[
          "rounded-2xl border p-3 flex flex-wrap items-center gap-3",
          isDarkMode
            ? "bg-zinc-950/95 border-zinc-800"
            : "bg-[#fcfcfc] border-zinc-200",
        ].join(" ")}
      >
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
                  {align}
                </QuickButton>
              ))}
            </Group>
          </>
        )}

        {selected?.type === "gallery" && (
          <>
            <Group icon={LayoutGrid} title="Columns" isDarkMode={isDarkMode}>
              {[1, 2, 3, 4].map((n) => (
                <QuickButton
                  key={n}
                  active={Number(selected.attrs.columns ?? 2) === n}
                  onClick={() => setAttrs("gallery", { columns: n })}
                >
                  {n} col
                </QuickButton>
              ))}
            </Group>

            <Group icon={LayoutGrid} title="Gap" isDarkMode={isDarkMode}>
              {[8, 12, 20, 28].map((gap) => (
                <QuickButton
                  key={gap}
                  active={Number(selected.attrs.gap ?? 12) === gap}
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
            <Group icon={Rows3} title="Ratio" isDarkMode={isDarkMode}>
              {["16/9", "4/3", "1/1", "3/4"].map((ratio) => (
                <QuickButton
                  key={ratio}
                  active={(selected.attrs.heightRatio ?? "16/9") === ratio}
                  onClick={() => setAttrs("slideGallery", { heightRatio: ratio })}
                >
                  {ratio}
                </QuickButton>
              ))}
            </Group>

            <Group icon={Rows3} title="Rounded" isDarkMode={isDarkMode}>
              {[0, 12, 20, 28].map((rounded) => (
                <QuickButton
                  key={rounded}
                  active={Number(selected.attrs.rounded ?? 20) === rounded}
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
                  {n} col
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
                onClick={() => editor.chain().focus().deleteNode("columns").run()}
              />
            </Group>
          </>
        )}

        {showForTable && (
          <>
            <Group icon={Table2} title="Rows" isDarkMode={isDarkMode}>
              <IconButton
                icon={PlusSquare}
                label="Add Top"
                onClick={() => editor.chain().focus().addRowBefore().run()}
              />
              <IconButton
                icon={PlusSquare}
                label="Add Below"
                onClick={() => editor.chain().focus().addRowAfter().run()}
              />
              <IconButton
                icon={MinusSquare}
                label="Delete"
                onClick={() => editor.chain().focus().deleteRow().run()}
              />
            </Group>

            <Group icon={Table2} title="Columns" isDarkMode={isDarkMode}>
              <IconButton
                icon={PlusSquare}
                label="Add Left"
                onClick={() => editor.chain().focus().addColumnBefore().run()}
              />
              <IconButton
                icon={PlusSquare}
                label="Add Right"
                onClick={() => editor.chain().focus().addColumnAfter().run()}
              />
              <IconButton
                icon={MinusSquare}
                label="Delete"
                onClick={() => editor.chain().focus().deleteColumn().run()}
              />
            </Group>

            <Group icon={Table2} title="Table" isDarkMode={isDarkMode}>
              <IconButton
                icon={Trash2}
                label="Delete Table"
                danger
                onClick={() => editor.chain().focus().deleteTable().run()}
              />
            </Group>
          </>
        )}
      </div>
    </div>
  );
}