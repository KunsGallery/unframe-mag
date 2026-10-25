// src/components/editor/inspector/SlideGalleryInspector.jsx
import { GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import UploadButton from "../UploadButton";
import Row from "./InspectorRow";
import { IMAGE_FIT_MODE_OPTIONS, IMAGE_HEIGHT_PRESETS, SLIDE_GALLERY_DEFAULTS } from "../../../constants/editorBlocks";

export default function SlideGalleryInspector({ selected, setAttrs, isDarkMode, dragState, startImageDrag, handleImageDragOver, handleImageDrop, clearImageDrag, removeImageAt, replaceImageFile, uploading, progress }) {
  return (
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

      <Row label="Slide Captions">
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
                    <ArrowUp size={16} aria-label="위로 이동" />
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
                    <ArrowDown size={16} aria-label="아래로 이동" />
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
                    Caption
                  </div>
                  <textarea
                    rows={2}
                    aria-label={`슬라이드 ${idx + 1} 캡션`}
                    value={img?.caption ?? ""}
                    onChange={(e) => {
                      const next = [...arr];
                      next[idx] = { ...next[idx], caption: e.target.value };
                      setAttrs("slideGallery", { images: next });
                    }}
                    placeholder="이미지 제목 또는 캡션"
                    className={[
                      "w-full resize-y px-3 py-2 rounded-xl border text-xs leading-5 bg-transparent",
                      isDarkMode
                        ? "border-zinc-900 text-white placeholder:text-zinc-600"
                        : "border-zinc-200 text-black placeholder:text-zinc-400",
                    ].join(" ")}
                  />
                </div>

                <label className="block text-xs">슬라이드 {idx + 1} 대체 텍스트
                  <input value={img?.alt || ''} onChange={(event) => { const next = [...arr]; next[idx] = { ...next[idx], alt: event.target.value }; setAttrs('slideGallery', { images: next }); }} className="mt-2 w-full rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" />
                </label>
                <UploadButton label="이미지 교체" title={`슬라이드 ${idx + 1} 이미지 교체`} uploading={uploading} progress={progress} onPickFile={(file) => replaceImageFile(file, idx)} />

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
  );
}
