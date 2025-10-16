import { CONFIG } from "./config.js";
import { ColorMath } from "./ColorMath.js";
import { SuperellipseMath } from "./SuperellipseMath.js";

// ============================================================================
// COLOR PALETTE GENERATOR
// Generates distributed colors along the superellipse curve
// ============================================================================

export class ColorGenerator {
  /**
   * Generates color palette distributed along superellipse curve.
   * Colors are calculated based on desaturated curve positions for consistent saturation control.
   *
   * @param {Object} params - Generation parameters
   * @param {number} params.hue - Hue value (0-360)
   * @param {number} params.saturation - Saturation value (0-100)
   * @param {number} params.value - Brightness value (0-100)
   * @param {number} params.colorCount - Number of colors to generate
   * @param {number} params.contrast - Contrast distribution factor
   * @param {boolean} params.smartSpacing - Whether to use adaptive spacing
   * @param {boolean} params.includeBlackWhite - Whether to add black and white
   * @param {number} params.saturationControl - Global saturation control (0-100)
   * @returns {Object} Object containing colors array and curve points
   */
  static generatePalette(params) {
    const {
      hue,
      saturation,
      value,
      colorCount,
      contrast,
      smartSpacing,
      includeBlackWhite,
      saturationControl,
    } = params;

    const normalizedX = saturation / 100;
    const normalizedY = value / 100;

    const n = SuperellipseMath.findExponent(normalizedX, normalizedY);
    const curvePoints = SuperellipseMath.generateCurvePoints(n);

    const selectedPoint = SuperellipseMath.findClosestPoint(
      normalizedX,
      normalizedY,
      curvePoints
    );
    const selectedArcLength = selectedPoint.normalizedArcLength;

    const colors = [];
    const count = parseInt(colorCount);
    const pointsToDistribute = count - 1;

    const useContrastMode = contrast !== 1.0;
    let pointsBefore, pointsAfter;

    if (smartSpacing && !useContrastMode) {
      pointsBefore = Math.round(selectedArcLength * pointsToDistribute);
      pointsAfter = pointsToDistribute - pointsBefore;

      if (pointsBefore === 0 && pointsAfter > 1) {
        pointsBefore = 1;
        pointsAfter = pointsAfter - 1;
      } else if (pointsAfter === 0 && pointsBefore > 1) {
        pointsAfter = 1;
        pointsBefore = pointsBefore - 1;
      }
    } else {
      if (count % 2 === 0) {
        const smallerSegment = Math.floor(pointsToDistribute / 2);
        const largerSegment = Math.ceil(pointsToDistribute / 2);

        const beforeLength = selectedArcLength;
        const afterLength = 1 - selectedArcLength;

        if (beforeLength >= afterLength) {
          pointsBefore = largerSegment;
          pointsAfter = smallerSegment;
        } else {
          pointsBefore = smallerSegment;
          pointsAfter = largerSegment;
        }
      } else {
        pointsBefore = pointsToDistribute / 2;
        pointsAfter = pointsToDistribute / 2;
      }
    }

    const saturationPercent =
      saturationControl !== undefined
        ? saturationControl
        : CONFIG.SATURATION_DEFAULT;
    const desaturatedCurvePoints = SuperellipseMath.generateDesaturatedCurve(
      n,
      saturationPercent
    );

    for (let i = 0; i < pointsBefore; i++) {
      const arcLength = this._calculateArcLength(
        i,
        pointsBefore,
        selectedArcLength,
        contrast,
        useContrastMode,
        true
      );

      const mainPoint = SuperellipseMath.findPointAtArcLength(
        arcLength,
        curvePoints
      );
      const mainS = mainPoint.x * 100;
      const mainV = mainPoint.y * 100;
      const mainHex = ColorMath.hsvToHex(hue, mainS, mainV);

      const desaturatedPoint = SuperellipseMath.findPointAtArcLength(
        arcLength,
        desaturatedCurvePoints
      );
      const s = desaturatedPoint.x * 100;
      const v = desaturatedPoint.y * 100;
      const hex = ColorMath.hsvToHex(hue, s, v);

      colors.push({
        hex,
        s,
        v,
        arcLength,
        mainS,
        mainV,
        mainHex,
      });
    }

    const selectedDesaturatedPoint = SuperellipseMath.findPointAtArcLength(
      selectedArcLength,
      desaturatedCurvePoints
    );
    const selectedS = selectedDesaturatedPoint.x * 100;
    const selectedV = selectedDesaturatedPoint.y * 100;
    const selectedMainHex = ColorMath.hsvToHex(hue, saturation, value);

    colors.push({
      hex: ColorMath.hsvToHex(hue, selectedS, selectedV),
      s: selectedS,
      v: selectedV,
      arcLength: selectedArcLength,
      isSelected: true,
      mainS: saturation,
      mainV: value,
      mainHex: selectedMainHex,
    });

    for (let i = 0; i < pointsAfter; i++) {
      const arcLength = this._calculateArcLength(
        i,
        pointsAfter,
        selectedArcLength,
        contrast,
        useContrastMode,
        false
      );

      const mainPoint = SuperellipseMath.findPointAtArcLength(
        arcLength,
        curvePoints
      );
      const mainS = mainPoint.x * 100;
      const mainV = mainPoint.y * 100;
      const mainHex = ColorMath.hsvToHex(hue, mainS, mainV);

      const desaturatedPoint = SuperellipseMath.findPointAtArcLength(
        arcLength,
        desaturatedCurvePoints
      );
      const s = desaturatedPoint.x * 100;
      const v = desaturatedPoint.y * 100;
      const hex = ColorMath.hsvToHex(hue, s, v);

      colors.push({
        hex,
        s,
        v,
        arcLength,
        mainS,
        mainV,
        mainHex,
      });
    }

    if (includeBlackWhite) {
      colors.unshift({
        hex: "#000000",
        s: 0,
        v: 0,
        arcLength: 0,
        isBlack: true,
        mainS: 0,
        mainV: 0,
        mainHex: "#000000",
      });
      colors.push({
        hex: "#FFFFFF",
        s: 0,
        v: 100,
        arcLength: 1,
        isWhite: true,
        mainS: 0,
        mainV: 100,
        mainHex: "#FFFFFF",
      });
    }

    return { colors, curvePoints, desaturatedCurvePoints };
  }

  /**
   * Calculates arc length position with optional contrast-based distribution.
   * Applies power function for non-linear spacing when contrast is enabled.
   *
   * @param {number} index - Current index in the distribution
   * @param {number} total - Total number of points to distribute
   * @param {number} selectedArc - Arc length of selected point
   * @param {number} contrast - Contrast factor
   * @param {boolean} useContrast - Whether to apply contrast distribution
   * @param {boolean} isBefore - Whether point is before or after selected point
   * @returns {number} Calculated arc length position
   * @private
   */
  static _calculateArcLength(
    index,
    total,
    selectedArc,
    contrast,
    useContrast,
    isBefore
  ) {
    if (!useContrast) {
      if (isBefore) {
        return (selectedArc / (total + 1)) * (index + 1);
      } else {
        return selectedArc + ((1 - selectedArc) / (total + 1)) * (index + 1);
      }
    }

    const normalizedDistance =
      (isBefore ? total - index : index + 1) / (total + 1);
    let poweredDistance;

    const contrastHighThreshold = 1.0;
    const contrastLowThreshold = 1.0;
    const contrastHighExponent = 1.5;
    const contrastLowExponent = 1.5;
    const maxContrastRange = 4.0;
    const minContrastRange = 0.9;

    if (contrast > contrastHighThreshold) {
      const t = Math.min(
        (contrast - contrastHighThreshold) / maxContrastRange,
        1.0
      );
      const linear = normalizedDistance;
      const curved = Math.pow(normalizedDistance, 1 / contrastHighExponent);
      poweredDistance = linear * (1 - t) + curved * t;
    } else if (contrast < contrastLowThreshold) {
      const t = Math.min(
        (contrastLowThreshold - contrast) / minContrastRange,
        1.0
      );
      const linear = normalizedDistance;
      const curved = Math.pow(normalizedDistance, contrastLowExponent);
      poweredDistance = linear * (1 - t) + curved * t;
    } else {
      poweredDistance = normalizedDistance;
    }

    if (isBefore) {
      return selectedArc - selectedArc * poweredDistance;
    } else {
      return selectedArc + (1 - selectedArc) * poweredDistance;
    }
  }

  /**
   * Generates display names for colors based on their position in the palette
   * @param {Array} colors - Array of color objects
   * @param {string} baseName - Base name for the palette
   * @returns {Array} Colors with display names
   */
  static generateColorNames(colors, baseName) {
    const mainColors = colors.filter((c) => !c.isBlack && !c.isWhite);
    const totalMainColors = mainColors.length;
    const nameMultiplier = 10;

    let colorCounter = 0;
    return colors.map((color) => {
      let displayName;

      if (color.isBlack) {
        displayName = "Black";
      } else if (color.isWhite) {
        displayName = "White";
      } else {
        const index = (totalMainColors - colorCounter) * nameMultiplier;
        displayName = `${baseName} ${index}`;
        colorCounter++;
      }

      return { ...color, displayName };
    });
  }
}
