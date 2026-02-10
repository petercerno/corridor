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
    MARGIN: 20,
    /** Height of the UI area at the top in pixels. */
    UI_HEIGHT: 150,
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
export const parseColor = (color: string) => parseInt(color.replace('#', '0x'), 16);

/**
 * Light mode color palette.
 */
const LIGHT_COLORS = {
    BOARD_BG: '#dddddd',
    SQUARE_LIGHT: '#bbbbbb',
    SQUARE_DARK: '#aaaaaa',
    SQUARE_BORDER: '#444444',
    GAP_COLOR: '#dddddd',
    VALID_MOVE: '#008000',
    VALID_MOVE_ALPHA: 0.5,
    WALL_COLOR: '#444444',
    WALL_PREVIEW_COLOR: '#80c080',
    WALL_PREVIEW_ALPHA: 0.6,
    WALL_INVALID_COLOR: '#c04040',
    WALL_INVALID_ALPHA: 0.6,
    UI_TEXT: '#333333',
    BUTTON_BG: '#bbbbbb',
    BUTTON_HOVER: '#999999',
    WINNER_BG: '#308030',
};

/**
 * Dark mode color palette.
 */
const DARK_COLORS = {
    BOARD_BG: '#333333',
    SQUARE_LIGHT: '#555555',
    SQUARE_DARK: '#484848',
    SQUARE_BORDER: '#222222',
    GAP_COLOR: '#333333',
    VALID_MOVE: '#00cc00',
    VALID_MOVE_ALPHA: 0.5,
    WALL_COLOR: '#cccccc',
    WALL_PREVIEW_COLOR: '#80c080',
    WALL_PREVIEW_ALPHA: 0.6,
    WALL_INVALID_COLOR: '#c04040',
    WALL_INVALID_ALPHA: 0.6,
    UI_TEXT: '#ffffff',
    BUTTON_BG: '#555555',
    BUTTON_HOVER: '#777777',
    WINNER_BG: '#308030',
};

/**
 * Tracks the current theme state.
 */
let _isDarkMode = true;

/**
 * Returns whether dark mode is currently active.
 */
export const isDarkMode = () => _isDarkMode;

/**
 * Updates the ColorConfig with values from the given palette.
 */
const updateColorConfig = (palette: typeof DARK_COLORS) => {
    ColorConfig.BOARD_BG_STR = palette.BOARD_BG;
    ColorConfig.BOARD_BG = parseColor(palette.BOARD_BG);
    ColorConfig.SQUARE_LIGHT = parseColor(palette.SQUARE_LIGHT);
    ColorConfig.SQUARE_DARK = parseColor(palette.SQUARE_DARK);
    ColorConfig.SQUARE_BORDER = parseColor(palette.SQUARE_BORDER);
    ColorConfig.GAP_COLOR = parseColor(palette.GAP_COLOR);
    ColorConfig.VALID_MOVE = parseColor(palette.VALID_MOVE);
    ColorConfig.VALID_MOVE_ALPHA = palette.VALID_MOVE_ALPHA;
    ColorConfig.WALL_COLOR = parseColor(palette.WALL_COLOR);
    ColorConfig.WALL_PREVIEW = parseColor(palette.WALL_PREVIEW_COLOR);
    ColorConfig.WALL_PREVIEW_ALPHA = palette.WALL_PREVIEW_ALPHA;
    ColorConfig.WALL_INVALID = parseColor(palette.WALL_INVALID_COLOR);
    ColorConfig.WALL_INVALID_ALPHA = palette.WALL_INVALID_ALPHA;
    ColorConfig.UI_TEXT_STR = palette.UI_TEXT;
    ColorConfig.BUTTON_BG_STR = palette.BUTTON_BG;
    ColorConfig.BUTTON_BG = parseColor(palette.BUTTON_BG);
    ColorConfig.BUTTON_HOVER_STR = palette.BUTTON_HOVER;
    ColorConfig.BUTTON_HOVER = parseColor(palette.BUTTON_HOVER);
    ColorConfig.WINNER_BG = parseColor(palette.WINNER_BG);
};

/**
 * Initializes the theme based on system preference.
 * Should be called once at application startup.
 */
export const initTheme = () => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        _isDarkMode = false;
        updateColorConfig(LIGHT_COLORS);
    } else {
        _isDarkMode = true;
        updateColorConfig(DARK_COLORS);
    }
};

/**
 * Toggles between dark and light mode, updating ColorConfig accordingly.
 */
export const toggleTheme = () => {
    _isDarkMode = !_isDarkMode;
    updateColorConfig(_isDarkMode ? DARK_COLORS : LIGHT_COLORS);
};

/**
 * Per-player configuration (index = player).
 * Contains base and selected fill colors.
 */
export const PlayerConfig = [
    { color: parseColor('#d03030'), selectedColor: parseColor('#ff8b8a') },
    { color: parseColor('#3030d0'), selectedColor: parseColor('#5dade2') },
    { color: parseColor('#308030'), selectedColor: parseColor('#5de250') },
    { color: parseColor('#a05000'), selectedColor: parseColor('#ffb85a') },
];

/**
 * Exported color configuration, providing both string and hex number formats.
 * This object is mutable and updated by initTheme() and toggleTheme().
 * Initial values are set by initTheme() on application startup.
 */
export const ColorConfig = {
    // --- Board ---
    BOARD_BG_STR: '',
    BOARD_BG: 0,
    SQUARE_LIGHT: 0,
    SQUARE_DARK: 0,
    SQUARE_BORDER: 0,
    GAP_COLOR: 0,

    // --- Valid move highlight ---
    VALID_MOVE: 0,
    VALID_MOVE_ALPHA: 0,

    // --- Walls ---
    WALL_COLOR: 0,
    WALL_PREVIEW: 0,
    WALL_PREVIEW_ALPHA: 0,
    WALL_INVALID: 0,
    WALL_INVALID_ALPHA: 0,

    // --- UI (string format for Phaser text styles) ---
    UI_TEXT_STR: '',
    BUTTON_BG_STR: '',
    BUTTON_BG: 0,
    BUTTON_HOVER_STR: '',
    BUTTON_HOVER: 0,
    WINNER_BG: 0,
};

// Initialize with default dark mode colors for type safety before initTheme() is called
updateColorConfig(DARK_COLORS);

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
    /** Thickness of wall rendering in pixels. */
    WALL_THICKNESS: 20,
    /** Corner radius for wall rendering. */
    WALL_CORNER_RADIUS: 5,
};

/**
 * Configuration for UI elements.
 */
export const UIConfig = {
    /** Font size for button text. */
    BUTTON_FONT_SIZE: '48px',
    /** Font family for text. */
    FONT_FAMILY: 'Arial, sans-serif',
    /** Vertical padding for buttons. */
    BUTTON_PADDING_Y: 22,
    /** Corner radius for button backgrounds. */
    BUTTON_CORNER_RADIUS: 12,
};

/**
 * Wall count configuration per game mode.
 */
export const WallConfig = {
    /** Number of walls per player in 2-player mode. */
    WALLS_2P: 10,
    /** Number of walls per player in 4-player mode. */
    WALLS_4P: 5,
};

/**
 * Starting positions for 2-player mode (index = player).
 * Player 0 starts at bottom, Player 1 starts at top.
 */
export const StartPositions2P = [
    { row: 8, col: 4 },  // Player 0: bottom center
    { row: 0, col: 4 },  // Player 1: top center
];

/**
 * Starting positions for 4-player mode (index = player, clockwise from bottom).
 * Player 0: bottom → wants top row
 * Player 1: left → wants right column
 * Player 2: top → wants bottom row
 * Player 3: right → wants left column
 */
export const StartPositions4P = [
    { row: 8, col: 4 },  // Player 0: bottom center
    { row: 4, col: 0 },  // Player 1: left center
    { row: 0, col: 4 },  // Player 2: top center
    { row: 4, col: 8 },  // Player 3: right center
];
