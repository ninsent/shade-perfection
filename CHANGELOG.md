# Changelog

All notable changes to Shade Perfection will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

## [1.2.1] - 2025-10-16

### Changed
- Complete internal codebase refactoring for improved maintainability
- Migrated build system to Vite for faster development and optimized builds
- Split monolithic 5000+ line `ui.html` into modular architecture:
  - Styles separated into `tokens.css` and `styles.css`
  - JavaScript divided into 9 focused modules (config, math utilities, generators, controllers)
- Reorganized project structure: source files in `src/`, build output in `dist/`

### Notes
- No user-facing changes - this is a pure internal refactoring
- All features from v1.2.0 remain fully functional

## [1.2.0] - 2025-10-16

### Added
- Global saturation control slider for creating muted color palettes (0-100%)
- Desaturated curve visualization showing compressed superellipse
- Secondary distribution points on desaturated curve
- Real-time saturation value display
- Warm Gray preset (10% saturation)
- Cool Gray preset (30% saturation)

### Changed
- Color palette generation now based on desaturated curve projection
- All preset colors and contrast values rebalanced for better consistency
- Enhanced code structure and organization

### Fixed
- Contrast and color count icon positioning
- Package.json metadata information

### Removed
- Iceberg Teal preset

## [1.1.0] - 2025-10-12

### Fixed
- Frames automatically bind to their corresponding color variables

### Changed
- Complete code architecture refactor with modular structure
- Separated concerns into dedicated classes (ColorMath, SuperellipseMath, ColorGenerator, etc.)
- Implemented Observer pattern for state management
- Improved code documentation with comprehensive JSDoc comments

### Improved
- Minor performance optimizations in color generation
- Enhanced error handling and stability

### Added
- Comprehensive README documentation
- Contributing guidelines

## [1.0.1] - 2025-08-07

### Improved
- Improved positioning of created frames

## [1.0.0] - 2025-08-03

### Added
- Initial public release
- Superellipse curve implementation for color distribution
- Basic color generation with adjustable parameters
- Color picker with real-time curve visualization
- Export to Figma as color frames
- Contrast control (0.1-5.0)
- Color count adjustment (1-50)
- Reverse order option
- Smart Spacing feature for proportional color distribution
- RGB format support alongside HEX
- Figma variables integration
- Black & White color endpoints option
- 9 professional color presets (Atlantic Blue, Himmel Blue, Iceberg Teal, etc.)