export const PARALLAX_DEFAULTS = {
  speed: 0.16,
  height: "64vh",
  bleed: true,
  captionAlign: "center-bottom",
  captionSize: "normal",
  motionPreset: "soft",
};

export const PARALLAX_SPEED_PRESETS = [
  { label: "Subtle", value: 0.08 },
  { label: "Soft", value: 0.16 },
  { label: "Cinematic", value: 0.24 },
  { label: "Dramatic", value: 0.34 },
];

export const PARALLAX_HEIGHT_PRESETS = [
  { label: "Compact", value: "48vh" },
  { label: "Feature", value: "64vh" },
  { label: "Classic", value: "70vh" },
  { label: "Immersive", value: "82vh" },
];

export const PARALLAX_CAPTION_ALIGN_OPTIONS = [
  { label: "Left", value: "left" },
  { label: "Center Bottom", value: "center-bottom" },
  { label: "Right", value: "right" },
];

export const PARALLAX_CAPTION_SIZE_OPTIONS = [
  { label: "Small", value: "small" },
  { label: "Normal", value: "normal" },
  { label: "Large", value: "large" },
];

export const PARALLAX_MOTION_PRESET_SPEEDS = {
  subtle: 0.08,
  soft: 0.16,
  cinematic: 0.24,
  dramatic: 0.34,
};

export const PARALLAX_MOTION_PRESET_OPTIONS = [
  {
    label: "Subtle",
    value: "subtle",
    description: "가장 조용한 움직임으로 이미지 안정감을 우선합니다.",
  },
  {
    label: "Soft",
    value: "soft",
    description: "자연스럽게 따라오는 기본 패럴랙스 움직임입니다.",
  },
  {
    label: "Cinematic",
    value: "cinematic",
    description: "장면 전환감이 느껴지는 조금 더 분명한 이동입니다.",
  },
  {
    label: "Dramatic",
    value: "dramatic",
    description: "가장 큰 이동폭으로 강한 몰입감을 만듭니다.",
  },
];

export function getParallaxMotionSpeed(
  preset,
  fallback = PARALLAX_DEFAULTS.speed
) {
  return PARALLAX_MOTION_PRESET_SPEEDS[preset] ?? fallback;
}

export function getParallaxPresetBySpeed(
  speed,
  fallback = PARALLAX_DEFAULTS.motionPreset
) {
  const entries = Object.entries(PARALLAX_MOTION_PRESET_SPEEDS);
  const parsed = Number(speed);
  if (!Number.isFinite(parsed)) return fallback;

  let closestPreset = fallback;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const [preset, presetSpeed] of entries) {
    const distance = Math.abs(parsed - presetSpeed);
    if (distance < closestDistance) {
      closestPreset = preset;
      closestDistance = distance;
    }
  }

  return closestPreset;
}

export const STICKY_STORY_DEFAULTS = {
  imagePos: "left",
  stickyHeight: "180vh",
  visualSize: "normal",
};

export const STICKY_STORY_LENGTH_PRESETS = [
  { label: "Quick", value: "100vh" },
  { label: "Short", value: "140vh" },
  { label: "Standard", value: "180vh" },
  { label: "Long", value: "240vh" },
];

export const STICKY_STORY_VISUAL_SIZE_OPTIONS = [
  { label: "Small", value: "small" },
  { label: "Normal", value: "normal" },
  { label: "Large", value: "large" },
  { label: "Full", value: "full" },
];

const STICKY_STORY_VISUAL_HEIGHTS = {
  small: "min(62vh, 560px)",
  normal: "calc(100vh - 110px)",
  large: "min(88vh, 900px)",
  full: "min(100vh, 1040px)",
};

export function normalizeStickyStoryVisualSize(value) {
  const next = String(value || "").trim();
  return STICKY_STORY_VISUAL_SIZE_OPTIONS.some((option) => option.value === next)
    ? next
    : STICKY_STORY_DEFAULTS.visualSize;
}

export function getStickyStoryVisualHeight(size) {
  const next = normalizeStickyStoryVisualSize(size);
  return STICKY_STORY_VISUAL_HEIGHTS[next] || STICKY_STORY_VISUAL_HEIGHTS.normal;
}

export const TABLE_SIZE_OPTIONS = [
  { label: "Small", value: "small" },
  { label: "Normal", value: "normal" },
  { label: "Wide", value: "wide" },
  { label: "Full", value: "full" },
];

const TABLE_CELL_MIN_WIDTHS = {
  small: { desktop: 112, mobile: 96 },
  normal: { desktop: 140, mobile: 112 },
  wide: { desktop: 168, mobile: 124 },
  full: { desktop: 200, mobile: 136 },
};

export function normalizeTableSize(value) {
  const next = String(value || "").trim();
  return TABLE_SIZE_OPTIONS.some((option) => option.value === next)
    ? next
    : "normal";
}

export function getTableCellMinWidth(size, viewport = "desktop") {
  const next = normalizeTableSize(size);
  const preset = TABLE_CELL_MIN_WIDTHS[next] || TABLE_CELL_MIN_WIDTHS.normal;
  return preset[viewport] || preset.desktop;
}

export const GALLERY_DEFAULTS = {
  layout: "editorial",
  layoutMode: "grid",
  columns: 3,
  gap: 18,
  ratio: "4/3",
  fitMode: "crop",
  imageHeight: 320,
};

export const SLIDE_GALLERY_DEFAULTS = {
  fitMode: "height",
  imageHeight: 420,
  heightRatio: "16/9",
  rounded: 20,
};

export const IMAGE_FIT_MODE_OPTIONS = [
  { label: "Height", value: "height" },
  { label: "Crop", value: "crop" },
];

export const IMAGE_HEIGHT_PRESETS = [320, 420, 520];

export const GALLERY_LAYOUT_PRESETS = [
  {
    label: "Editorial",
    value: "editorial",
    columns: 3,
    gap: 18,
    ratio: "4/3",
  },
  {
    label: "Mosaic",
    value: "mosaic",
    columns: 4,
    gap: 14,
    ratio: "4/3",
  },
  {
    label: "Balanced",
    value: "balanced",
    columns: 2,
    gap: 16,
    ratio: "4/3",
  },
  {
    label: "Archive",
    value: "archive",
    columns: 4,
    gap: 8,
    ratio: "1/1",
  },
];

export const GALLERY_RATIO_PRESETS = [
  { label: "1 / 1", value: "1/1" },
  { label: "4 / 3", value: "4/3" },
  { label: "3 / 2", value: "3/2" },
  { label: "Auto", value: "auto" },
];

export const GALLERY_GAP_PRESETS = [
  { label: "Tight", value: 8 },
  { label: "Balanced", value: 16 },
  { label: "Editorial", value: 18 },
  { label: "Airy", value: 28 },
];
