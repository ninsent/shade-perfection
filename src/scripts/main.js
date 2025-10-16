import { CONFIG } from "./config.js";
import { AppState } from "./AppState.js";
import { UIController } from "./UIController.js";
import { PresetManager } from "./PresetManager.js";
import { ColorGenerator } from "./ColorGenerator.js";

// ============================================================================
// APPLICATION INITIALIZATION
// Main entry point
// ============================================================================

class Application {
  constructor() {
    this.state = new AppState();
    this.ui = null;
    this.presetManager = null;
  }

  /**
   * Initialize the application
   */
  initialize() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this._setup());
    } else {
      this._setup();
    }
  }

  /**
   * Setup application components
   * @private
   */
  _setup() {
    this.ui = new UIController(this.state);
    this.presetManager = new PresetManager(this.state);
    this._performInitialRender();

    console.log("✨ Shade Perfection initialized successfully");
  }

  /**
   * Perform initial render
   * @private
   */
  _performInitialRender() {
    this.ui.colorPicker.updateVisuals();
    this.ui.colorPicker.drawCurve();
    this.ui.colorPicker.drawDesaturatedCurve();

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

    const importButton = document.getElementById("importButton");
    if (importButton) {
      importButton.disabled = true;
    }
  }
}

// ============================================================================
// START APPLICATION
// ============================================================================

const app = new Application();
app.initialize();
