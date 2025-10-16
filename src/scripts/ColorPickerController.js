import { CONFIG } from "./config.js";
import { ColorMath } from "./ColorMath.js";
import { SuperellipseMath } from "./SuperellipseMath.js";

// ============================================================================
// COLOR PICKER CONTROLLER
// Manages interactive color picker UI
// ============================================================================

export class ColorPickerController {
  constructor(state, elements) {
    this.state = state;
    this.elements = elements;
    this.isDragging = false;

    this._initializeEventListeners();
  }

  /**
   * Initialize all event listeners for color picker
   * @private
   */
  _initializeEventListeners() {
    this._initializeHueSlider();
    this._initializeColorPalette();
    this._initializeSaturationSlider();
  }

  /**
   * Initialize hue slider interaction
   * @private
   */
  _initializeHueSlider() {
    this.elements.hueSlider.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.isDragging = true;
      this._updateHue(e);

      const onMove = (e) => this.isDragging && this._updateHue(e);
      const onUp = () => {
        this.isDragging = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  /**
   * Initialize color palette interaction
   * @private
   */
  _initializeColorPalette() {
    this.elements.colorPalette.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.isDragging = true;
      this._updateSaturationValue(e);

      const onMove = (e) => this.isDragging && this._updateSaturationValue(e);
      const onUp = () => {
        this.isDragging = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  /**
   * Initialize saturation slider interaction
   * @private
   */
  _initializeSaturationSlider() {
    if (!this.elements.saturationSlider) return;

    this.elements.saturationSlider.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.isDragging = true;
      this._updateSaturationControl(e);

      const onMove = (e) => this.isDragging && this._updateSaturationControl(e);
      const onUp = () => {
        this.isDragging = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  /**
   * Update hue based on mouse position
   * @param {MouseEvent} e - Mouse event
   * @private
   */
  _updateHue(e) {
    const rect = this.elements.hueSlider.getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const hue = (y / rect.height) * 360;

    this.state.updateColor(hue, this.state.saturation, this.state.value);
  }

  /**
   * Update saturation and value based on mouse position
   * @param {MouseEvent} e - Mouse event
   * @private
   */
  _updateSaturationValue(e) {
    const rect = this.elements.colorPalette.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    const saturation = (x / rect.width) * 100;
    const value = 100 - (y / rect.height) * 100;

    this.state.updateColor(this.state.hue, saturation, value);
  }

  /**
   * Update saturation control based on mouse position
   * @param {MouseEvent} e - Mouse event
   * @private
   */
  _updateSaturationControl(e) {
    if (!this.elements.saturationSlider) return;

    const rect = this.elements.saturationSlider.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const saturationControl = (x / rect.width) * 100;

    this.state.saturationControl = saturationControl;
    this.updateSaturationSlider();
    this.drawDesaturatedCurve();
    this.drawDesaturatedDistributionPoints();
    this.state._notify("saturation-control");
  }

  /**
   * Update visual representation of color picker
   */
  updateVisuals() {
    const { hue, saturation, value } = this.state;
    const hex = this.state.getCurrentHex();

    this.elements.colorPalette.style.background = `linear-gradient(to right, white, hsl(${hue}, 100%, 50%))`;

    this.elements.colorPreview.style.background = hex;
    this.elements.colorHandle.style.background = hex;

    this.elements.colorHandle.style.left =
      (saturation / 100) * CONFIG.PALETTE_SIZE + "px";
    this.elements.colorHandle.style.top =
      ((100 - value) / 100) * CONFIG.PALETTE_SIZE + "px";
    this.elements.hueHandle.style.top =
      (hue / 360) * CONFIG.HUE_SLIDER_SIZE - 4.5 + "px";

    this.updateSaturationSlider();
    this.drawCurve();
    this.drawDesaturatedCurve();
  }

  /**
   * Draw primary superellipse curve on color palette
   */
  drawCurve() {
    const x = this.state.saturation / 100;
    const y = this.state.value / 100;
    const n = SuperellipseMath.findExponent(x, y);

    let svg = this.elements.colorPalette.querySelector(".superellipse-curve");
    if (!svg) {
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.classList.add("superellipse-curve");
      this.elements.colorPalette.appendChild(svg);
    }

    svg.innerHTML = "";

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const points = [];
    const curveResolution = 100;

    for (let i = 0; i <= curveResolution; i++) {
      const t = ((i / curveResolution) * Math.PI) / 2;

      try {
        const px = Math.pow(Math.cos(t), 2 / n);
        const py = Math.pow(Math.sin(t), 2 / n);

        const pixelX = px * CONFIG.PALETTE_SIZE;
        const pixelY = (1 - py) * CONFIG.PALETTE_SIZE;

        points.push([pixelX, pixelY]);
      } catch (e) {
        continue;
      }
    }

    if (points.length > 0) {
      let pathData = `M ${points[0][0]} ${points[0][1]}`;
      for (let i = 1; i < points.length; i++) {
        pathData += ` L ${points[i][0]} ${points[i][1]}`;
      }

      path.setAttribute("d", pathData);
      path.setAttribute(
        "stroke",
        `rgba(255, 255, 255, ${CONFIG.CURVE_PRIMARY_OPACITY})`
      );
      path.setAttribute("stroke-width", CONFIG.CURVE_STROKE_WIDTH.toString());
      path.setAttribute("fill", "none");

      svg.appendChild(path);
    }
  }

  /**
   * Draw desaturated (secondary) superellipse curve on color palette
   */
  drawDesaturatedCurve() {
    const x = this.state.saturation / 100;
    const y = this.state.value / 100;
    const nMain = SuperellipseMath.findExponent(x, y);
    const saturationPercent = this.state.saturationControl;

    const curvePoints = SuperellipseMath.generateDesaturatedCurve(
      nMain,
      saturationPercent
    );

    let svg = this.elements.colorPalette.querySelector(".desaturated-curve");
    if (!svg) {
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.classList.add("desaturated-curve");
      this.elements.colorPalette.appendChild(svg);
    }

    svg.innerHTML = "";

    if (
      saturationPercent < CONFIG.SATURATION_MIN_THRESHOLD ||
      curvePoints.length < 2
    ) {
      return;
    }

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

    let pathData = `M ${curvePoints[0].pixelX} ${curvePoints[0].pixelY}`;
    for (let i = 1; i < curvePoints.length; i++) {
      pathData += ` L ${curvePoints[i].pixelX} ${curvePoints[i].pixelY}`;
    }

    path.setAttribute("d", pathData);
    path.setAttribute(
      "stroke",
      `rgba(255, 255, 255, ${CONFIG.CURVE_SECONDARY_OPACITY})`
    );
    path.setAttribute("stroke-width", CONFIG.CURVE_STROKE_WIDTH.toString());
    path.setAttribute("fill", "none");
    svg.appendChild(path);
  }

  /**
   * Draw distribution points on the main curve
   */
  drawDistributionPoints() {
    const existingPoints = this.elements.colorPalette.querySelectorAll(
      ".distribution-point"
    );
    existingPoints.forEach((point) => point.remove());

    this.state.generatedColors.forEach((color) => {
      if (!color.isSelected && !color.isBlack && !color.isWhite) {
        const point = document.createElement("div");
        point.className = "distribution-point";

        const posS = color.mainS !== undefined ? color.mainS : color.s;
        const posV = color.mainV !== undefined ? color.mainV : color.v;
        point.style.left = (posS / 100) * CONFIG.PALETTE_SIZE + "px";
        point.style.top = ((100 - posV) / 100) * CONFIG.PALETTE_SIZE + "px";

        const pointColor =
          color.mainHex !== undefined ? color.mainHex : color.hex;
        point.style.background = pointColor;

        this.elements.colorPalette.appendChild(point);
      }
    });

    this.drawDesaturatedDistributionPoints();
  }

  /**
   * Draw distribution points on the desaturated curve
   */
  drawDesaturatedDistributionPoints() {
    const existingPoints = this.elements.colorPalette.querySelectorAll(
      ".distribution-point-secondary"
    );
    existingPoints.forEach((point) => point.remove());

    const saturationPercent = this.state.saturationControl;

    if (saturationPercent < CONFIG.SATURATION_MIN_THRESHOLD) {
      return;
    }

    const x = this.state.saturation / 100;
    const y = this.state.value / 100;
    const nMain = SuperellipseMath.findExponent(x, y);
    const desaturatedCurvePoints = SuperellipseMath.generateDesaturatedCurve(
      nMain,
      saturationPercent
    );

    if (desaturatedCurvePoints.length < 2) {
      return;
    }

    this.state.generatedColors.forEach((color) => {
      if (color.isBlack || color.isWhite) {
        return;
      }

      const targetArcLength = color.arcLength;
      const projectedPoint = SuperellipseMath.findPointAtArcLength(
        targetArcLength,
        desaturatedCurvePoints
      );

      if (!projectedPoint) {
        return;
      }

      const point = document.createElement("div");
      point.className = "distribution-point-secondary";
      point.style.left = projectedPoint.x * CONFIG.PALETTE_SIZE + "px";
      point.style.top = (1 - projectedPoint.y) * CONFIG.PALETTE_SIZE + "px";
      point.style.background = color.hex;

      this.elements.colorPalette.appendChild(point);
    });
  }

  /**
   * Update saturation slider gradient and handle position
   */
  updateSaturationSlider() {
    const { hue, value } = this.state;
    const saturationControl = this.state.saturationControl;

    const grayColor = ColorMath.hsvToHex(hue, 0, value);
    const fullSatColor = ColorMath.hsvToHex(hue, 100, value);

    if (this.elements.saturationSlider) {
      this.elements.saturationSlider.style.background = `linear-gradient(90deg, ${grayColor} 0%, ${fullSatColor} 100%)`;
    }

    if (this.elements.saturationHandle) {
      this.elements.saturationHandle.style.left = `${saturationControl}%`;
    }

    if (this.elements.saturationValueDisplay) {
      this.elements.saturationValueDisplay.textContent =
        Math.round(saturationControl);
    }
  }
}
