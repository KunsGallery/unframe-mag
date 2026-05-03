import { Node, mergeAttributes } from "@tiptap/core";
import {
  getParallaxPresetBySpeed,
  PARALLAX_DEFAULTS,
} from "../../constants/editorBlocks";

const CAPTION_ALIGN_VALUES = new Set(["left", "center-bottom", "right"]);
const CAPTION_SIZE_VALUES = new Set(["small", "normal", "large"]);
const MOTION_PRESET_VALUES = new Set([
  "subtle",
  "soft",
  "cinematic",
  "dramatic",
]);

function getAttr(element, names) {
  for (const name of names) {
    const value = element.getAttribute(name);
    if (value !== null && value !== "") return value;
  }
  return null;
}

function normalizeCaptionAlign(value) {
  return CAPTION_ALIGN_VALUES.has(value)
    ? value
    : PARALLAX_DEFAULTS.captionAlign;
}

function normalizeCaptionSize(value) {
  return CAPTION_SIZE_VALUES.has(value)
    ? value
    : PARALLAX_DEFAULTS.captionSize;
}

function normalizeMotionPreset(value) {
  return MOTION_PRESET_VALUES.has(value)
    ? value
    : PARALLAX_DEFAULTS.motionPreset;
}

function parseBoolean(value, fallback = false) {
  if (value === null || value === undefined || value === "") return fallback;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return fallback;
}

function readHeightFromStyle(element) {
  const style = element.getAttribute("style") || "";
  const match = style.match(/--uf-height:\s*([^;]+)/);
  return match?.[1]?.trim() || null;
}

function readSpeedFromElement(element) {
  const value = getAttr(element, ["data-speed", "speed", "data-parallax-speed"]);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : PARALLAX_DEFAULTS.speed;
}

export const ParallaxImage = Node.create({
  name: "parallaxImage",
  group: "block",
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) =>
          getAttr(element, ["src"]) ||
          element.querySelector(".uf-parallax__img")?.getAttribute("src") ||
          null,
      },
      caption: {
        default: "",
        parseHTML: (element) =>
          getAttr(element, ["caption"]) ||
          element.querySelector(".uf-parallax__caption")?.textContent ||
          "",
      },
      speed: {
        default: PARALLAX_DEFAULTS.speed,
        parseHTML: (element) => readSpeedFromElement(element),
      },
      height: {
        default: PARALLAX_DEFAULTS.height,
        parseHTML: (element) =>
          getAttr(element, ["height", "data-height"]) ||
          readHeightFromStyle(element) ||
          PARALLAX_DEFAULTS.height,
      },
      bleed: {
        default: PARALLAX_DEFAULTS.bleed,
        parseHTML: (element) => {
          const value = getAttr(element, ["bleed", "data-bleed"]);
          if (value !== null) return parseBoolean(value, PARALLAX_DEFAULTS.bleed);
          return element.classList.contains("is-full");
        },
      },
      captionAlign: {
        default: PARALLAX_DEFAULTS.captionAlign,
        parseHTML: (element) =>
          normalizeCaptionAlign(
            getAttr(element, ["data-caption-align", "captionalign", "caption-align"])
          ),
      },
      captionSize: {
        default: PARALLAX_DEFAULTS.captionSize,
        parseHTML: (element) =>
          normalizeCaptionSize(
            getAttr(element, ["data-caption-size", "captionsize", "caption-size"])
          ),
      },
      motionPreset: {
        default: PARALLAX_DEFAULTS.motionPreset,
        parseHTML: (element) => {
          const speed = readSpeedFromElement(element);
          const presetAttr = getAttr(element, [
            "data-motion-preset",
            "motionpreset",
            "motion-preset",
          ]);

          return presetAttr
            ? normalizeMotionPreset(presetAttr)
            : getParallaxPresetBySpeed(speed);
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-uf="parallax"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const {
      src,
      caption,
      height,
      bleed,
      speed,
      captionAlign,
      captionSize,
      motionPreset,
    } = HTMLAttributes;
    const resolvedHeight = height || PARALLAX_DEFAULTS.height;
    const resolvedCaptionAlign = normalizeCaptionAlign(captionAlign);
    const resolvedCaptionSize = normalizeCaptionSize(captionSize);
    const resolvedSpeed = Number.isFinite(Number(speed))
      ? Number(speed)
      : PARALLAX_DEFAULTS.speed;
    const resolvedMotionPreset = getParallaxPresetBySpeed(
      resolvedSpeed,
      normalizeMotionPreset(motionPreset)
    );

    return [
      "figure",
      mergeAttributes(HTMLAttributes, {
        "data-uf": "parallax",
        "data-speed": String(resolvedSpeed),
        "data-caption-align": resolvedCaptionAlign,
        "data-caption-size": resolvedCaptionSize,
        "data-motion-preset": resolvedMotionPreset,
        class: `uf-parallax ${bleed ? "is-full" : ""}`,
        style: `--uf-height: ${resolvedHeight};`,
      }),
      [
        "div",
        { class: "uf-parallax__wrapper" },
        ["img", { src: src || "", class: "uf-parallax__img", alt: "" }],
      ],
      ...(caption
        ? [
            [
              "figcaption",
              {
                class:
                  `uf-parallax__caption is-${resolvedCaptionAlign} ` +
                  `is-${resolvedCaptionSize}`,
              },
              caption,
            ],
          ]
        : []),
    ];
  },
});
