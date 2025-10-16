import { CONFIG } from './config.js'
import { SuperellipseMath } from './SuperellipseMath.js'

// ============================================================================
// COLOR MATHEMATICS MODULE
// Handles all color space conversions (HSV, RGB, HEX)
// ============================================================================
export class ColorMath {
  /**
   * Converts HSV color to HEX format
   * @param {number} h - Hue (0-360)
   * @param {number} s - Saturation (0-100)
   * @param {number} v - Value/Brightness (0-100)
   * @returns {string} HEX color string (#RRGGBB)
   */
  static hsvToHex(h, s, v) {
    s /= 100
    v /= 100
    const c = v * s
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = v - c

    let r, g, b
    if (h < 60) [r, g, b] = [c, x, 0]
    else if (h < 120) [r, g, b] = [x, c, 0]
    else if (h < 180) [r, g, b] = [0, c, x]
    else if (h < 240) [r, g, b] = [0, x, c]
    else if (h < 300) [r, g, b] = [x, 0, c]
    else [r, g, b] = [c, 0, x]

    return (
      '#' +
      [r, g, b]
        .map((val) =>
          Math.round((val + m) * 255)
            .toString(16)
            .padStart(2, '0')
        )
        .join('')
        .toUpperCase()
    )
  }

  /**
   * Converts HEX color to HSV format
   * @param {string} hex - HEX color string
   * @returns {Object} HSV object {h, s, v}
   */
  static hexToHsv(hex) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const diff = max - min

    let h = 0
    if (diff) {
      if (max === r) h = ((g - b) / diff) % 6
      else if (max === g) h = (b - r) / diff + 2
      else h = (r - g) / diff + 4
    }
    h = Math.round(h * 60)
    if (h < 0) h += 360

    return {
      h,
      s: Math.round(max ? (diff / max) * 100 : 0),
      v: Math.round(max * 100),
    }
  }

  /**
   * Converts HEX color to RGB format
   * @param {string} hex - HEX color string
   * @returns {Object} RGB object {r, g, b} (0-255)
   */
  static hexToRgb(hex) {
    return {
      r: parseInt(hex.substr(1, 2), 16),
      g: parseInt(hex.substr(3, 2), 16),
      b: parseInt(hex.substr(5, 2), 16),
    }
  }

  /**
   * Converts RGB color to HSV format
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   * @returns {Object} HSV object {h, s, v}
   */
  static rgbToHsv(r, g, b) {
    r /= 255
    g /= 255
    b /= 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const diff = max - min

    let h = 0
    if (diff !== 0) {
      if (max === r) h = ((g - b) / diff) % 6
      else if (max === g) h = (b - r) / diff + 2
      else h = (r - g) / diff + 4
    }
    h = Math.round(h * 60)
    if (h < 0) h += 360

    return {
      h,
      s: Math.round(max === 0 ? 0 : (diff / max) * 100),
      v: Math.round(max * 100),
    }
  }

  /**
   * Calculate desaturated version of a color by projecting onto a compressed superellipse curve.
   * This creates a palette with reduced saturation while maintaining the color relationships.
   *
   * @param {number} h - Hue (0-360)
   * @param {number} s - Saturation (0-100)
   * @param {number} v - Value/Brightness (0-100)
   * @param {number} saturationPercent - Target saturation percentage (0-100)
   * @returns {string} HEX color string for desaturated color
   */
  static getDesaturatedColor(h, s, v, saturationPercent) {
    if (saturationPercent >= CONFIG.SATURATION_MAX) {
      return this.hsvToHex(h, s, v)
    }

    const x = s / 100
    const y = v / 100

    const n = SuperellipseMath.findExponent(x, y)
    const mainCurve = SuperellipseMath.generateCurvePoints(n)
    const selectedPoint = SuperellipseMath.findClosestPoint(x, y, mainCurve)
    const arcLength = selectedPoint.normalizedArcLength

    const desaturatedCurve = SuperellipseMath.generateDesaturatedCurve(n, saturationPercent)
    const desaturatedPoint = SuperellipseMath.findPointAtArcLength(arcLength, desaturatedCurve)

    const newS = desaturatedPoint.x * 100
    const newV = desaturatedPoint.y * 100

    return this.hsvToHex(h, newS, newV)
  }

  /**
   * Parses RGB string format "rgb(r, g, b)"
   * @param {string} rgbString - RGB string
   * @returns {Object|null} RGB object {r, g, b} or null if invalid
   */
  static parseRgbString(rgbString) {
    const match = rgbString.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/)
    if (!match) return null

    return {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3]),
    }
  }

  /**
   * Determines optimal text color (black or white) for given background
   * @param {string} hexColor - Background HEX color
   * @returns {string} 'black' or 'white'
   */
  static getContrastTextColor(hexColor) {
    const { r, g, b } = this.hexToRgb(hexColor)
    const luminance = (0.25 * r + 0.35 * g + 0.15 * b) / 255
    return luminance > 0.4 ? 'black' : 'white'
  }
}
