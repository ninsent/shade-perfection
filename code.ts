// ============================================================================
// SHADE PERFECTION - FIGMA PLUGIN
// by Nursultan Akim

// Sections:
// 1. Configuration & Constants
// 2. Type Definitions
// 3. Variable Manager
// 4. Frame Builder
// 5. Message Handler
// 6. Plugin Initialization
// ============================================================================

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const UI_CONFIG = {
  width: 462,
  height: 438,
  themeColors: true
} as const;

const FRAME_CONFIG = {
  COLOR_ITEM_HEIGHT: 40,
  COLOR_ITEM_WIDTH: 272,
  ITEM_SPACING: 2,
  CORNER_RADIUS: 8,
  HORIZONTAL_PADDING: 12,
  VERTICAL_PADDING: 0,
  OFFSET_X: 240,
  OFFSET_Y: 0
} as const;

const FONT_CONFIG = {
  family: 'Inter',
  style: 'Regular',
  size: 16
} as const;

const COLLECTION_NAMES = {
  GLOBAL: 'Global',
  NEUTRAL: 'Neutral'
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ColorData {
  hex: string;
  name: string;
  rgb: RGB;
  textColor: RGB;
  rgbString: string;
  isSelected?: boolean;
  isBlack?: boolean;
  isWhite?: boolean;
}

interface PaletteMessage {
  type: 'create-palette';
  colors: ColorData[];
  paletteName: string;
  isRgbFormat: boolean;
  withVariables: boolean;
}

type PluginMessage = PaletteMessage;

// ============================================================================
// VARIABLE MANAGER
// Handles Figma variable creation and management
// ============================================================================

class VariableManager {
  private collection: VariableCollection | null = null;
  private defaultMode: string = '';

  /**
   * Initialize variable manager and ensure collection exists
   */
  async initialize(): Promise<void> {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    this.collection = collections.find(c => c.name === COLLECTION_NAMES.GLOBAL) || null;

    if (!this.collection) {
      this.collection = figma.variables.createVariableCollection(COLLECTION_NAMES.GLOBAL);
    }

    this.defaultMode = this.collection.modes[0].modeId;
  }

  /**
   * Create or update color variables for palette
   * @param colors - Array of color data
   * @param paletteName - Name of the palette
   * @returns Map of color indices to variables
   */
  async createPaletteVariables(
    colors: ColorData[],
    paletteName: string
  ): Promise<Map<string, Variable>> {
    if (!this.collection) {
      throw new Error('Variable collection not initialized');
    }

    const variables = await figma.variables.getLocalVariablesAsync();
    const existingVariables = this._getExistingPaletteVariables(variables, paletteName);
    const newColorIndices = this._extractColorIndices(colors);

    // Map to store created/updated variables
    const variableMap = new Map<string, Variable>();

    // Update or create variables for each color
    for (const color of colors) {
      if (color.isBlack || color.isWhite) continue;

      const variable = await this._createOrUpdateVariable(color, paletteName, existingVariables);
      if (variable) {
        const indexMatch = color.name.match(/(\d+)$/);
        const variableIndex = indexMatch ? indexMatch[1] : color.name;
        variableMap.set(variableIndex, variable);
      }
    }

    // Clean up removed variables
    this._removeUnusedVariables(existingVariables, newColorIndices);

    // Handle neutral colors (black/white)
    const neutralVariables = await this._handleNeutralColors(colors, variables);

    // Add neutral variables to map
    neutralVariables.forEach((variable, key) => {
      variableMap.set(key, variable);
    });

    return variableMap;
  }

  /**
   * Get existing variables for a specific palette
   * @private
   */
  private _getExistingPaletteVariables(
    variables: Variable[],
    paletteName: string
  ): Map<string, Variable> {
    const existingMap = new Map<string, Variable>();

    variables
      .filter(v => v.name.startsWith(`${paletteName}/`))
      .forEach(variable => {
        const parts = variable.name.split('/');
        const index = parts[parts.length - 1];
        existingMap.set(index, variable);
      });

    return existingMap;
  }

  /**
   * Extract color indices from color data
   * @private
   */
  private _extractColorIndices(colors: ColorData[]): Set<string> {
    const indices = new Set<string>();

    colors.forEach(color => {
      if (color.isBlack || color.isWhite) return;

      const indexMatch = color.name.match(/(\d+)$/);
      const index = indexMatch ? indexMatch[1] : color.name;
      indices.add(index);
    });

    return indices;
  }

  /**
   * Create new variable or update existing one
   * @private
   * @returns Created or updated variable
   */
  private async _createOrUpdateVariable(
    color: ColorData,
    paletteName: string,
    existingVariables: Map<string, Variable>
  ): Promise<Variable | null> {
    if (!this.collection) return null;

    const indexMatch = color.name.match(/(\d+)$/);
    const variableIndex = indexMatch ? indexMatch[1] : color.name;
    const variableName = `${paletteName}/${variableIndex}`;

    let variable = existingVariables.get(variableIndex);

    const colorValue = {
      r: color.rgb.r,
      g: color.rgb.g,
      b: color.rgb.b,
      a: 1
    };

    if (variable) {
      // Update existing variable
      variable.description = `${paletteName} ${variableIndex}`;
      variable.setValueForMode(this.defaultMode, colorValue);
    } else {
      // Create new variable
      variable = figma.variables.createVariable(
        variableName,
        this.collection,
        'COLOR'
      );
      variable.description = `${paletteName} ${variableIndex}`;
      variable.setValueForMode(this.defaultMode, colorValue);
    }

    return variable;
  }

  /**
   * Remove variables that are no longer in the palette
   * @private
   */
  private _removeUnusedVariables(
    existingVariables: Map<string, Variable>,
    newIndices: Set<string>
  ): void {
    existingVariables.forEach((variable, index) => {
      if (!newIndices.has(index)) {
        variable.remove();
      }
    });
  }

  /**
   * Handle neutral (black/white) color variables
   * @private
   * @returns Map of neutral variables
   */
  private async _handleNeutralColors(
    colors: ColorData[],
    allVariables: Variable[]
  ): Promise<Map<string, Variable>> {
    const neutralMap = new Map<string, Variable>();

    if (!this.collection) return neutralMap;

    const hasNeutralColors = colors.some(c => c.isBlack || c.isWhite);
    if (!hasNeutralColors) return neutralMap;

    // Check for existing neutral variables
    const existingBlack = allVariables.find(v => v.name === `${COLLECTION_NAMES.NEUTRAL}/Black`);
    const existingWhite = allVariables.find(v => v.name === `${COLLECTION_NAMES.NEUTRAL}/White`);

    for (const color of colors) {
      if (!color.isBlack && !color.isWhite) continue;

      const isBlack = color.isBlack;
      const key = isBlack ? 'Black' : 'White';
      const variableName = `${COLLECTION_NAMES.NEUTRAL}/${key}`;

      // Use existing or create new
      let variable = isBlack ? existingBlack : existingWhite;

      if (!variable) {
        variable = figma.variables.createVariable(
          variableName,
          this.collection,
          'COLOR'
        );
        variable.description = key;
      }

      variable.setValueForMode(this.defaultMode, {
        r: color.rgb.r,
        g: color.rgb.g,
        b: color.rgb.b,
        a: 1
      });

      neutralMap.set(key, variable);
    }

    return neutralMap;
  }
}

// ============================================================================
// FRAME BUILDER
// Handles visual frame creation in Figma
// ============================================================================

class FrameBuilder {
  private fontLoaded: boolean = false;

  /**
   * Ensure font is loaded before creating text
   */
  async loadFont(): Promise<void> {
    if (this.fontLoaded) return;

    await figma.loadFontAsync({
      family: FONT_CONFIG.family,
      style: FONT_CONFIG.style
    });

    this.fontLoaded = true;
  }

  /**
   * Create main palette frame with all color items
   * @param colors - Array of color data
   * @param paletteName - Name of the palette
   * @param isRgbFormat - Whether to display RGB format
   * @param variableMap - Optional map of variables to bind
   */
  async createPaletteFrame(
    colors: ColorData[],
    paletteName: string,
    isRgbFormat: boolean,
    variableMap?: Map<string, Variable>
  ): Promise<FrameNode> {
    await this.loadFont();

    const mainFrame = this._createMainFrame(paletteName, colors.length);
    this._positionFrame(mainFrame);

    for (const color of colors) {
      const colorFrame = this._createColorItem(color, isRgbFormat, variableMap);
      mainFrame.appendChild(colorFrame);
    }

    figma.currentPage.appendChild(mainFrame);

    return mainFrame;
  }

  /**
   * Create main container frame
   * @private
   */
  private _createMainFrame(name: string, colorCount: number): FrameNode {
    const mainFrame = figma.createFrame();
    mainFrame.name = name;
    mainFrame.layoutMode = 'VERTICAL';
    mainFrame.itemSpacing = FRAME_CONFIG.ITEM_SPACING;
    mainFrame.paddingTop = 0;
    mainFrame.paddingBottom = 0;
    mainFrame.paddingLeft = 0;
    mainFrame.paddingRight = 0;
    mainFrame.layoutSizingHorizontal = 'FIXED';
    mainFrame.fills = [];

    const totalHeight = colorCount * FRAME_CONFIG.COLOR_ITEM_HEIGHT +
      (colorCount - 1) * FRAME_CONFIG.ITEM_SPACING;

    mainFrame.resize(FRAME_CONFIG.COLOR_ITEM_WIDTH, totalHeight);

    return mainFrame;
  }

  /**
   * Position frame in viewport
   * @private
   */
  private _positionFrame(frame: FrameNode): void {
    const center = figma.viewport.center;
    frame.x = center.x - frame.width / 2 + FRAME_CONFIG.OFFSET_X;
    frame.y = center.y - frame.height / 2 + FRAME_CONFIG.OFFSET_Y;
  }

  /**
   * Create individual color item frame
   * @private
   */
  private _createColorItem(
    color: ColorData,
    isRgbFormat: boolean,
    variableMap?: Map<string, Variable>
  ): FrameNode {
    const colorFrame = figma.createFrame();

    // Set frame name based on color type
    colorFrame.name = this._getFrameName(color);

    // Configure frame layout
    colorFrame.layoutMode = 'HORIZONTAL';
    colorFrame.primaryAxisAlignItems = 'SPACE_BETWEEN';
    colorFrame.counterAxisAlignItems = 'CENTER';
    colorFrame.layoutSizingHorizontal = 'FIXED';
    colorFrame.layoutSizingVertical = 'FIXED';
    colorFrame.resize(FRAME_CONFIG.COLOR_ITEM_WIDTH, FRAME_CONFIG.COLOR_ITEM_HEIGHT);
    colorFrame.paddingLeft = FRAME_CONFIG.HORIZONTAL_PADDING;
    colorFrame.paddingRight = FRAME_CONFIG.HORIZONTAL_PADDING;
    colorFrame.paddingTop = FRAME_CONFIG.VERTICAL_PADDING;
    colorFrame.paddingBottom = FRAME_CONFIG.VERTICAL_PADDING;
    colorFrame.cornerRadius = FRAME_CONFIG.CORNER_RADIUS;

    // Bind to variable if available, otherwise use static color
    if (variableMap) {
      this._bindColorToVariable(colorFrame, color, variableMap);
    } else {
      colorFrame.fills = [{ type: 'SOLID', color: color.rgb }];
    }

    // Add text elements
    const nameText = this._createText(color.name, color.textColor);
    const valueText = this._createText(
      this._getColorValue(color, isRgbFormat),
      color.textColor
    );

    colorFrame.appendChild(nameText);
    colorFrame.appendChild(valueText);

    return colorFrame;
  }

  /**
   * Bind frame color to variable
   * @private
   */
  private _bindColorToVariable(
    frame: FrameNode,
    color: ColorData,
    variableMap: Map<string, Variable>
  ): void {
    let variable: Variable | undefined;

    // Find the appropriate variable
    if (color.isBlack) {
      variable = variableMap.get('Black');
    } else if (color.isWhite) {
      variable = variableMap.get('White');
    } else {
      const indexMatch = color.name.match(/(\d+)$/);
      const variableIndex = indexMatch ? indexMatch[1] : color.name;
      variable = variableMap.get(variableIndex);
    }

    if (variable) {
      // Bind fills to variable
      frame.fills = [
        figma.variables.setBoundVariableForPaint(
          { type: 'SOLID', color: color.rgb },
          'color',
          variable
        )
      ];
    } else {
      // Fallback to static color if variable not found
      frame.fills = [{ type: 'SOLID', color: color.rgb }];
    }
  }

  /**
   * Get appropriate frame name for color
   * @private
   */
  private _getFrameName(color: ColorData): string {
    if (color.isBlack) return 'Black';
    if (color.isWhite) return 'White';

    // Extract index from name (e.g., "Deep Blue 10" -> "10")
    const indexMatch = color.name.match(/(\d+)$/);
    return indexMatch ? indexMatch[1] : color.name;
  }

  /**
   * Get display value for color (HEX or RGB)
   * @private
   */
  private _getColorValue(color: ColorData, isRgbFormat: boolean): string {
    return isRgbFormat ? color.rgbString : color.hex.toUpperCase();
  }

  /**
   * Create text node with specified content and color
   * @private
   */
  private _createText(content: string, color: RGB): TextNode {
    const text = figma.createText();
    text.fontName = {
      family: FONT_CONFIG.family,
      style: FONT_CONFIG.style
    };
    text.fontSize = FONT_CONFIG.size;
    text.fills = [{ type: 'SOLID', color }];
    text.characters = content;

    return text;
  }
}

// ============================================================================
// MESSAGE HANDLER
// Central message processing and coordination
// ============================================================================

class MessageHandler {
  private variableManager: VariableManager;
  private frameBuilder: FrameBuilder;

  constructor() {
    this.variableManager = new VariableManager();
    this.frameBuilder = new FrameBuilder();
  }

  /**
   * Process incoming message from UI
   * @param msg - Message from UI
   */
  async handleMessage(msg: PluginMessage): Promise<void> {
    if (msg.type !== 'create-palette') return;

    try {
      const { colors, paletteName, isRgbFormat, withVariables } = msg;

      let variableMap: Map<string, Variable> | undefined;

      // Create variables if requested
      if (withVariables) {
        await this.variableManager.initialize();
        variableMap = await this.variableManager.createPaletteVariables(colors, paletteName);
      }

      // Create visual frames (with variable bindings if available)
      await this.frameBuilder.createPaletteFrame(
        colors,
        paletteName,
        isRgbFormat,
        variableMap
      );

      // Send success response
      this._sendResponse(true);

    } catch (error) {
      console.error('Error creating palette:', error);
      this._sendResponse(false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Send response back to UI
   * @private
   */
  private _sendResponse(success: boolean, errorMessage?: string): void {
    figma.ui.postMessage({
      type: 'palette-created',
      success,
      error: errorMessage
    });
  }
}

// ============================================================================
// PLUGIN INITIALIZATION
// Main entry point
// ============================================================================

class ShadePerfectionPlugin {
  private messageHandler: MessageHandler;

  constructor() {
    this.messageHandler = new MessageHandler();
  }

  /**
   * Initialize and run the plugin
   */
  run(): void {
    // Show UI
    figma.showUI(__html__, UI_CONFIG);

    // Set up message listener
    figma.ui.onmessage = (msg: PluginMessage) => {
      this.messageHandler.handleMessage(msg);
    };
  }
}

// ============================================================================
// START PLUGIN
// ============================================================================

const plugin = new ShadePerfectionPlugin();
plugin.run();