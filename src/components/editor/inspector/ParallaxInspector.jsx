// src/components/editor/inspector/ParallaxInspector.jsx
import Row from "./InspectorRow";
import {
  getParallaxMotionSpeed,
  getParallaxPresetBySpeed,
  PARALLAX_CAPTION_ALIGN_OPTIONS,
  PARALLAX_CAPTION_SIZE_OPTIONS,
  PARALLAX_DEFAULTS,
  PARALLAX_HEIGHT_PRESETS,
  PARALLAX_MOTION_PRESET_OPTIONS,
  PARALLAX_SPEED_PRESETS,
} from "../../../constants/editorBlocks";

export default function ParallaxInspector({ selected, setAttrs, isDarkMode }) {
  const selectedParallaxMotionPreset = getParallaxPresetBySpeed(
    selected.attrs.speed,
    selected.attrs.motionPreset ?? PARALLAX_DEFAULTS.motionPreset
  );
  const selectedParallaxSpeed = getParallaxMotionSpeed(selectedParallaxMotionPreset);
  const selectedParallaxMotionPresetMeta = PARALLAX_MOTION_PRESET_OPTIONS.find(
    (preset) => preset.value === selectedParallaxMotionPreset
  );

  return (
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
  );
}
