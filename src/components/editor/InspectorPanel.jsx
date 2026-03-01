// src/components/editor/InspectorPanel.jsx
import React from "react";
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

export default function InspectorPanel({ editor, isDarkMode, onToast }) {
  const selected = useSelectedUfBlock(editor);
  const { upload, uploading, progress } = useUploadImage();

  if (!editor) return null;

  const setAttrs = (type, patch) => {
    editor.chain().focus().updateAttributes(type, patch).run();
  };

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
              isDarkMode ? "border-zinc-900 text-zinc-400" : "border-zinc-100 text-zinc-500",
            ].join(" ")}
          >
            예: Parallax / Sticky / Image 블록을 클릭해보세요.
          </div>
        )}

        {/* -------- Parallax -------- */}
        {selected?.type === "parallaxImage" && (
          <div className="space-y-5">
            <Row label="Caption">
              <input
                value={selected.attrs.caption ?? ""}
                onChange={(e) => setAttrs("parallaxImage", { caption: e.target.value })}
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode ? "border-zinc-900 text-white" : "border-zinc-200 text-black",
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
                onChange={(e) => setAttrs("parallaxImage", { speed: Number(e.target.value) })}
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode ? "border-zinc-900 text-white" : "border-zinc-200 text-black",
                ].join(" ")}
              />
              <div className="text-[11px] text-zinc-500">
                숫자가 클수록 더 많이 움직여요.
              </div>
            </Row>

            <Row label="Height (e.g. 70vh)">
              <input
                value={selected.attrs.height ?? "70vh"}
                onChange={(e) => setAttrs("parallaxImage", { height: e.target.value })}
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode ? "border-zinc-900 text-white" : "border-zinc-200 text-black",
                ].join(" ")}
              />
            </Row>

            <Row label="Bleed">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!selected.attrs.bleed}
                  onChange={(e) => setAttrs("parallaxImage", { bleed: e.target.checked })}
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
                onChange={(e) => setAttrs("stickyStory", { imagePos: e.target.value })}
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode ? "border-zinc-900 text-white" : "border-zinc-200 text-black",
                ].join(" ")}
              >
                <option value="left">left</option>
                <option value="right">right</option>
              </select>
            </Row>

            <Row label="Sticky Height (e.g. 100vh / 180vh)">
              <input
                value={selected.attrs.stickyHeight ?? "100vh"}
                onChange={(e) => setAttrs("stickyStory", { stickyHeight: e.target.value })}
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode ? "border-zinc-900 text-white" : "border-zinc-200 text-black",
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
                  isDarkMode ? "border-zinc-900 text-white" : "border-zinc-200 text-black",
                ].join(" ")}
              >
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
                  isDarkMode ? "border-zinc-900 text-white" : "border-zinc-200 text-black",
                ].join(" ")}
              >
                <option value="left">left</option>
                <option value="center">center</option>
                <option value="right">right</option>
              </select>
            </Row>

            <Row label="Caption">
              <input
                value={selected.attrs.caption ?? ""}
                onChange={(e) => setAttrs("ufImage", { caption: e.target.value })}
                className={[
                  "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
                  isDarkMode ? "border-zinc-900 text-white" : "border-zinc-200 text-black",
                ].join(" ")}
                placeholder="캡션"
              />
            </Row>
          </div>
        )}
      </div>
    </aside>
  );
}