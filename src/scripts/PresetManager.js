import { CONFIG, PRESET_DATA } from "./config.js";
import { ColorMath } from "./ColorMath.js";
import { ColorGenerator } from "./ColorGenerator.js";

// ============================================================================
// PRESET MANAGER
// Manages preset color palettes
// ============================================================================

export class PresetManager {
  constructor(state) {
    this.state = state;
    this.presets = PRESET_DATA;
    this._renderPresets();
    this._initializeEventListeners();
  }

  /**
   * Render preset items in the UI
   * @private
   */
  _renderPresets() {
    const presetsContainer = document.querySelector(".presets-section");
    if (!presetsContainer) return;

    presetsContainer.innerHTML = "";

    Object.entries(this.presets).forEach(([id, preset]) => {
      const presetElement = this._createPresetElement(id, preset);
      presetsContainer.appendChild(presetElement);
    });
  }

  /**
   * Create preset element
   * @param {string} id - Preset identifier
   * @param {Object} preset - Preset configuration
   * @returns {HTMLElement} Preset DOM element
   * @private
   */
  _createPresetElement(id, preset) {
    const item = document.createElement("div");
    item.className = "preset-item";
    item.dataset.preset = id;

    const previewColors = this._generatePreviewColors(preset);
    const hsv = ColorMath.hexToHsv(preset.color);
    const hoverColor = ColorMath.getDesaturatedColor(
      hsv.h,
      hsv.s,
      hsv.v,
      preset.saturation
    );

    const isGrayPreset = preset.saturation < CONFIG.SATURATION_MAX;

    item.innerHTML = `
          <div class="preset-spectrum">
            ${previewColors
              .map(
                (color) =>
                  `<div class="spectrum-color" style="background: ${color};"></div>`
              )
              .join("")}
          </div>
          <div class="preset-info" style="background: ${hoverColor};">
            <span class="preset-name">${preset.name}</span>
            ${
              isGrayPreset
                ? `
              <div class="preset-contrast-container preset-saturation-container">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15.5217V13.459M21 10.5405V8.29297M13 21H15.3949M15.2001 3H13.0014M18.5946 20.3586C19.3791 19.9499 19.9882 19.3272 20.3804 18.5586M20.2975 5.28654C19.864 4.53735 19.2343 3.94384 18.4395 3.54492" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M10 3H7C4.79086 3 3 4.79086 3 7V17C3 19.2091 4.79086 21 7 21H10V3Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="preset-saturation">${preset.saturation}%</span>
              </div>
            `
                : `
              <div class="preset-contrast-container">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21.1836 12.9453C21.1836 7.9744 17.1545 3.94531 12.1846 3.94531C7.21463 3.94531 3.18555 7.9744 3.18555 12.9453C3.18555 17.9153 7.21463 21.9444 12.1846 21.9444C17.1545 21.9444 21.1836 17.9153 21.1836 12.9453Z"
                    stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12.1309 20.8749L21.1301 11.9922" stroke="currentColor" stroke-width="1.5"
                    stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M17.3949 5.60938L12.209 10.7369" stroke="currentColor" stroke-width="1.5"
                    stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12.1602 15.8258L19.8462 8.2168" stroke="currentColor" stroke-width="1.5"
                    stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12.1211 3.94531V21.9444" stroke="currentColor" stroke-width="1.5"
                    stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="preset-contrast">${preset.contrast}</span>
              </div>
            `
            }
            <span class="preset-hex">${preset.color}</span>
          </div>
        `;

    return item;
  }

  /**
   * Generate preview colors for preset
   * @param {Object} preset - Preset configuration
   * @returns {Array} Array of HEX color strings
   * @private
   */
  _generatePreviewColors(preset) {
    const hsv = ColorMath.hexToHsv(preset.color);
    const previewColorCount = 10;

    const { colors } = ColorGenerator.generatePalette({
      hue: hsv.h,
      saturation: hsv.s,
      value: hsv.v,
      colorCount: previewColorCount,
      contrast: preset.contrast,
      smartSpacing: false,
      includeBlackWhite: false,
      saturationControl: preset.saturation,
    });

    return colors.map((c) => c.hex).reverse();
  }

  /**
   * Initialize event listeners for presets
   * @private
   */
  _initializeEventListeners() {
    const scaleAnimationDuration = 100;
    const scalePressed = 0.98;
    const scaleNormal = 1;

    document.querySelectorAll(".preset-item").forEach((item) => {
      const presetId = item.dataset.preset;
      if (!presetId) return;

      item.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const preset = this.presets[presetId];
        if (preset) {
          this.state.applyPreset(preset);

          item.style.transform = `scale(${scalePressed})`;
          setTimeout(() => {
            item.style.transform = `scale(${scaleNormal})`;
          }, scaleAnimationDuration);
        }
      });

      item.style.cursor = "pointer";
    });
  }
}
