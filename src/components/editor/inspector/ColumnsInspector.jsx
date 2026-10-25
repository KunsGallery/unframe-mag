// src/components/editor/inspector/ColumnsInspector.jsx
import Row from "./InspectorRow";

export default function ColumnsInspector({ editor, selected, setAttrs, isDarkMode }) {
  return (
    <div className="space-y-5">
      <Row label="Columns">
        <select
          value={Number(selected.attrs.columns ?? 2)}
          onChange={(e) => {
            const nextCols = Number(e.target.value);
            const current = selected.content || [];
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
              const last = nextContent[nextCols - 1];
              nextContent[nextCols - 1] = {
                ...last,
                content: [
                  ...(last.content || []),
                  ...current.slice(nextCols).flatMap((column) => column.content || []),
                ],
              };
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

                tr.setNodeMarkup(pos, undefined, {
                  ...selected.attrs,
                  columns: nextCols,
                });

                const resolved = tr.doc.nodeAt(pos);
                if (resolved && resolved.content.childCount !== nextContent.length) {
                  const newNode = state.schema.nodes.columns.create(
                    {
                      ...selected.attrs,
                      columns: nextCols,
                    },
                    nextContent.map((item) =>
                      state.schema.nodes.column.create(
                        {},
                        item.content?.length
                          ? item.content.map((child) =>
                              state.schema.nodeFromJSON(child)
                            )
                          : [state.schema.nodes.paragraph.create()]
                      )
                    )
                  );
                  tr.replaceWith(pos, pos + resolved.nodeSize, newNode);
                }

                return true;
              })
              .run();
          }}
          className={[
            "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
            isDarkMode
              ? "border-zinc-900 text-white"
              : "border-zinc-200 text-black",
          ].join(" ")}
        >
          <option value="2">2</option>
          <option value="3">3</option>
        </select>
      </Row>

      <Row label="Gap">
        <input
          type="number"
          min="0"
          max="60"
          value={Number(selected.attrs.gap ?? 24)}
          onChange={(e) =>
            setAttrs("columns", { gap: Number(e.target.value) })
          }
          className={[
            "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
            isDarkMode
              ? "border-zinc-900 text-white"
              : "border-zinc-200 text-black",
          ].join(" ")}
        />
      </Row>

      <Row label="Vertical Align">
        <select
          value={selected.attrs.valign ?? "start"}
          onChange={(e) =>
            setAttrs("columns", { valign: e.target.value })
          }
          className={[
            "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
            isDarkMode
              ? "border-zinc-900 text-white"
              : "border-zinc-200 text-black",
          ].join(" ")}
        >
          <option value="start">start</option>
          <option value="center">center</option>
        </select>
      </Row>

      <Row label="Mobile">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={selected.attrs.stackOnMobile !== false}
            onChange={(e) =>
              setAttrs("columns", { stackOnMobile: e.target.checked })
            }
          />
          <span className={isDarkMode ? "text-zinc-200" : "text-zinc-700"}>
            모바일에서 1열로 쌓기
          </span>
        </label>
      </Row>
    </div>
  );
}
