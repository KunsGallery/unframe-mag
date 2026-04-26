export const PARALLAX_DEFAULTS = {
  speed: 0.12,
  height: "64vh",
  bleed: true,
};

export const PARALLAX_SPEED_PRESETS = [
  { label: "Subtle", value: 0.08 },
  { label: "Balanced", value: 0.12 },
  { label: "Cinematic", value: 0.18 },
  { label: "Strong", value: 0.2 },
];

export const PARALLAX_HEIGHT_PRESETS = [
  { label: "Compact", value: "48vh" },
  { label: "Feature", value: "64vh" },
  { label: "Classic", value: "70vh" },
  { label: "Immersive", value: "82vh" },
];

export const STICKY_STORY_DEFAULTS = {
  imagePos: "left",
  stickyHeight: "180vh",
};

export const STICKY_STORY_LENGTH_PRESETS = [
  { label: "Quick", value: "100vh" },
  { label: "Short", value: "140vh" },
  { label: "Standard", value: "180vh" },
  { label: "Long", value: "240vh" },
];

export const GALLERY_DEFAULTS = {
  layout: "editorial",
  columns: 3,
  gap: 18,
  ratio: "4/3",
};

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
  { label: "Landscape", value: "4/3" },
  { label: "Square", value: "1/1" },
  { label: "Wide", value: "16/9" },
  { label: "Portrait", value: "3/4" },
];

export const GALLERY_GAP_PRESETS = [
  { label: "Tight", value: 8 },
  { label: "Balanced", value: 16 },
  { label: "Editorial", value: 18 },
  { label: "Airy", value: 28 },
];
