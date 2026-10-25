// src/components/editor/inspector/GalleryInspector.jsx
import { GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import UploadButton from "../UploadButton";
import Row from "./InspectorRow";
import { GALLERY_DEFAULTS, GALLERY_GAP_PRESETS, GALLERY_RATIO_PRESETS } from "../../../constants/editorBlocks";

export default function GalleryInspector({ selected, setAttrs, isDarkMode, dragState, startImageDrag, handleImageDragOver, handleImageDrop, clearImageDrag, removeImageAt, replaceImageFile, uploading, progress }) {
  return (
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
                    <ArrowUp size={16} aria-label="위로 이동" />
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
                    <ArrowDown size={16} aria-label="아래로 이동" />
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
                  aria-label={`이미지 ${idx + 1} 캡션`}
                  value={img?.caption ?? ""}
                  onChange={(e) => {
                    const next = [...arr];
                    next[idx] = { ...next[idx], caption: e.target.value };
                    setAttrs("gallery", { images: next });
                  }}
                  placeholder="이미지 제목 또는 캡션"
                  className={[
                    "w-full px-3 py-2 rounded-xl border text-xs bg-transparent",
                    isDarkMode
                      ? "border-zinc-900 text-white placeholder:text-zinc-600"
                      : "border-zinc-200 text-black placeholder:text-zinc-400",
                  ].join(" ")}
                />

                <label className="block text-xs">이미지 {idx + 1} 대체 텍스트
                  <input value={img?.alt || ''} onChange={(event) => { const next = [...arr]; next[idx] = { ...next[idx], alt: event.target.value }; setAttrs('gallery', { images: next }); }} className="mt-2 w-full rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" />
                </label>
                <UploadButton label="이미지 교체" title={`이미지 ${idx + 1} 교체`} uploading={uploading} progress={progress} onPickFile={(file) => replaceImageFile(file, idx)} />

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
  );
}
