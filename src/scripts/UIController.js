import { CONFIG, FEATURE_TOOLTIPS } from "./config.js";
import { ColorMath } from "./ColorMath.js";
import { ColorGenerator } from "./ColorGenerator.js";
import { ColorPickerController } from "./ColorPickerController.js";

// ============================================================================
// UI CONTROLLER
// Main UI management and coordination
// ============================================================================

export class UIController {
  constructor(state) {
    this.state = state;
    this.elements = this._gatherElements();
    this.colorPicker = new ColorPickerController(state, {
      hueSlider: this.elements.hueSlider,
      hueHandle: this.elements.hueHandle,
      colorPalette: this.elements.colorPalette,
      colorHandle: this.elements.colorHandle,
      colorPreview: this.elements.colorPreview,
      saturationSlider: this.elements.saturationSlider,
      saturationHandle: this.elements.saturationHandle,
      saturationValueDisplay: this.elements.saturationValueDisplay,
    });

    this._initializeEventListeners();
    this._initializeTooltips();
    this._initializeDragControls();

    this.state.subscribe((changeType) => this._handleStateChange(changeType));
  }

  /**
   * Gather all DOM elements
   * @returns {Object} Object containing all DOM element references
   * @private
   */
  _gatherElements() {
    return {
      colorName: document.getElementById("colorName"),
      colorValue: document.getElementById("colorValue"),
      colorPreview: document.getElementById("colorPreview"),
      colorPrefix: document.getElementById("colorPrefix"),
      colorSuffix: document.getElementById("colorSuffix"),
      contrastInput: document.getElementById("contrastInput"),
      colorCount: document.getElementById("colorCount"),
      colorsList: document.getElementById("colorsList"),
      presetsList: document.getElementById("presetsList"),
      importButton: document.getElementById("importButton"),
      hueSlider: document.getElementById("hueSlider"),
      hueHandle: document.getElementById("hueHandle"),
      colorPalette: document.getElementById("colorPalette"),
      colorHandle: document.getElementById("colorHandle"),
      customTooltip: document.getElementById("customTooltip"),
      errorTooltip: document.getElementById("errorTooltip"),
      toggleSlide: document.getElementById("toggleSlide"),
      saturationSlider: document.getElementById("saturationSlider"),
      saturationHandle: document.getElementById("saturationHandle"),
      saturationValueDisplay: document.getElementById("saturationValueDisplay"),
    };
  }

  /**
   * Initialize all UI event listeners
   * @private
   */
  _initializeEventListeners() {
    this._initializeFeatureToggles();
    this._initializeColorInputs();
    this._initializeNumericInputs();
    this._initializeTabSwitching();
    this._initializeImportButton();
    this._initializeInputValidation();
  }

  /**
   * Initialize feature toggle buttons
   * @private
   */
  _initializeFeatureToggles() {
    document.querySelectorAll(".feature-toggle").forEach((toggle) => {
      toggle.addEventListener("click", () => {
        const feature = toggle.dataset.feature;
        this._handleFeatureToggle(feature, toggle);
      });
    });
  }

  /**
   * Initialize color input fields
   * @private
   */
  _initializeColorInputs() {
    this.elements.colorValue.addEventListener("input", (e) => {
      this._handleColorInput(e.target.value);
    });

    this.elements.colorName.addEventListener("input", (e) => {
      this.state.colorName = e.target.value.trim();
      this.elements.importButton.disabled = !this.state.colorName;
      this._updateColorsList();
    });
  }

  /**
   * Initialize numeric input fields
   * @private
   */
  _initializeNumericInputs() {
    this.elements.colorCount.addEventListener("input", (e) => {
      const value = Math.max(
        CONFIG.COLOR_COUNT_MIN,
        Math.min(CONFIG.COLOR_COUNT_MAX, parseInt(e.target.value) || 10)
      );
      this.state.updateSettings({ colorCount: value });
      this._regenerateColors();
    });

    this.elements.contrastInput.addEventListener("input", (e) => {
      const value = Math.max(
        CONFIG.CONTRAST_MIN,
        Math.min(CONFIG.CONTRAST_MAX, parseFloat(e.target.value) || 1.0)
      );

      this.state.updateSettings({ contrast: value });

      if (value !== 1.0 && this.state.features.smartSpacing) {
        this._toggleFeatureButton("smartSpacing", false);
      }

      this._regenerateColors();
    });
  }

  /**
   * Initialize tab switching functionality
   * @private
   */
  _initializeTabSwitching() {
    document.querySelectorAll(".toggle-button").forEach((button) => {
      button.addEventListener("click", () => {
        this._switchTab(button.dataset.tab);
      });
    });
  }

  /**
   * Initialize import button
   * @private
   */
  _initializeImportButton() {
    this.elements.importButton.addEventListener("click", () => {
      this._exportToFigma();
    });
  }

  /**
   * Handle feature toggle clicks
   * @param {string} feature - Feature name
   * @param {HTMLElement} toggleElement - Toggle button element
   * @private
   */
  _handleFeatureToggle(feature, toggleElement) {
    toggleElement.classList.toggle("active");
    const isActive = toggleElement.classList.contains("active");

    switch (feature) {
      case "variables":
        this.state.setFeature("importWithVariables", isActive);
        break;

      case "reverse":
        this.state.setFeature("reverseOrder", isActive);
        this._updateColorsList();
        break;

      case "blackwhite":
        this.state.setFeature("includeBlackWhite", isActive);
        this._regenerateColors();
        break;

      case "smartSpacing":
        this.state.setFeature("smartSpacing", isActive);

        const contrastContainer =
          this.elements.contrastInput.closest(".contrast-input");
        if (isActive) {
          this.state.contrast = 1.0;
          this.elements.contrastInput.value = "1.0";
          this.elements.contrastInput.disabled = true;
          contrastContainer.classList.add("disabled");
        } else {
          this.elements.contrastInput.disabled = false;
          contrastContainer.classList.remove("disabled");
        }

        this._updateDragControlsState();
        this._regenerateColors();
        break;

      case "rgb":
        this.state.setFeature("rgbFormat", isActive);
        this._updateColorDisplay();
        this._updateColorsList();
        break;
    }
  }

  /**
   * Handle color input changes
   * @param {string} value - Input value
   * @private
   */
  _handleColorInput(value) {
    const parsed = this._parseColorInput(value);
    if (!parsed) return;

    if (this.state.features.rgbFormat) {
      const rgb = ColorMath.parseRgbString(parsed);
      if (rgb) {
        const hsv = ColorMath.rgbToHsv(rgb.r, rgb.g, rgb.b);
        this.state.updateColor(hsv.h, hsv.s, hsv.v);
      }
    } else {
      const hsv = ColorMath.hexToHsv(parsed);
      this.state.updateColor(hsv.h, hsv.s, hsv.v);
    }
  }

  /**
   * Parse color input string to HEX or RGB
   * @param {string} input - Raw input string
   * @returns {string|null} Parsed color string or null
   * @private
   */
  _parseColorInput(input) {
    const value = input.trim();

    if (!this.state.features.rgbFormat) {
      const hexValue = value.replace(/^#/, "");
      if (hexValue.match(/^[0-9A-F]{6}$/i)) {
        return "#" + hexValue.toUpperCase();
      }
    } else {
      const numbers = value
        .replace(/[^\d\s,\.]/g, "")
        .split(/[\s,\.]+/)
        .filter((n) => n);
      if (numbers.length >= 3) {
        const r = Math.min(255, Math.max(0, parseInt(numbers[0]) || 0));
        const g = Math.min(255, Math.max(0, parseInt(numbers[1]) || 0));
        const b = Math.min(255, Math.max(0, parseInt(numbers[2]) || 0));
        return `rgb(${r}, ${g}, ${b})`;
      }
    }

    return null;
  }

  /**
   * Handle state changes from AppState
   * @param {string} changeType - Type of change
   * @private
   */
  _handleStateChange(changeType) {
    switch (changeType) {
      case "color":
        this.colorPicker.updateVisuals();
        this.colorPicker.drawCurve();
        if (document.activeElement !== this.elements.colorValue) {
          this._updateColorDisplay();
        }
        this._regenerateColors();
        break;

      case "settings":
      case "feature":
        this._regenerateColors();
        break;

      case "colors":
        this.colorPicker.drawDistributionPoints();
        this.colorPicker.drawDesaturatedDistributionPoints();
        this._updateColorsList();
        break;

      case "saturation-control":
        this._regenerateColors();
        break;

      case "preset":
        this.elements.colorName.value = this.state.colorName;
        this.elements.contrastInput.value = this.state.contrast;
        this.elements.importButton.disabled = false;

        const contrastContainer =
          this.elements.contrastInput.closest(".contrast-input");
        this.elements.contrastInput.disabled = false;
        contrastContainer.classList.remove("disabled");

        this.colorPicker.updateSaturationSlider();
        this.colorPicker.drawDesaturatedCurve();
        this._updateDragControlsState();
        this._regenerateColors();
        break;
    }
  }

  /**
   * Regenerate color palette
   * @private
   */
  _regenerateColors() {
    const { colors, curvePoints } = ColorGenerator.generatePalette({
      hue: this.state.hue,
      saturation: this.state.saturation,
      value: this.state.value,
      colorCount: this.state.colorCount,
      contrast: this.state.contrast,
      smartSpacing: this.state.features.smartSpacing,
      includeBlackWhite: this.state.features.includeBlackWhite,
      saturationControl: this.state.saturationControl,
    });

    this.state.updateGeneratedColors(colors, curvePoints);
  }

  /**
   * Update color display in input field
   * @private
   */
  _updateColorDisplay() {
    const hex = this.state.getCurrentHex();

    if (!this.state.features.rgbFormat) {
      this.elements.colorPrefix.textContent = "#";
      this.elements.colorSuffix.textContent = "";
      this.elements.colorValue.value = hex.substring(1);
    } else {
      const rgb = this.state.getCurrentRgb();
      this.elements.colorPrefix.textContent = "rgb(";
      this.elements.colorSuffix.textContent = ")";
      this.elements.colorValue.value = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
    }
  }

  /**
   * Update colors list display
   * @private
   */
  _updateColorsList() {
    this.elements.colorsList.innerHTML = "";

    const baseName = this.state.colorName || "Color";
    const namedColors = ColorGenerator.generateColorNames(
      this.state.generatedColors,
      baseName
    );

    let colorsToShow = [...namedColors];
    if (!this.state.features.reverseOrder) {
      colorsToShow.reverse();
    }

    colorsToShow.forEach((color) => {
      const item = document.createElement("div");
      item.className = "color-preview-item";
      if (color.isSelected) item.classList.add("selected");

      let displayValue = color.hex;
      if (this.state.features.rgbFormat) {
        const rgb = ColorMath.hexToRgb(color.hex);
        displayValue = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
      }

      const textColor = ColorMath.getContrastTextColor(color.hex);

      item.innerHTML = `
            <span class="color-name" style="color:${textColor}">${color.displayName}</span>
            <span class="color-hex" style="color:${textColor}">${displayValue}</span>
          `;
      item.style.backgroundColor = color.hex;

      this.elements.colorsList.appendChild(item);
    });
  }

  /**
   * Switch between tabs (Result/Presets)
   * @param {string} tab - Tab name ('result' or 'presets')
   * @private
   */
  _switchTab(tab) {
    const slide = this.elements.toggleSlide;
    const resultBtn = document.querySelector(".result-button");
    const presetsBtn = document.querySelector(".resources-button");
    const colorsList = this.elements.colorsList;
    const presetsList = this.elements.presetsList;
    const slideOffset = 102;

    if (tab === "result") {
      slide.style.transform = "translateX(0)";
      resultBtn.classList.add("active");
      presetsBtn.classList.remove("active");

      presetsList.style.opacity = "0";
      setTimeout(() => {
        presetsList.style.display = "none";
        colorsList.style.display = "flex";
        colorsList.style.opacity = "0";
        setTimeout(() => (colorsList.style.opacity = "1"), 10);
      }, CONFIG.TAB_TRANSITION_DELAY);
    } else {
      slide.style.transform = `translateX(${slideOffset}px)`;
      resultBtn.classList.remove("active");
      presetsBtn.classList.add("active");

      colorsList.style.opacity = "0";
      setTimeout(() => {
        colorsList.style.display = "none";
        presetsList.style.display = "flex";
        presetsList.style.opacity = "0";
        setTimeout(() => (presetsList.style.opacity = "1"), 10);
      }, CONFIG.TAB_TRANSITION_DELAY);
    }

    this.state.activeTab = tab;
  }

  /**
   * Export palette to Figma
   * @private
   */
  _exportToFigma() {
    const baseName = this.state.colorName.trim() || "Color";
    const namedColors = ColorGenerator.generateColorNames(
      this.state.generatedColors,
      baseName
    );

    let colorsToExport = [...namedColors];
    if (!this.state.features.reverseOrder) {
      colorsToExport.reverse();
    }

    const rgbDivisor = 255;
    const exportData = colorsToExport.map((color) => {
      const rgb = ColorMath.hexToRgb(color.hex);
      const textColor = ColorMath.getContrastTextColor(color.hex);

      return {
        hex: color.hex,
        name: color.displayName,
        rgb: {
          r: rgb.r / rgbDivisor,
          g: rgb.g / rgbDivisor,
          b: rgb.b / rgbDivisor,
        },
        textColor:
          textColor === "white" ? { r: 1, g: 1, b: 1 } : { r: 0, g: 0, b: 0 },
        rgbString: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
        isSelected: color.isSelected || false,
        isBlack: color.isBlack || false,
        isWhite: color.isWhite || false,
      };
    });

    parent.postMessage(
      {
        pluginMessage: {
          type: "create-palette",
          colors: exportData,
          paletteName: baseName,
          isRgbFormat: this.state.features.rgbFormat,
          withVariables: this.state.features.importWithVariables,
        },
      },
      "*"
    );
  }

  /**
   * Initialize tooltips for feature toggles
   * @private
   */
  _initializeTooltips() {
    const tooltip = this.elements.customTooltip;
    const toggles = document.querySelectorAll(".feature-toggle");
    const tooltipOffsetX = 18;
    const tooltipOffsetY = 152;

    let tooltipTimeout = null;

    toggles.forEach((toggle) => {
      const feature = toggle.dataset.feature;
      const text = FEATURE_TOOLTIPS[feature];

      if (!text) return;

      toggle.addEventListener("mouseenter", (e) => {
        if (tooltipTimeout) clearTimeout(tooltipTimeout);

        tooltipTimeout = setTimeout(() => {
          tooltip.innerHTML = text;
          tooltip.classList.add("show");

          const buttonRect = toggle.getBoundingClientRect();
          const containerRect = toggle
            .closest(".feature-toggles")
            .getBoundingClientRect();

          const left =
            buttonRect.left -
            containerRect.left +
            buttonRect.width / 2 +
            tooltipOffsetX;
          const top = buttonRect.bottom - containerRect.top + tooltipOffsetY;

          tooltip.style.left = left + "px";
          tooltip.style.top = top + "px";
          tooltip.style.transform = "translateX(-50%) translateY(0)";
        }, CONFIG.TOOLTIP_DELAY);
      });

      toggle.addEventListener("mouseleave", () => {
        if (tooltipTimeout) {
          clearTimeout(tooltipTimeout);
          tooltipTimeout = null;
        }
        tooltip.classList.remove("show");
      });
    });

    this._initializeErrorTooltip();
  }

  /**
   * Initialize error tooltip for disabled import button
   * @private
   */
  _initializeErrorTooltip() {
    const errorTooltip = this.elements.errorTooltip;
    const importButton = this.elements.importButton;
    const settingsContainer = document.querySelector(".settings");
    const tooltipOffsetX = 20;
    const tooltipOffsetY = 88;

    let errorTimeout = null;

    importButton.addEventListener("mouseenter", () => {
      if (!importButton.disabled) return;

      if (errorTimeout) clearTimeout(errorTimeout);

      errorTimeout = setTimeout(() => {
        errorTooltip.innerHTML = "Enter color name first";

        const buttonRect = importButton.getBoundingClientRect();
        const settingsRect = settingsContainer.getBoundingClientRect();

        const left =
          buttonRect.left -
          settingsRect.left +
          buttonRect.width / 2 +
          tooltipOffsetX;
        const top = buttonRect.top - settingsRect.top + tooltipOffsetY;

        errorTooltip.style.left = left + "px";
        errorTooltip.style.top = top + "px";
        errorTooltip.style.transform = "translateX(-50%) translateY(-100%)";

        errorTooltip.classList.add("show");
      }, CONFIG.ERROR_TOOLTIP_DELAY);
    });

    importButton.addEventListener("mouseleave", () => {
      if (errorTimeout) {
        clearTimeout(errorTimeout);
        errorTimeout = null;
      }
      errorTooltip.classList.remove("show");
    });
  }

  /**
   * Initialize drag controls for numeric inputs
   * @private
   */
  _initializeDragControls() {
    const contrastRow = this.elements.contrastInput.closest(".input-row");
    const countRow = this.elements.colorCount.closest(".input-row");

    const contrastIcon = contrastRow.querySelector("svg");
    const countIcon = countRow.querySelector("svg");

    this._addDragToIcon(contrastIcon, {
      input: this.elements.contrastInput,
      min: CONFIG.CONTRAST_MIN,
      max: CONFIG.CONTRAST_MAX,
      step: CONFIG.CONTRAST_STEP,
      checkBlocked: () => this.state.features.smartSpacing,
      onUpdate: (value) => {
        this.state.contrast = value;
        if (value !== 1.0 && this.state.features.smartSpacing) {
          this._toggleFeatureButton("smartSpacing", false);
        }
        this._regenerateColors();
      },
    });

    this._addDragToIcon(countIcon, {
      input: this.elements.colorCount,
      min: CONFIG.COLOR_COUNT_MIN,
      max: CONFIG.COLOR_COUNT_MAX,
      step: 1,
      checkBlocked: () => false,
      onUpdate: (value) => {
        this.state.colorCount = value;
        this._regenerateColors();
      },
    });
  }

  /**
   * Add drag functionality to icon
   * @param {HTMLElement} icon - Icon element
   * @param {Object} config - Drag configuration
   * @private
   */
  _addDragToIcon(icon, config) {
    if (!icon || !config.input) return;

    let dragState = { active: false, startX: 0, startValue: 0 };
    const cursorBlockedTimeout = 150;

    const updateCursor = () => {
      icon.style.cursor =
        config.checkBlocked && config.checkBlocked()
          ? "not-allowed"
          : "ew-resize";
    };

    icon.addEventListener("mouseenter", updateCursor);
    icon.updateCursor = updateCursor;

    icon.addEventListener("mousedown", (e) => {
      e.preventDefault();

      if (config.checkBlocked && config.checkBlocked()) {
        document.body.style.cursor = "not-allowed";
        setTimeout(
          () => (document.body.style.cursor = ""),
          cursorBlockedTimeout
        );
        return;
      }

      dragState.active = true;
      dragState.startX = e.clientX;
      dragState.startValue = parseFloat(config.input.value);

      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";

      const handleMouseMove = (e) => {
        if (!dragState.active) return;

        const deltaX = e.clientX - dragState.startX;
        const sensitivity = config.step * CONFIG.DRAG_SENSITIVITY;
        const newValue = dragState.startValue + deltaX * sensitivity;

        const clampedValue = Math.max(
          config.min,
          Math.min(config.max, newValue)
        );
        const steppedValue =
          Math.round(clampedValue / config.step) * config.step;
        const finalValue = parseFloat(steppedValue.toFixed(1));

        config.input.value = finalValue;
        config.onUpdate(finalValue);
      };

      const handleMouseUp = () => {
        dragState.active = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";

        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    });
  }

  /**
   * Update drag controls state (cursor style)
   * @private
   */
  _updateDragControlsState() {
    const contrastRow = this.elements.contrastInput.closest(".input-row");
    const contrastIcon = contrastRow?.querySelector("svg");
    if (contrastIcon && contrastIcon.updateCursor) {
      contrastIcon.updateCursor();
    }
  }

  /**
   * Toggle feature button state
   * @param {string} feature - Feature name
   * @param {boolean} active - Active state
   * @private
   */
  _toggleFeatureButton(feature, active) {
    const button = document.querySelector(`[data-feature="${feature}"]`);
    if (button) {
      if (active) {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
      this.state.setFeature(feature, active);
    }
  }

  /**
   * Initialize input validation
   * @private
   */
  _initializeInputValidation() {
    this._setupHexValidation();
    this._setupRgbValidation();
    this._setupFocusOutlines();
  }

  /**
   * Setup HEX input validation
   * @private
   */
  _setupHexValidation() {
    const colorInputContainer =
      this.elements.colorValue.closest(".color-input");
    const validationDelay = 300;

    const validateHex = (value) => {
      if (this.state.features.rgbFormat) return true;
      if (!value) return true;

      const hexValue = value.replace(/^#/, "");
      return /^[0-9A-Fa-f]{6}$/.test(hexValue);
    };

    const updateValidationState = () => {
      const isValid = validateHex(this.elements.colorValue.value.trim());
      colorInputContainer.classList.toggle("error", !isValid);
    };

    this.elements.colorValue.addEventListener("input", () => {
      if (this.state.features.rgbFormat) {
        colorInputContainer.classList.remove("error");
        return;
      }

      clearTimeout(window.hexValidationTimeout);
      window.hexValidationTimeout = setTimeout(
        updateValidationState,
        validationDelay
      );
    });

    this.elements.colorValue.addEventListener("blur", () => {
      if (!this.state.features.rgbFormat) {
        clearTimeout(window.hexValidationTimeout);
        updateValidationState();
      }
    });

    this.elements.colorValue.addEventListener("focus", () => {
      if (!this.state.features.rgbFormat) {
        updateValidationState();
      }
    });
  }

  /**
   * Setup RGB input validation
   * @private
   */
  _setupRgbValidation() {
    const maxDigits = 3;
    const maxRgbValue = 255;
    const minRgbComponents = 3;

    this.elements.colorValue.addEventListener("input", (e) => {
      if (!this.state.features.rgbFormat) return;

      let value = e.target.value;
      let cursorPos = e.target.selectionStart;
      let originalLength = value.length;

      value = value.replace(/[^0-9\s,\.]/g, "");

      let parts = value.split(/[\s,\.]+/);
      let processedParts = [];

      for (let i = 0; i < parts.length; i++) {
        let part = parts[i];

        if (part === "") {
          processedParts.push("");
          continue;
        }

        if (part.length > maxDigits) {
          part = part.substring(0, maxDigits);
        }

        let num = parseInt(part);
        if (!isNaN(num) && num > maxRgbValue) {
          part = maxRgbValue.toString();
        }

        processedParts.push(part);
      }

      let separators = value.match(/[\s,\.]+/g) || [];
      let result = processedParts[0] || "";
      for (
        let i = 0;
        i < separators.length && i < processedParts.length - 1;
        i++
      ) {
        result += separators[i] + (processedParts[i + 1] || "");
      }

      if (result !== e.target.value) {
        e.target.value = result;
        let lengthDiff = result.length - originalLength;
        let newCursorPos = Math.max(0, cursorPos + lengthDiff);
        e.target.setSelectionRange(newCursorPos, newCursorPos);
      }
    });

    this.elements.colorValue.addEventListener("blur", (e) => {
      if (!this.state.features.rgbFormat) return;

      let value = e.target.value.trim();
      if (!value) return;

      let numbers = value
        .replace(/[^\d\s,\.]/g, "")
        .split(/[\s,\.]+/)
        .filter((n) => n);

      let correctedNumbers = numbers.slice(0, minRgbComponents).map((num) => {
        let n = parseInt(num);
        return isNaN(n) ? 0 : Math.min(maxRgbValue, Math.max(0, n));
      });

      while (correctedNumbers.length < minRgbComponents) {
        correctedNumbers.push(0);
      }

      e.target.value = correctedNumbers.join(", ");
    });
  }

  /**
   * Setup focus outline effects for inputs
   * @private
   */
  _setupFocusOutlines() {
    const colorValueInputs = document.querySelectorAll(".color-value");

    colorValueInputs.forEach((input) => {
      input.addEventListener("focus", function () {
        const parent = this.closest(".color-input, .contrast-input");
        if (parent) {
          parent.classList.add("focused");
        }
      });

      input.addEventListener("blur", function () {
        const parent = this.closest(".color-input, .contrast-input");
        if (parent) {
          parent.classList.remove("focused");
        }
      });
    });
  }
}
