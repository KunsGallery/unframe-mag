// src/components/editor/inspector/StickyStoryInspector.jsx
import UploadButton from "../UploadButton";
import Row from "./InspectorRow";
import {
  STICKY_STORY_DEFAULTS,
  STICKY_STORY_LENGTH_PRESETS,
  STICKY_STORY_VISUAL_SIZE_OPTIONS,
} from "../../../constants/editorBlocks";

export default function StickyStoryInspector({ selected, setAttrs, isDarkMode, upload, uploading, progress, onToast }) {
  return (
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

      <Row label="Visual Size">
        <select
          value={selected.attrs.visualSize ?? STICKY_STORY_DEFAULTS.visualSize}
          onChange={(e) =>
            setAttrs("stickyStory", { visualSize: e.target.value })
          }
          className={[
            "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
            isDarkMode
              ? "border-zinc-900 text-white"
              : "border-zinc-200 text-black",
          ].join(" ")}
        >
          {STICKY_STORY_VISUAL_SIZE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="text-[11px] text-zinc-500">
          스티키 이미지 높이를 본문 톤에 맞게 조절합니다.
        </div>
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
              onToast?.(e?.userMessage || "스티키 업로드 실패");
            }
          }}
        />
        <div className="text-[11px] text-zinc-500 break-all">
          {selected.attrs.imageSrc ? selected.attrs.imageSrc : "No image"}
        </div>
      </Row>
    </div>
  );
}
