// src/components/editor/InspectorPanel.jsx
import React, { useState } from "react";
import { GripVertical } from "lucide-react";
import UploadButton from "./UploadButton";
import { useUploadImage } from "../../hooks/useUploadImage";
import { useSelectedUfBlock } from "../../hooks/useSelectedUfBlock";
import {
  getParallaxPresetBySpeed,
  GALLERY_DEFAULTS,
  GALLERY_GAP_PRESETS,
  GALLERY_RATIO_PRESETS,
  getParallaxMotionSpeed,
  IMAGE_FIT_MODE_OPTIONS,
  IMAGE_HEIGHT_PRESETS,
  PARALLAX_CAPTION_ALIGN_OPTIONS,
  PARALLAX_CAPTION_SIZE_OPTIONS,
  PARALLAX_DEFAULTS,
  PARALLAX_HEIGHT_PRESETS,
  PARALLAX_MOTION_PRESET_OPTIONS,
  PARALLAX_SPEED_PRESETS,
  SLIDE_GALLERY_DEFAULTS,
  STICKY_STORY_DEFAULTS,
  STICKY_STORY_LENGTH_PRESETS,
} from "../../constants/editorBlocks";

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
  const toast = (message) => (onToast ? onToast(message) : console.log(message));

  const selectedUfImageCaption =
    selected?.type === "ufImage" ? selected.attrs.caption ?? "" : "";
  const [ufImageCaptionDraft, setUfImageCaptionDraft] = useState({
    sourceCaption: "",
    value: "",
  });
  const [isUfImageComposing, setIsUfImageComposing] = useState(false);
  const [dragState, setDragState] = useState({
    type: null,
    fromIndex: -1,
    overIndex: -1,
  });

  const ufImageCaptionValue =
    ufImageCaptionDraft.sourceCaption === selectedUfImageCaption
      ? ufImageCaptionDraft.value
      : selectedUfImageCaption;
  const selectedParallaxMotionPreset =
    selected?.type === "parallaxImage"
      ? getParallaxPresetBySpeed(
          selected.attrs.speed,
          selected.attrs.motionPreset ?? PARALLAX_DEFAULTS.motionPreset
        )
      : PARALLAX_DEFAULTS.motionPreset;
  const selectedParallaxSpeed =
    selected?.type === "parallaxImage"
      ? getParallaxMotionSpeed(selectedParallaxMotionPreset)
      : PARALLAX_DEFAULTS.speed;
  const selectedParallaxMotionPresetMeta = PARALLAX_MOTION_PRESET_OPTIONS.find(
    (preset) => preset.value === selectedParallaxMotionPreset
  );

  if (!editor) return null;

  const setAttrs = (type, patch) => {
    editor.commands.updateAttributes(type, patch);
  };

  const removeImageAt = (type, images, index) => {
    if (!Array.isArray(images) || images.length <= 1) {
      toast("마지막 이미지는 삭제할 수 없어요.");
      return;
    }

    const next = images.filter((_, i) => i !== index);
    setAttrs(type, { images: next });
  };

  const reorderImages = (images, fromIndex, toIndex) => {
    if (!Array.isArray(images)) return images;
    if (fromIndex === toIndex) return images;
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= images.length ||
      toIndex >= images.length
    ) {
      return images;
    }

    const next = [...images];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  };

  const startImageDrag = (type, index, e) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${type}:${index}`);
    setDragState({
      type,
      fromIndex: index,
      overIndex: index,
    });
  };

  const handleImageDragOver = (type, index, e) => {
    if (dragState.type !== type) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragState.overIndex !== index) {
      setDragState((prev) => ({ ...prev, overIndex: index }));
    }
  };

  const handleImageDrop = (type, images, index, e) => {
    if (dragState.type !== type) return;
    e.preventDefault();

    const next = reorderImages(images, dragState.fromIndex, index);
    if (next !== images) {
      setAttrs(type, { images: next });
    }

    setDragState({
      type: null,
      fromIndex: -1,
      overIndex: -1,
    });
  };

  const clearImageDrag = () => {
    setDragState({
      type: null,
      fromIndex: -1,
      overIndex: -1,
    });
  };

  const setUfImageCaptionDraftValue = (value) => {
    setUfImageCaptionDraft({
      sourceCaption: selectedUfImageCaption,
      value,
    });
  };

  return (
    <aside
      className={[
        "hidden xl:block w-[320px] shrink-0 self-start",
        "xl:sticky xl:top-[80px] xl:h-[calc(100vh-80px)] xl:overflow-y-auto xl:overscroll-contain",
        "border-l",
        isDarkMode ? "border-zinc-900 bg-zinc-950" : "border-zinc-100 bg-white",
      ].join(" ")}
    >
      <div className="p-6 space-y-6">
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

            <Row label="Caption Align">
              <select
                value={selected.attrs.captionAlign ?? PARALLAX_DEFAULTS.captionAlign}
                onChange={(e) =>
                  setAttrs("parallaxImage", { captionAlign: e.target.value })
                }
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode
                    ? "border-zinc-900 text-white"
                    : "border-zinc-200 text-black",
                ].join(" ")}
              >
                {PARALLAX_CAPTION_ALIGN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Row>

            <Row label="Caption Size">
              <select
                value={selected.attrs.captionSize ?? PARALLAX_DEFAULTS.captionSize}
                onChange={(e) =>
                  setAttrs("parallaxImage", { captionSize: e.target.value })
                }
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode
                    ? "border-zinc-900 text-white"
                    : "border-zinc-200 text-black",
                ].join(" ")}
              >
                {PARALLAX_CAPTION_SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Row>

            <Row label="Motion Preset">
              <select
                value={selectedParallaxMotionPreset}
                onChange={(e) =>
                  setAttrs("parallaxImage", {
                    motionPreset: e.target.value,
                    speed: getParallaxMotionSpeed(e.target.value),
                  })
                }
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode
                    ? "border-zinc-900 text-white"
                    : "border-zinc-200 text-black",
                ].join(" ")}
              >
                {PARALLAX_MOTION_PRESET_OPTIONS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-zinc-500">
                {selectedParallaxMotionPresetMeta?.description ??
                  "기본 움직임 강도를 고릅니다."}
              </div>
            </Row>

            <Row label="Motion">
              <select
                value={selectedParallaxSpeed}
                onChange={(e) => {
                  const nextSpeed = Number(e.target.value);
                  setAttrs("parallaxImage", {
                    speed: nextSpeed,
                    motionPreset: getParallaxPresetBySpeed(nextSpeed),
                  });
                }}
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode
                    ? "border-zinc-900 text-white"
                    : "border-zinc-200 text-black",
                ].join(" ")}
              >
                {PARALLAX_SPEED_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-zinc-500">
                은은한 움직임을 기본으로 맞췄어요.
              </div>
            </Row>

            <Row label="Frame">
              <select
                value={selected.attrs.height ?? PARALLAX_DEFAULTS.height}
                onChange={(e) =>
                  setAttrs("parallaxImage", { height: e.target.value })
                }
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode
                    ? "border-zinc-900 text-white"
                    : "border-zinc-200 text-black",
                ].join(" ")}
              >
                {PARALLAX_HEIGHT_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
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
                  Edge-to-edge
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
                value={selected.attrs.imagePos ?? STICKY_STORY_DEFAULTS.imagePos}
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
                <option value="left">Image left</option>
                <option value="right">Image right</option>
              </select>
            </Row>

            <Row label="Story Length">
              <select
                value={selected.attrs.stickyHeight ?? STICKY_STORY_DEFAULTS.stickyHeight}
                onChange={(e) =>
                  setAttrs("stickyStory", { stickyHeight: e.target.value })
                }
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode
                    ? "border-zinc-900 text-white"
                    : "border-zinc-200 text-black",
                ].join(" ")}
              >
                {STICKY_STORY_LENGTH_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-zinc-500">
                길수록 이미지가 더 오래 머물러요.
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
                value={ufImageCaptionValue}
                onChange={(e) => {
                  const next = e.target.value;
                  setUfImageCaptionDraftValue(next);
                  if (!isUfImageComposing) {
                    setAttrs("ufImage", { caption: next });
                  }
                }}
                onCompositionStart={() => setIsUfImageComposing(true)}
                onCompositionEnd={(e) => {
                  const next = e.currentTarget.value;
                  setIsUfImageComposing(false);
                  setUfImageCaptionDraftValue(next);
                  setAttrs("ufImage", { caption: next });
                }}
                onBlur={(e) => {
                  const next = e.target.value;
                  setUfImageCaptionDraftValue(next);
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
            <Row label="Layout Mode">
              <div className="grid grid-cols-2 gap-2">
                {["grid", "design"].map((mode) => {
                  const active =
                    (selected.attrs.layoutMode ?? GALLERY_DEFAULTS.layoutMode) === mode;

                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setAttrs("gallery", { layoutMode: mode })}
                      className={[
                        "rounded-xl border px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition",
                        active
                          ? isDarkMode
                            ? "border-white bg-white text-black"
                            : "border-black bg-black text-white"
                          : isDarkMode
                            ? "border-zinc-900 text-zinc-300 hover:border-zinc-700"
                            : "border-zinc-200 text-zinc-700 hover:border-zinc-400",
                      ].join(" ")}
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>
              {(selected.attrs.layoutMode ?? GALLERY_DEFAULTS.layoutMode) === "design" && (
                <div className="text-[11px] text-zinc-500">
                  Design mode automatically arranges images with an editorial frame rhythm.
                </div>
              )}
            </Row>

            <Row label="Columns">
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((column) => {
                  const active =
                    Number(selected.attrs.columns ?? GALLERY_DEFAULTS.columns) === column;

                  return (
                    <button
                      key={column}
                      type="button"
                      onClick={() => setAttrs("gallery", { columns: column })}
                      className={[
                        "rounded-xl border px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition",
                        active
                          ? isDarkMode
                            ? "border-white bg-white text-black"
                            : "border-black bg-black text-white"
                          : isDarkMode
                            ? "border-zinc-900 text-zinc-300 hover:border-zinc-700"
                            : "border-zinc-200 text-zinc-700 hover:border-zinc-400",
                      ].join(" ")}
                    >
                      {column}
                    </button>
                  );
                })}
              </div>
            </Row>

            <Row label="Spacing">
              <div className="grid grid-cols-2 gap-2">
                {GALLERY_GAP_PRESETS.map((preset) => {
                  const active =
                    Number(selected.attrs.gap ?? GALLERY_DEFAULTS.gap) === preset.value;

                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setAttrs("gallery", { gap: preset.value })}
                      className={[
                        "rounded-xl border px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition",
                        active
                          ? isDarkMode
                            ? "border-white bg-white text-black"
                            : "border-black bg-black text-white"
                          : isDarkMode
                            ? "border-zinc-900 text-zinc-300 hover:border-zinc-700"
                            : "border-zinc-200 text-zinc-700 hover:border-zinc-400",
                      ].join(" ")}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </Row>

            <Row label="Ratio">
              <select
                value={selected.attrs.ratio ?? GALLERY_DEFAULTS.ratio}
                onChange={(e) => setAttrs("gallery", { ratio: e.target.value })}
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode
                    ? "border-zinc-900 text-white"
                    : "border-zinc-200 text-black",
                ].join(" ")}
              >
                {GALLERY_RATIO_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </Row>

            <Row label="Images">
              <div className="space-y-3">
                {(selected.attrs.images ?? []).map((img, idx, arr) => {
                  const posX =
                    Number.isFinite(Number(img?.positionX)) ? Number(img.positionX) : 50;
                  const posY =
                    Number.isFinite(Number(img?.positionY)) ? Number(img.positionY) : 50;
                  const span = Number(img?.span) === 2 ? 2 : 1;
                  const isDragging =
                    dragState.type === "gallery" && dragState.fromIndex === idx;
                  const isDragOver =
                    dragState.type === "gallery" && dragState.overIndex === idx;

                  return (
                    <div
                      key={`${img?.src || "img"}-${idx}`}
                      onDragOver={(e) => handleImageDragOver("gallery", idx, e)}
                      onDrop={(e) => handleImageDrop("gallery", arr, idx, e)}
                      className={[
                        "rounded-xl border p-3 space-y-3 transition",
                        isDragging
                          ? "opacity-55"
                          : isDragOver
                          ? isDarkMode
                            ? "border-[#004aad] bg-[#004aad]/10"
                            : "border-[#004aad] bg-[#004aad]/5"
                          : isDarkMode
                          ? "border-zinc-900"
                          : "border-zinc-200",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          draggable
                          onDragStart={(e) => startImageDrag("gallery", idx, e)}
                          onDragEnd={clearImageDrag}
                          className={[
                            "self-stretch px-2 rounded-lg border flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing transition",
                            isDragOver
                              ? "border-[#004aad] text-[#004aad]"
                              : isDarkMode
                              ? "border-zinc-800 text-zinc-400 hover:border-zinc-700"
                              : "border-zinc-200 text-zinc-500 hover:border-zinc-300",
                          ].join(" ")}
                          title="Drag to reorder"
                        >
                          <GripVertical size={14} />
                        </button>

                        <img
                          src={img?.src || ""}
                          alt=""
                          className="w-14 h-14 rounded-lg object-cover shrink-0"
                          style={{
                            objectPosition: `${posX}% ${posY}%`,
                          }}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-black opacity-80">
                            Image {idx + 1}
                          </div>
                          <div className="text-[10px] opacity-50 truncate">
                            X {posX}% · Y {posY}%
                          </div>
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

                        <button
                          type="button"
                          disabled={arr.length <= 1}
                          onClick={() => removeImageAt("gallery", arr, idx)}
                          className={[
                            "px-2 py-1 text-[10px] rounded-lg border transition",
                            arr.length <= 1
                              ? "opacity-40 cursor-not-allowed border-red-200 text-red-300 dark:border-red-900 dark:text-red-900"
                              : "border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30",
                          ].join(" ")}
                        >
                          Delete
                        </button>
                      </div>

                      <input
                        type="text"
                        value={img?.caption ?? ""}
                        onChange={(e) => {
                          const next = [...arr];
                          next[idx] = { ...next[idx], caption: e.target.value };
                          setAttrs("gallery", { images: next });
                        }}
                        placeholder="Caption"
                        className={[
                          "w-full px-3 py-2 rounded-xl border text-xs bg-transparent",
                          isDarkMode
                            ? "border-zinc-900 text-white placeholder:text-zinc-600"
                            : "border-zinc-200 text-black placeholder:text-zinc-400",
                        ].join(" ")}
                      />

                      <div className="space-y-2">
                        <div className="text-[10px] font-black tracking-widest uppercase text-zinc-400">
                          Size
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: "Normal", value: 1 },
                            { label: "Wide", value: 2 },
                          ].map((option) => {
                            const active = span === option.value;

                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  const next = [...arr];
                                  next[idx] = {
                                    ...next[idx],
                                    span: option.value,
                                  };
                                  setAttrs("gallery", { images: next });
                                }}
                                className={[
                                  "rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition",
                                  active
                                    ? isDarkMode
                                      ? "border-white bg-white text-black"
                                      : "border-black bg-black text-white"
                                    : isDarkMode
                                    ? "border-zinc-900 text-zinc-300 hover:border-zinc-700"
                                    : "border-zinc-200 text-zinc-700 hover:border-zinc-400",
                                ].join(" ")}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <details className="group">
                        <summary
                          className={[
                            "cursor-pointer rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition",
                            isDarkMode
                              ? "border-zinc-900 text-zinc-300 hover:border-zinc-700"
                              : "border-zinc-200 text-zinc-600 hover:border-zinc-400",
                          ].join(" ")}
                        >
                          Focus
                        </summary>

                        <div className="mt-3 space-y-3">
                          <div className="space-y-2">
                            <div className="text-[10px] font-black tracking-widest uppercase text-zinc-400">
                              Horizontal
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={posX}
                              onChange={(e) => {
                                const next = [...arr];
                                next[idx] = {
                                  ...next[idx],
                                  positionX: Number(e.target.value),
                                };
                                setAttrs("gallery", { images: next });
                              }}
                              className="w-full"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="text-[10px] font-black tracking-widest uppercase text-zinc-400">
                              Vertical
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={posY}
                              onChange={(e) => {
                                const next = [...arr];
                                next[idx] = {
                                  ...next[idx],
                                  positionY: Number(e.target.value),
                                };
                                setAttrs("gallery", { images: next });
                              }}
                              className="w-full"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...arr];
                                next[idx] = {
                                  ...next[idx],
                                  positionX: 50,
                                  positionY: 50,
                                };
                                setAttrs("gallery", { images: next });
                              }}
                              className="px-2 py-2 text-[10px] rounded-lg border"
                            >
                              Center
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const next = [...arr];
                                next[idx] = {
                                  ...next[idx],
                                  positionX: 50,
                                  positionY: 20,
                                };
                                setAttrs("gallery", { images: next });
                              }}
                              className="px-2 py-2 text-[10px] rounded-lg border"
                            >
                              Top
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const next = [...arr];
                                next[idx] = {
                                  ...next[idx],
                                  positionX: 50,
                                  positionY: 80,
                                };
                                setAttrs("gallery", { images: next });
                              }}
                              className="px-2 py-2 text-[10px] rounded-lg border"
                            >
                              Bottom
                            </button>
                          </div>
                        </div>
                      </details>
                    </div>
                  );
                })}
              </div>
            </Row>
          </div>
        )}

        {selected?.type === "slideGallery" && (
          <div className="space-y-5">
            <Row label="Fit">
              <div className="grid grid-cols-2 gap-2">
                {IMAGE_FIT_MODE_OPTIONS.map((option) => {
                  const active =
                    (selected.attrs.fitMode ?? SLIDE_GALLERY_DEFAULTS.fitMode) === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setAttrs("slideGallery", { fitMode: option.value })}
                      className={[
                        "rounded-xl border px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition",
                        active
                          ? isDarkMode
                            ? "border-white bg-white text-black"
                            : "border-black bg-black text-white"
                          : isDarkMode
                            ? "border-zinc-900 text-zinc-300 hover:border-zinc-700"
                            : "border-zinc-200 text-zinc-700 hover:border-zinc-400",
                      ].join(" ")}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </Row>

            <Row label="Height">
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {IMAGE_HEIGHT_PRESETS.map((height) => {
                    const active =
                      Number(
                        selected.attrs.imageHeight ?? SLIDE_GALLERY_DEFAULTS.imageHeight
                      ) === height;

                    return (
                      <button
                        key={height}
                        type="button"
                        onClick={() => setAttrs("slideGallery", { imageHeight: height })}
                        className={[
                          "rounded-xl border px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition",
                          active
                            ? isDarkMode
                              ? "border-white bg-white text-black"
                              : "border-black bg-black text-white"
                            : isDarkMode
                              ? "border-zinc-900 text-zinc-300 hover:border-zinc-700"
                              : "border-zinc-200 text-zinc-700 hover:border-zinc-400",
                        ].join(" ")}
                      >
                        {height}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="number"
                  min="120"
                  max="1200"
                  value={Number(
                    selected.attrs.imageHeight ?? SLIDE_GALLERY_DEFAULTS.imageHeight
                  )}
                  onChange={(e) =>
                    setAttrs("slideGallery", { imageHeight: Number(e.target.value) || 0 })
                  }
                  className={[
                    "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                    isDarkMode
                      ? "border-zinc-900 text-white"
                      : "border-zinc-200 text-black",
                  ].join(" ")}
                />
              </div>
            </Row>

            <Row label="Aspect Ratio">
              <select
                value={selected.attrs.heightRatio ?? SLIDE_GALLERY_DEFAULTS.heightRatio}
                onChange={(e) =>
                  setAttrs("slideGallery", { heightRatio: e.target.value })
                }
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode
                    ? "border-zinc-900 text-white"
                    : "border-zinc-200 text-black",
                ].join(" ")}
              >
                <option value="16/9">16 / 9</option>
                <option value="4/3">4 / 3</option>
                <option value="1/1">1 / 1</option>
                <option value="3/4">3 / 4</option>
              </select>
            </Row>

            <Row label="Rounded">
              <input
                type="number"
                min="0"
                max="40"
                value={Number(selected.attrs.rounded ?? SLIDE_GALLERY_DEFAULTS.rounded)}
                onChange={(e) =>
                  setAttrs("slideGallery", { rounded: Number(e.target.value) })
                }
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode
                    ? "border-zinc-900 text-white"
                    : "border-zinc-200 text-black",
                ].join(" ")}
              />
            </Row>

            <Row label="Images">
              <div className="space-y-3">
                {(selected.attrs.images ?? []).map((img, idx, arr) => {
                  const posX =
                    Number.isFinite(Number(img?.positionX)) ? Number(img.positionX) : 50;
                  const posY =
                    Number.isFinite(Number(img?.positionY)) ? Number(img.positionY) : 50;
                  const isDragging =
                    dragState.type === "slideGallery" && dragState.fromIndex === idx;
                  const isDragOver =
                    dragState.type === "slideGallery" && dragState.overIndex === idx;

                  return (
                    <div
                      key={`${img?.src || "img"}-${idx}`}
                      onDragOver={(e) => handleImageDragOver("slideGallery", idx, e)}
                      onDrop={(e) => handleImageDrop("slideGallery", arr, idx, e)}
                      className={[
                        "rounded-xl border p-3 space-y-3 transition",
                        isDragging
                          ? "opacity-55"
                          : isDragOver
                          ? isDarkMode
                            ? "border-[#004aad] bg-[#004aad]/10"
                            : "border-[#004aad] bg-[#004aad]/5"
                          : isDarkMode
                          ? "border-zinc-900"
                          : "border-zinc-200",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          draggable
                          onDragStart={(e) => startImageDrag("slideGallery", idx, e)}
                          onDragEnd={clearImageDrag}
                          className={[
                            "self-stretch px-2 rounded-lg border flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing transition",
                            isDragOver
                              ? "border-[#004aad] text-[#004aad]"
                              : isDarkMode
                              ? "border-zinc-800 text-zinc-400 hover:border-zinc-700"
                              : "border-zinc-200 text-zinc-500 hover:border-zinc-300",
                          ].join(" ")}
                          title="Drag to reorder"
                        >
                          <GripVertical size={14} />
                        </button>

                        <img
                          src={img?.src || ""}
                          alt=""
                          className="w-14 h-14 rounded-lg object-cover shrink-0"
                          style={{
                            objectPosition: `${posX}% ${posY}%`,
                          }}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-black opacity-80">
                            Slide {idx + 1}
                          </div>
                          <div className="text-[10px] opacity-50 truncate">
                            X {posX}% · Y {posY}%
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => {
                            const next = [...arr];
                            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                            setAttrs("slideGallery", { images: next });
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
                            setAttrs("slideGallery", { images: next });
                          }}
                          className="px-2 py-1 text-[10px] rounded-lg border"
                        >
                          ↓
                        </button>

                        <button
                          type="button"
                          disabled={arr.length <= 1}
                          onClick={() => removeImageAt("slideGallery", arr, idx)}
                          className={[
                            "px-2 py-1 text-[10px] rounded-lg border transition",
                            arr.length <= 1
                              ? "opacity-40 cursor-not-allowed border-red-200 text-red-300 dark:border-red-900 dark:text-red-900"
                              : "border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30",
                          ].join(" ")}
                        >
                          Delete
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="text-[10px] font-black tracking-widest uppercase text-zinc-400">
                          Horizontal Focus
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={posX}
                          onChange={(e) => {
                            const next = [...arr];
                            next[idx] = {
                              ...next[idx],
                              positionX: Number(e.target.value),
                            };
                            setAttrs("slideGallery", { images: next });
                          }}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="text-[10px] font-black tracking-widest uppercase text-zinc-400">
                          Vertical Focus
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={posY}
                          onChange={(e) => {
                            const next = [...arr];
                            next[idx] = {
                              ...next[idx],
                              positionY: Number(e.target.value),
                            };
                            setAttrs("slideGallery", { images: next });
                          }}
                          className="w-full"
                        />
                      </div>
                    </div>
                  );
                })}
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
