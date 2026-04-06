// src/components/editor/InspectorPanel.jsx
import React, { useEffect, useState } from "react";
import UploadButton from "./UploadButton";
import { useUploadImage } from "../../hooks/useUploadImage";
import { useSelectedUfBlock } from "../../hooks/useSelectedUfBlock";

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] font-black tracking-widest uppercase text-zinc-400">
        {label}
      </div>
      {children}
    </div>
  );
}

const CALLOUT_LABEL_BY_TONE = {
  note: "NOTE",
  point: "POINT",
  info: "INFO",
  quote: "QUOTE",
};

export default function InspectorPanel({ editor, isDarkMode, onToast }) {
  const selected = useSelectedUfBlock(editor);
  const { upload, uploading, progress } = useUploadImage();

  const [ufImageCaptionDraft, setUfImageCaptionDraft] = useState("");
  const [isUfImageComposing, setIsUfImageComposing] = useState(false);

  if (!editor) return null;

  const setAttrs = (type, patch) => {
    editor.commands.updateAttributes(type, patch);
  };

  useEffect(() => {
    if (selected?.type === "ufImage") {
      setUfImageCaptionDraft(selected.attrs.caption ?? "");
      setIsUfImageComposing(false);
    }
  }, [selected?.type, selected?.attrs?.caption]);

  return (
    <aside
      className={[
        "hidden xl:block w-[320px] shrink-0",
        "border-l",
        isDarkMode ? "border-zinc-900 bg-zinc-950" : "border-zinc-100 bg-white",
      ].join(" ")}
    >
      <div className="sticky top-[80px] p-6 space-y-6">
        <div>
          <div className="text-[10px] font-black tracking-widest uppercase text-zinc-400">
            Inspector
          </div>
          <div className="mt-2 text-sm font-black">
            {selected ? selected.type : "Select a block"}
          </div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            블록을 클릭하면 설정이 여기 나타나요.
          </div>
        </div>

        {!selected && (
          <div
            className={[
              "rounded-2xl p-4 border text-xs leading-relaxed",
              isDarkMode
                ? "border-zinc-900 text-zinc-400"
                : "border-zinc-100 text-zinc-500",
            ].join(" ")}
          >
            예: Parallax / Sticky / Image / Gallery 블록을 클릭해보세요.
          </div>
        )}

        {/* -------- Parallax -------- */}
        {selected?.type === "parallaxImage" && (
          <div className="space-y-5">
            <Row label="Caption">
              <input
                value={selected.attrs.caption ?? ""}
                onChange={(e) =>
                  setAttrs("parallaxImage", { caption: e.target.value })
                }
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode
                    ? "border-zinc-900 text-white"
                    : "border-zinc-200 text-black",
                ].join(" ")}
                placeholder="캡션"
              />
            </Row>

            <Row label="Speed (0.0 ~ 2.0)">
              <input
                type="number"
                step="0.05"
                min="0"
                max="2"
                value={Number(selected.attrs.speed ?? 0.2)}
                onChange={(e) =>
                  setAttrs("parallaxImage", { speed: Number(e.target.value) })
                }
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode
                    ? "border-zinc-900 text-white"
                    : "border-zinc-200 text-black",
                ].join(" ")}
              />
              <div className="text-[11px] text-zinc-500">
                숫자가 클수록 더 많이 움직여요.
              </div>
            </Row>

            <Row label="Height (e.g. 70vh)">
              <input
                value={selected.attrs.height ?? "70vh"}
                onChange={(e) =>
                  setAttrs("parallaxImage", { height: e.target.value })
                }
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode
                    ? "border-zinc-900 text-white"
                    : "border-zinc-200 text-black",
                ].join(" ")}
              />
            </Row>

            <Row label="Bleed">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!selected.attrs.bleed}
                  onChange={(e) =>
                    setAttrs("parallaxImage", { bleed: e.target.checked })
                  }
                />
                <span className={isDarkMode ? "text-zinc-200" : "text-zinc-700"}>
                  Full width 느낌(bleed)
                </span>
              </label>
            </Row>
          </div>
        )}

        {/* -------- StickyStory -------- */}
        {selected?.type === "stickyStory" && (
          <div className="space-y-5">
            <Row label="Position">
              <select
                value={selected.attrs.imagePos ?? "left"}
                onChange={(e) =>
                  setAttrs("stickyStory", { imagePos: e.target.value })
                }
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode
                    ? "border-zinc-900 text-white"
                    : "border-zinc-200 text-black",
                ].join(" ")}
              >
                <option value="left">left</option>
                <option value="right">right</option>
              </select>
            </Row>

            <Row label="Sticky Height (e.g. 100vh / 180vh)">
              <input
                value={selected.attrs.stickyHeight ?? "100vh"}
                onChange={(e) =>
                  setAttrs("stickyStory", { stickyHeight: e.target.value })
                }
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode
                    ? "border-zinc-900 text-white"
                    : "border-zinc-200 text-black",
                ].join(" ")}
              />
              <div className="text-[11px] text-zinc-500">
                값이 클수록 이미지가 오래 고정돼요.
              </div>
            </Row>

            <Row label="Image (Upload)">
              <UploadButton
                label="Upload"
                title="Upload Sticky Image"
                uploading={uploading}
                progress={progress}
                onPickFile={async (file) => {
                  try {
                    const { url } = await upload(file, { variant: "sticky" });
                    setAttrs("stickyStory", { imageSrc: url });
                    onToast?.("스티키 이미지 업로드 완료");
                  } catch (e) {
                    console.error(e);
                    onToast?.("스티키 업로드 실패");
                  }
                }}
              />
              <div className="text-[11px] text-zinc-500 break-all">
                {selected.attrs.imageSrc ? selected.attrs.imageSrc : "No image"}
              </div>
            </Row>
          </div>
        )}

        {/* -------- UfImage -------- */}
        {selected?.type === "ufImage" && (
          <div className="space-y-5">
            <Row label="Size">
              <select
                value={selected.attrs.size ?? "normal"}
                onChange={(e) => setAttrs("ufImage", { size: e.target.value })}
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode
                    ? "border-zinc-900 text-white"
                    : "border-zinc-200 text-black",
                ].join(" ")}
              >
                <option value="xsmall">xsmall</option>
                <option value="small">small</option>
                <option value="normal">normal</option>
                <option value="wide">wide</option>
                <option value="full">full</option>
              </select>
            </Row>

            <Row label="Align">
              <select
                value={selected.attrs.align ?? "center"}
                onChange={(e) => setAttrs("ufImage", { align: e.target.value })}
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode
                    ? "border-zinc-900 text-white"
                    : "border-zinc-200 text-black",
                ].join(" ")}
              >
                <option value="left">left</option>
                <option value="center">center</option>
                <option value="right">right</option>
              </select>
            </Row>

            <Row label="Caption">
              <input
                value={ufImageCaptionDraft}
                onChange={(e) => {
                  const next = e.target.value;
                  setUfImageCaptionDraft(next);
                  if (!isUfImageComposing) {
                    setAttrs("ufImage", { caption: next });
                  }
                }}
                onCompositionStart={() => setIsUfImageComposing(true)}
                onCompositionEnd={(e) => {
                  const next = e.currentTarget.value;
                  setIsUfImageComposing(false);
                  setUfImageCaptionDraft(next);
                  setAttrs("ufImage", { caption: next });
                }}
                onBlur={(e) => {
                  const next = e.target.value;
                  setUfImageCaptionDraft(next);
                  setAttrs("ufImage", { caption: next });
                }}
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode
                    ? "border-zinc-900 text-white"
                    : "border-zinc-200 text-black",
                ].join(" ")}
                placeholder="캡션"
              />
            </Row>
          </div>
        )}

                {/* -------- Columns -------- */}
        {selected?.type === "columns" && (
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
        )}

        {/* -------- Gallery -------- */}
        {selected?.type === "gallery" && (
          <div className="space-y-5">
            <Row label="Columns">
              <select
                value={Number(selected.attrs.columns ?? 2)}
                onChange={(e) =>
                  setAttrs("gallery", { columns: Number(e.target.value) })
                }
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode
                    ? "border-zinc-900 text-white"
                    : "border-zinc-200 text-black",
                ].join(" ")}
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </Row>

            <Row label="Gap">
              <input
                type="number"
                min="0"
                max="40"
                value={Number(selected.attrs.gap ?? 12)}
                onChange={(e) =>
                  setAttrs("gallery", { gap: Number(e.target.value) })
                }
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode
                    ? "border-zinc-900 text-white"
                    : "border-zinc-200 text-black",
                ].join(" ")}
              />
            </Row>

            <Row label="Reorder">
              <div className="space-y-2">
                {(selected.attrs.images ?? []).map((img, idx, arr) => (
                  <div
                    key={`${img?.src || "img"}-${idx}`}
                    className={`flex items-center gap-2 rounded-xl border p-2 ${
                      isDarkMode ? "border-zinc-900" : "border-zinc-200"
                    }`}
                  >
                    <img
                      src={img?.src || ""}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />

                    <div className="flex-1 text-[11px] truncate opacity-70">
                      Image {idx + 1}
                    </div>

                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => {
                        const next = [...arr];
                        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                        setAttrs("gallery", { images: next });
                      }}
                      className="px-2 py-1 text-[10px] rounded-lg border"
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      disabled={idx === arr.length - 1}
                      onClick={() => {
                        const next = [...arr];
                        [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                        setAttrs("gallery", { images: next });
                      }}
                      className="px-2 py-1 text-[10px] rounded-lg border"
                    >
                      ↓
                    </button>
                  </div>
                ))}
              </div>
            </Row>
          </div>
        )}

        {/* -------- Divider -------- */}
        {selected?.type === "ufDivider" && (
          <div className="space-y-5">
            <Row label="Style">
              <select
                value={selected.attrs.styleType ?? "line"}
                onChange={(e) =>
                  setAttrs("ufDivider", { styleType: e.target.value })
                }
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode
                    ? "border-zinc-900 text-white"
                    : "border-zinc-200 text-black",
                ].join(" ")}
              >
                <option value="line">line</option>
                <option value="dashed">dashed</option>
                <option value="double">double</option>
                <option value="dots">dots</option>
                <option value="fade">fade</option>
                <option value="glow">glow</option>
                <option value="space">space</option>
              </select>
            </Row>
          </div>
        )}

        {/* -------- Callout -------- */}
        {selected?.type === "ufCallout" && (
          <div className="space-y-5">
            <Row label="Tone">
              <select
                value={selected.attrs.tone ?? "note"}
                onChange={(e) => {
                  const tone = e.target.value;
                  setAttrs("ufCallout", {
                    tone,
                    label: CALLOUT_LABEL_BY_TONE[tone] || "NOTE",
                  });
                }}
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode
                    ? "border-zinc-900 text-white"
                    : "border-zinc-200 text-black",
                ].join(" ")}
              >
                <option value="note">note</option>
                <option value="point">point</option>
                <option value="info">info</option>
                <option value="quote">quote</option>
              </select>
            </Row>

            <Row label="Label">
              <input
                value={selected.attrs.label ?? "NOTE"}
                onChange={(e) =>
                  setAttrs("ufCallout", { label: e.target.value })
                }
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode
                    ? "border-zinc-900 text-white"
                    : "border-zinc-200 text-black",
                ].join(" ")}
                placeholder="NOTE"
              />
            </Row>
          </div>
        )}
      </div>
    </aside>
  );
}