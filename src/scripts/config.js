// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

export const CONFIG = {
  // Canvas dimensions
  PALETTE_SIZE: 180,
  HUE_SLIDER_SIZE: 180,

  // Curve calculation
  CURVE_RESOLUTION: 400,
  SUPERELLIPSE_N_MIN: 0.1,
  SUPERELLIPSE_N_MAX: 25,
  SUPERELLIPSE_TOLERANCE: 0.001,
  SUPERELLIPSE_MAX_ITERATIONS: 100,

  // Input constraints
  CONTRAST_MIN: 0.1,
  CONTRAST_MAX: 5.0,
  CONTRAST_STEP: 0.1,
  COLOR_COUNT_MIN: 1,
  COLOR_COUNT_MAX: 50,

  // Saturation control
  SATURATION_MIN: 0,
  SATURATION_MAX: 100,
  SATURATION_DEFAULT: 100,
  SATURATION_MIN_THRESHOLD: 1,

  // UI interactions
  DRAG_SENSITIVITY: 0.3,
  TOOLTIP_DELAY: 1000,
  ERROR_TOOLTIP_DELAY: 500,
  TAB_TRANSITION_DELAY: 150,

  // Visual styles
  CURVE_STROKE_WIDTH: 2,
  CURVE_PRIMARY_OPACITY: 0.9,
  CURVE_SECONDARY_OPACITY: 0.4,
  POINT_SECONDARY_OPACITY: 0.85,
};

export const FEATURE_TOOLTIPS = {
  variables: "Import with<br>variables",
  reverse: "Reverse order",
  blackwhite: "Include black<br>and white",
  smartSpacing: "Smart Spacing",
  rgb: "RGB format",
};

export const PRESET_DATA = {
  "Warm-Gray": {
    name: "Warm Gray",
    color: "#BF3F1F",
    contrast: 1,
    saturation: 10,
  },
  "Cool-Gray": {
    name: "Cool Gray",
    color: "#1F54BF",
    contrast: 1,
    saturation: 30,
  },
  "Atlantic-Blue": {
    name: "Atlantic Blue",
    color: "#105FE7",
    contrast: 0.8,
    saturation: 100,
  },
  "Himmel-Blue": {
    name: "Himmel Blue",
    color: "#18A2CC",
    contrast: 1.2,
    saturation: 100,
  },
  "Steppe-Green": {
    name: "Steppe Green",
    color: "#25C454",
    contrast: 1.4,
    saturation: 100,
  },
  "Wheat-Yellow": {
    name: "Wheat Yellow",
    color: "#D5AF1B",
    contrast: 1,
    saturation: 100,
  },
  "Fox-Orange": {
    name: "Fox Orange",
    color: "#E36912",
    contrast: 0.7,
    saturation: 100,
  },
  "Santa-Red": {
    name: "Santa Red",
    color: "#D91E28",
    contrast: 0.8,
    saturation: 100,
  },
  "Sakura-Magenta": {
    name: "Sakura Pink",
    color: "#CC27AB",
    contrast: 1.2,
    saturation: 100,
  },
  "Amethyst-Purple": {
    name: "Amethyst Purple",
    color: "#7102EF",
    contrast: 0.9,
    saturation: 100,
  },
};
