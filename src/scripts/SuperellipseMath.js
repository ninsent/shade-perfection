import { CONFIG } from "./config.js";

// ============================================================================
// SUPERELLIPSE MATHEMATICS MODULE
// Handles superellipse curve calculations and point distribution
// ============================================================================

export class SuperellipseMath {
  /**
   * Finds the exponent 'n' for superellipse equation: x^n + y^n = 1
   * Uses binary search to find n that passes through point (x, y)
   * @param {number} x - X coordinate (0-1)
   * @param {number} y - Y coordinate (0-1)
   * @returns {number} Exponent n for the superellipse
   */
  static findExponent(x, y) {
    const minThreshold = 0.001;
    const maxThreshold = 0.99;

    if (x <= minThreshold && y <= minThreshold)
      return CONFIG.SUPERELLIPSE_N_MIN;
    if (x <= minThreshold || y <= minThreshold)
      return CONFIG.SUPERELLIPSE_N_MIN;
    if (x >= maxThreshold && y >= maxThreshold)
      return CONFIG.SUPERELLIPSE_N_MAX;

    let nMin = CONFIG.SUPERELLIPSE_N_MIN;
    let nMax = CONFIG.SUPERELLIPSE_N_MAX;

    for (let i = 0; i < CONFIG.SUPERELLIPSE_MAX_ITERATIONS; i++) {
      const nMid = (nMin + nMax) / 2;
      const f = Math.pow(x, nMid) + Math.pow(y, nMid) - 1;

      if (Math.abs(f) < CONFIG.SUPERELLIPSE_TOLERANCE) {
        return Math.min(nMid, CONFIG.SUPERELLIPSE_N_MAX);
      }

      const fMin = Math.pow(x, nMin) + Math.pow(y, nMin) - 1;
      if (f * fMin < 0) nMax = nMid;
      else nMin = nMid;
    }

    return Math.min((nMin + nMax) / 2, CONFIG.SUPERELLIPSE_N_MAX);
  }

  /**
   * Generates points along the superellipse curve with arc length parameterization
   * @param {number} n - Superellipse exponent
   * @returns {Array} Array of curve points with positions and arc lengths
   */
  static generateCurvePoints(n) {
    const points = [];
    let totalArcLength = 0;
    const resolution = CONFIG.CURVE_RESOLUTION;
    const minSegmentLength = 1e-10;

    for (let i = 0; i <= resolution; i++) {
      const t = ((i / resolution) * Math.PI) / 2;

      try {
        const px = Math.pow(Math.cos(t), 2 / n);
        const py = Math.pow(Math.sin(t), 2 / n);

        const clampedX = Math.max(0, Math.min(1, px));
        const clampedY = Math.max(0, Math.min(1, py));

        const point = {
          t,
          x: clampedX,
          y: clampedY,
          pixelX: clampedX * CONFIG.PALETTE_SIZE,
          pixelY: (1 - clampedY) * CONFIG.PALETTE_SIZE,
          arcLength: totalArcLength,
        };

        if (i > 0) {
          const prevPoint = points[i - 1];
          const dx = point.x - prevPoint.x;
          const dy = point.y - prevPoint.y;
          const segmentLength = Math.sqrt(dx * dx + dy * dy);

          if (segmentLength > minSegmentLength) {
            totalArcLength += segmentLength;
          }
          point.arcLength = totalArcLength;
        }

        points.push(point);
      } catch (e) {
        continue;
      }
    }

    if (totalArcLength > 0) {
      points.forEach((point) => {
        point.normalizedArcLength = point.arcLength / totalArcLength;
      });
    } else {
      points.forEach((point, index) => {
        point.normalizedArcLength = index / (points.length - 1);
      });
    }

    return points;
  }

  /**
   * Generates points along a compressed (desaturated) superellipse curve.
   * The curve is compressed along the x-axis to create lower saturation values
   * while maintaining the same brightness distribution.
   *
   * @param {number} nMain - Main superellipse exponent
   * @param {number} saturationPercent - Saturation percentage (0-100)
   * @returns {Array} Array of curve points for desaturated curve
   */
  static generateDesaturatedCurve(nMain, saturationPercent) {
    const points = [];
    const minCompressionFactor = 0.005;
    const minSegmentLength = 1e-10;

    const a = Math.max(minCompressionFactor, saturationPercent / 100);
    const nSecondary = 1 + (nMain - 1) * (saturationPercent / 100);

    let totalArcLength = 0;
    const resolution = CONFIG.CURVE_RESOLUTION;

    for (let i = 0; i <= resolution; i++) {
      const t = ((i / resolution) * Math.PI) / 2;

      try {
        const px = a * Math.pow(Math.cos(t), 2 / nSecondary);
        const py = Math.pow(Math.sin(t), 2 / nSecondary);

        const clampedX = Math.max(0, Math.min(1, px));
        const clampedY = Math.max(0, Math.min(1, py));

        const point = {
          t,
          x: clampedX,
          y: clampedY,
          pixelX: clampedX * CONFIG.PALETTE_SIZE,
          pixelY: (1 - clampedY) * CONFIG.PALETTE_SIZE,
          arcLength: totalArcLength,
        };

        if (i > 0) {
          const prevPoint = points[i - 1];
          const dx = point.x - prevPoint.x;
          const dy = point.y - prevPoint.y;
          const segmentLength = Math.sqrt(dx * dx + dy * dy);

          if (segmentLength > minSegmentLength) {
            totalArcLength += segmentLength;
          }
          point.arcLength = totalArcLength;
        }

        points.push(point);
      } catch (e) {
        continue;
      }
    }

    if (totalArcLength > 0) {
      points.forEach((point) => {
        point.normalizedArcLength = point.arcLength / totalArcLength;
      });
    } else {
      points.forEach((point, index) => {
        point.normalizedArcLength = index / (points.length - 1);
      });
    }

    return points;
  }

  /**
   * Finds the closest point on the curve to target coordinates using
   * optimized local search with line segment projection
   *
   * @param {number} targetX - Target X coordinate
   * @param {number} targetY - Target Y coordinate
   * @param {Array} curvePoints - Array of curve points
   * @returns {Object} Closest point on the curve with arc length
   */
  static findClosestPoint(targetX, targetY, curvePoints) {
    const searchRadius = 3;
    const minSegmentLength = 1e-10;

    let closestPoint = curvePoints[0];
    let minDistance = Infinity;
    let closestIndex = 0;

    curvePoints.forEach((point, index) => {
      const dx = point.x - targetX;
      const dy = point.y - targetY;
      const distance = dx * dx + dy * dy;

      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
        closestIndex = index;
      }
    });

    const startIdx = Math.max(0, closestIndex - searchRadius);
    const endIdx = Math.min(
      curvePoints.length - 1,
      closestIndex + searchRadius
    );

    let bestPoint = closestPoint;
    let bestDistance = minDistance;

    for (let i = startIdx; i < endIdx; i++) {
      const p1 = curvePoints[i];
      const p2 = curvePoints[i + 1];

      const segmentVecX = p2.x - p1.x;
      const segmentVecY = p2.y - p1.y;
      const toTargetX = targetX - p1.x;
      const toTargetY = targetY - p1.y;

      const segmentLengthSq =
        segmentVecX * segmentVecX + segmentVecY * segmentVecY;

      if (segmentLengthSq > minSegmentLength) {
        const t = Math.max(
          0,
          Math.min(
            1,
            (toTargetX * segmentVecX + toTargetY * segmentVecY) /
              segmentLengthSq
          )
        );

        const projectedX = p1.x + t * segmentVecX;
        const projectedY = p1.y + t * segmentVecY;
        const projectedArcLength =
          p1.normalizedArcLength +
          t * (p2.normalizedArcLength - p1.normalizedArcLength);

        const dx = projectedX - targetX;
        const dy = projectedY - targetY;
        const distance = dx * dx + dy * dy;

        if (distance < bestDistance) {
          bestDistance = distance;
          bestPoint = {
            x: projectedX,
            y: projectedY,
            normalizedArcLength: projectedArcLength,
          };
        }
      }
    }

    return bestPoint;
  }

  /**
   * Finds point at specific arc length position on curve using linear interpolation
   * @param {number} normalizedArcLength - Normalized arc length (0-1)
   * @param {Array} curvePoints - Array of curve points
   * @returns {Object} Point at specified arc length
   */
  static findPointAtArcLength(normalizedArcLength, curvePoints) {
    if (normalizedArcLength <= 0) return curvePoints[0];
    if (normalizedArcLength >= 1) return curvePoints[curvePoints.length - 1];

    for (let i = 1; i < curvePoints.length; i++) {
      const prevPoint = curvePoints[i - 1];
      const currPoint = curvePoints[i];

      if (
        normalizedArcLength >= prevPoint.normalizedArcLength &&
        normalizedArcLength <= currPoint.normalizedArcLength
      ) {
        const t =
          (normalizedArcLength - prevPoint.normalizedArcLength) /
          (currPoint.normalizedArcLength - prevPoint.normalizedArcLength);

        return {
          x: prevPoint.x + t * (currPoint.x - prevPoint.x),
          y: prevPoint.y + t * (currPoint.y - prevPoint.y),
          normalizedArcLength,
        };
      }
    }

    return curvePoints[curvePoints.length - 1];
  }
}
