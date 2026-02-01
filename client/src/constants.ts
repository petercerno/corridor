/**
 * Configuration for the game board layout and dimensions.
 */
export const BoardConfig = {
    /** Number of squares in each row and column of the grid. */
    GRID_SIZE: 9,
    /** Size of each square in pixels. */
    CELL_SIZE: 120,
    /** Gap between squares in pixels (for wall placement). */
    GAP_SIZE: 30,
    /** Margin around the board in pixels. */
    MARGIN: 80,
    /** Height of the UI area at the top in pixels. */
    UI_HEIGHT: 120,
    /** Computed cell step (cell + gap). */
    get CELL_STEP() { return this.CELL_SIZE + this.GAP_SIZE; },
    /** Computed board size in pixels (without margins). */
    get BOARD_SIZE() { return this.GRID_SIZE * this.CELL_SIZE + (this.GRID_SIZE - 1) * this.GAP_SIZE; },
    /** Computed total canvas width. */
    get CANVAS_WIDTH() { return this.MARGIN * 2 + this.BOARD_SIZE; },
    /** Computed total canvas height. */
    get CANVAS_HEIGHT() { return this.MARGIN * 2 + this.UI_HEIGHT + this.BOARD_SIZE; },
    /** Computed board top-left X position. */
    get BOARD_X() { return this.MARGIN; },
    /** Computed board top-left Y position. */
    get BOARD_Y() { return this.MARGIN + this.UI_HEIGHT; }
};

/**
 * Helper to parse a hex string (e.g., '#ffffff') into a number (e.g., 0xffffff).
 */
const parseColor = (color: string) => parseInt(color.replace('#', '0x'), 16);

/**
 * Wooden board color palette.
 */
const COLORS = {
    // Board background (dark wood)
    BOARD_BG: '#302010',
    // Square colors (lighter wood)
    SQUARE_LIGHT: '#d4b87a',
    SQUARE_DARK: '#c4a060',
    // Square border/shadow
    SQUARE_BORDER: '#8b6914',
    // Gap color (between squares)
    GAP_COLOR: '#200000',
    // Player pawn colors
    PLAYER_1: '#d03030',
    PLAYER_1_SELECTED: '#ff6b5a',
    PLAYER_2: '#3030d0',
    PLAYER_2_SELECTED: '#5dade2',
    // Valid move highlight
    VALID_MOVE: '#008000',
    VALID_MOVE_ALPHA: 0.5,
    // UI colors
    UI_TEXT: '#c4a060',
    UI_TEXT_SHADOW: '#000',
    // Button colors
    BUTTON_BG: '#4a3d24',
    BUTTON_HOVER: '#6a5d44',
};

/**
 * Exported color configuration with both string and hex number formats.
 */
export const ColorConfig = {
    BOARD_BG_STR: COLORS.BOARD_BG,
    SQUARE_LIGHT_STR: COLORS.SQUARE_LIGHT,
    SQUARE_DARK_STR: COLORS.SQUARE_DARK,
    SQUARE_BORDER_STR: COLORS.SQUARE_BORDER,
    GAP_COLOR_STR: COLORS.GAP_COLOR,
    PLAYER_1_STR: COLORS.PLAYER_1,
    PLAYER_1_SELECTED_STR: COLORS.PLAYER_1_SELECTED,
    PLAYER_2_STR: COLORS.PLAYER_2,
    PLAYER_2_SELECTED_STR: COLORS.PLAYER_2_SELECTED,
    VALID_MOVE_STR: COLORS.VALID_MOVE,
    UI_TEXT_STR: COLORS.UI_TEXT,
    UI_TEXT_SHADOW_STR: COLORS.UI_TEXT_SHADOW,
    BUTTON_BG_STR: COLORS.BUTTON_BG,
    BUTTON_HOVER_STR: COLORS.BUTTON_HOVER,

    BOARD_BG: parseColor(COLORS.BOARD_BG),
    SQUARE_LIGHT: parseColor(COLORS.SQUARE_LIGHT),
    SQUARE_DARK: parseColor(COLORS.SQUARE_DARK),
    SQUARE_BORDER: parseColor(COLORS.SQUARE_BORDER),
    GAP_COLOR: parseColor(COLORS.GAP_COLOR),
    PLAYER_1: parseColor(COLORS.PLAYER_1),
    PLAYER_1_SELECTED: parseColor(COLORS.PLAYER_1_SELECTED),
    PLAYER_2: parseColor(COLORS.PLAYER_2),
    PLAYER_2_SELECTED: parseColor(COLORS.PLAYER_2_SELECTED),
    VALID_MOVE: parseColor(COLORS.VALID_MOVE),
    VALID_MOVE_ALPHA: COLORS.VALID_MOVE_ALPHA,
    UI_TEXT: parseColor(COLORS.UI_TEXT),
    UI_TEXT_SHADOW: parseColor(COLORS.UI_TEXT_SHADOW),
    BUTTON_BG: parseColor(COLORS.BUTTON_BG),
    BUTTON_HOVER: parseColor(COLORS.BUTTON_HOVER),
};

/**
 * Configuration for graphics rendering.
 */
export const GraphicsConfig = {
    /** Radius of the pawn circle. */
    PAWN_RADIUS: 44,
    /** Stroke width for pawn outline. */
    PAWN_STROKE_WIDTH: 6,
    /** Stroke width for selected pawn glow. */
    PAWN_SELECTED_STROKE_WIDTH: 10,
    /** Additional radius for selection glow effect. */
    PAWN_GLOW_RADIUS_OFFSET: 8,
    /** Shadow offset for pawn (X and Y). */
    PAWN_SHADOW_OFFSET: 2,
    /** Shadow alpha for pawn. */
    PAWN_SHADOW_ALPHA: 0.3,
    /** Offset for pawn inner highlight (from center). */
    PAWN_HIGHLIGHT_OFFSET: 5,
    /** Size multiplier for pawn inner highlight. */
    PAWN_HIGHLIGHT_SIZE: 0.4,
    /** Alpha for pawn inner highlight. */
    PAWN_HIGHLIGHT_ALPHA: 0.3,
    /** Corner radius for squares. */
    SQUARE_CORNER_RADIUS: 10,
    /** Shadow offset for 3D effect on squares. */
    SQUARE_SHADOW_OFFSET: 5,
    /** Line width for square top highlight. */
    SQUARE_HIGHLIGHT_WIDTH: 1,
    /** Alpha for square top highlight. */
    SQUARE_HIGHLIGHT_ALPHA: 0.2,
    /** Line width for valid move ring outline. */
    VALID_MOVE_RING_WIDTH: 2,
    /** Alpha for valid move ring outline. */
    VALID_MOVE_RING_ALPHA: 0.8,
    /** Size multiplier for valid move indicator. */
    VALID_MOVE_SIZE: 0.6,
};

/**
 * Configuration for UI elements.
 */
export const UIConfig = {
    /** Font size for status text. */
    STATUS_FONT_SIZE: '48px',
    /** Font size for button text. */
    BUTTON_FONT_SIZE: '48px',
    /** Font family for text. */
    FONT_FAMILY: 'Arial, sans-serif',
    /** Vertical offset for UI elements from top. */
    UI_VERTICAL_OFFSET: 10,
    /** Horizontal padding for buttons. */
    BUTTON_PADDING_X: 20,
    /** Vertical padding for buttons. */
    BUTTON_PADDING_Y: 10,
};

/**
 * Starting positions for each player.
 */
export const StartPositions = {
    /** Player 1 starts at bottom center. */
    PLAYER_1: { row: 8, col: 4 },
    /** Player 2 starts at top center. */
    PLAYER_2: { row: 0, col: 4 },
};
