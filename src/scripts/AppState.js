import { CONFIG } from './config.js';
import { ColorMath } from './ColorMath.js';

// ============================================================================
// APPLICATION STATE MANAGER
// Central state management for the application
// ============================================================================

export class AppState {
  constructor() {
    this.hue = 220;
    this.saturation = 81;
    this.value = 78;
    this.saturationControl = CONFIG.SATURATION_DEFAULT;

    this.colorCount = 10;
    this.contrast = 1.0;
    this.colorName = "";

    this.features = {
      importWithVariables: true,
      reverseOrder: false,
      includeBlackWhite: false,
      smartSpacing: false,
      rgbFormat: false,
    };

    this.generatedColors = [];
    this.curvePoints = [];

    this.isDragging = false;
    this.activeTab = "result";

    this.observers = new Set();
  }

  /**
   * Subscribe to state changes
   * @param {Function} callback - Function to call on state change
   */
  subscribe(callback) {
    this.observers.add(callback);
  }

  /**
   * Unsubscribe from state changes
   * @param {Function} callback - Callback to remove
   */
  unsubscribe(callback) {
    this.observers.delete(callback);
  }

  /**
   * Notify all observers of state change
   * @param {string} changeType - Type of change that occurred
   * @private
   */
  _notify(changeType) {
    this.observers.forEach((callback) => callback(changeType, this));
  }

  /**
   * Update HSV color values
   * @param {number} h - Hue (0-360)
   * @param {number} s - Saturation (0-100)
   * @param {number} v - Value (0-100)
   */
  updateColor(h, s, v) {
    this.hue = h;
    this.saturation = s;
    this.value = v;
    this._notify("color");
  }

  /**
   * Update generation settings
   * @param {Object} settings - Settings to update
   */
  updateSettings(settings) {
    Object.assign(this, settings);
    this._notify("settings");
  }

  /**
   * Toggle a feature on/off
   * @param {string} featureName - Name of feature to toggle
   */
  toggleFeature(featureName) {
    if (featureName in this.features) {
      this.features[featureName] = !this.features[featureName];
      this._notify("feature");
    }
  }

  /**
   * Set a feature to specific state
   * @param {string} featureName - Name of feature
   * @param {boolean} value - New state
   */
  setFeature(featureName, value) {
    if (featureName in this.features) {
      this.features[featureName] = value;
      this._notify("feature");
    }
  }

  /**
   * Update generated colors and curve data
   * @param {Array} colors - Generated color array
   * @param {Array} curvePoints - Curve points array
   */
  updateGeneratedColors(colors, curvePoints) {
    this.generatedColors = colors;
    this.curvePoints = curvePoints;
    this._notify("colors");
  }

  /**
   * Get current color in HEX format
   * @returns {string} HEX color string
   */
  getCurrentHex() {
    return ColorMath.hsvToHex(this.hue, this.saturation, this.value);
  }

  /**
   * Get current color in RGB format
   * @returns {Object} RGB object {r, g, b}
   */
  getCurrentRgb() {
    const hex = this.getCurrentHex();
    return ColorMath.hexToRgb(hex);
  }

  /**
   * Apply preset configuration to current state
   * @param {Object} presetConfig - Preset configuration object
   */
  applyPreset(presetConfig) {
    const hsv = ColorMath.hexToHsv(presetConfig.color);
    this.updateColor(hsv.h, hsv.s, hsv.v);
    this.contrast = presetConfig.contrast;
    this.colorName = presetConfig.name;
    this.saturationControl =
      presetConfig.saturation !== undefined
        ? presetConfig.saturation
        : CONFIG.SATURATION_DEFAULT;

    if (this.features.smartSpacing) {
      this.setFeature("smartSpacing", false);
    }

    this._notify("preset");
  }
}