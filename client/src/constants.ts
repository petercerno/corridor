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
    /** Lower hit-test boundary: cellX/cellY below this belongs to the previous gap. */
    get HIT_BOUNDARY_LOW() { return (this.CELL_SIZE - this.GAP_SIZE) / 4; },
    /** Upper hit-test boundary: cellX/cellY above this belongs to the current gap. */
    get HIT_BOUNDARY_HIGH() { return this.CELL_SIZE - this.HIT_BOUNDARY_LOW; },
    /** Computed board size in pixels (without margins). */
    get BOARD_SIZE() { return this.GRID_SIZE * this.CELL_SIZE + (this.GRID_SIZE - 1) * this.GAP_SIZE; },
    /** Computed total canvas width. */
    get CANVAS_WIDTH() { return this.MARGIN * 2 + this.BOARD_SIZE; },
    /** Computed total canvas height. */
    get CANVAS_HEIGHT() { return this.MARGIN * 2 + this.UI_HEIGHT + this.BOARD_SIZE; },
    /** Computed board top-left X position. */
    get BOARD_X() { return this.MARGIN; },
    /** Computed board top-left Y position. */
    get BOARD_Y() { return this.MARGIN + this.UI_HEIGHT; },
    /** Maximum valid wall anchor index (GRID_SIZE - 2). */
    get WALL_MAX_INDEX() { return this.GRID_SIZE - 2; },
};

/**
 * Helper to parse a hex string (e.g., '#ffffff') into a number (e.g., 0xffffff).
 */
const parseColor = (color: string) => parseInt(color.replace('#', '0x'), 16);

/**
 * Defines the shape of a color palette (hex strings).
 * Both LIGHT_COLORS and DARK_COLORS conform to this type.
 */
interface ColorPalette {
    BOARD_BG: string;
    SQUARE_LIGHT: string;
    SQUARE_DARK: string;
    SQUARE_BORDER: string;
    GAP_COLOR: string;
    VALID_MOVE: string;
    WALL_PREVIEW: string;
    UI_TEXT: string;
    BUTTON_BG: string;
    BUTTON_HOVER: string;
    WINNER_BG: string;
    CURRENT_PLAYER_BORDER: string;
}

/**
 * Light mode color palette.
 */
const LIGHT_COLORS: ColorPalette = {
    BOARD_BG: '#dddddd',
    SQUARE_LIGHT: '#bbbbbb',
    SQUARE_DARK: '#aaaaaa',
    SQUARE_BORDER: '#444444',
    GAP_COLOR: '#dddddd',
    VALID_MOVE: '#008000',
    WALL_PREVIEW: '#80c080',
    UI_TEXT: '#333333',
    BUTTON_BG: '#bbbbbb',
    BUTTON_HOVER: '#999999',
    WINNER_BG: '#44ff44',
    CURRENT_PLAYER_BORDER: '#0000cc',
};

/**
 * Dark mode color palette.
 */
const DARK_COLORS: ColorPalette = {
    BOARD_BG: '#333333',
    SQUARE_LIGHT: '#555555',
    SQUARE_DARK: '#484848',
    SQUARE_BORDER: '#222222',
    GAP_COLOR: '#333333',
    VALID_MOVE: '#00cc00',
    WALL_PREVIEW: '#80c080',
    UI_TEXT: '#ffffff',
    BUTTON_BG: '#555555',
    BUTTON_HOVER: '#777777',
    WINNER_BG: '#004400',
    CURRENT_PLAYER_BORDER: '#0080ff',
};

/**
 * Parsed color values derived from a ColorPalette.
 * Provides both numeric (for Phaser graphics) and string (for CSS/text styles) formats.
 */
interface ParsedColors {
    BOARD_BG: number;
    BOARD_BG_STR: string;
    SQUARE_LIGHT: number;
    SQUARE_DARK: number;
    SQUARE_BORDER: number;
    GAP_COLOR: number;
    VALID_MOVE: number;
    WALL_PREVIEW: number;
    UI_TEXT_STR: string;
    BUTTON_BG: number;
    BUTTON_BG_STR: string;
    BUTTON_HOVER: number;
    BUTTON_HOVER_STR: string;
    WINNER_BG: number;
    CURRENT_PLAYER_BORDER: number;
}

/**
 * Builds parsed color values from a palette.
 * All numeric and string variants are derived automatically.
 */
function buildColors(palette: ColorPalette): ParsedColors {
    return {
        BOARD_BG: parseColor(palette.BOARD_BG),
        BOARD_BG_STR: palette.BOARD_BG,
        SQUARE_LIGHT: parseColor(palette.SQUARE_LIGHT),
        SQUARE_DARK: parseColor(palette.SQUARE_DARK),
        SQUARE_BORDER: parseColor(palette.SQUARE_BORDER),
        GAP_COLOR: parseColor(palette.GAP_COLOR),
        VALID_MOVE: parseColor(palette.VALID_MOVE),
        WALL_PREVIEW: parseColor(palette.WALL_PREVIEW),
        UI_TEXT_STR: palette.UI_TEXT,
        BUTTON_BG: parseColor(palette.BUTTON_BG),
        BUTTON_BG_STR: palette.BUTTON_BG,
        BUTTON_HOVER: parseColor(palette.BUTTON_HOVER),
        BUTTON_HOVER_STR: palette.BUTTON_HOVER,
        WINNER_BG: parseColor(palette.WINNER_BG),
        CURRENT_PLAYER_BORDER: parseColor(palette.CURRENT_PLAYER_BORDER),
    };
}

/**
 * Tracks the current theme state.
 */
let _isDarkMode = true;

/**
 * Cached parsed colors for the active theme.
 */
let _colors: ParsedColors = buildColors(DARK_COLORS);

/**
 * Returns whether dark mode is currently active.
 */
export const isDarkMode = () => _isDarkMode;

/**
 * Returns the parsed color values for the active theme.
 * This is a cheap accessor — colors are rebuilt only on theme change.
 */
export function getColors(): ParsedColors {
    return _colors;
}

/**
 * Initializes the theme based on system preference.
 * Should be called once at application startup.
 */
export const initTheme = () => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        _isDarkMode = false;
        _colors = buildColors(LIGHT_COLORS);
    } else {
        _isDarkMode = true;
        _colors = buildColors(DARK_COLORS);
    }
};

/**
 * Toggles between dark and light mode, rebuilding parsed colors.
 */
export const toggleTheme = () => {
    _isDarkMode = !_isDarkMode;
    _colors = buildColors(_isDarkMode ? DARK_COLORS : LIGHT_COLORS);
};

/**
 * Per-player configuration (index = player).
 * Contains base and selected fill colors.
 */
export const PlayerConfig = [
    {
        color: parseColor('#d03030'), selectedColor: parseColor('#ff8b8a'),
        wallColorLight: parseColor('#b03030'), wallColorDark: parseColor('#ff8080')
    },
    {
        color: parseColor('#3030d0'), selectedColor: parseColor('#5dade2'),
        wallColorLight: parseColor('#3030b0'), wallColorDark: parseColor('#8080ff')
    },
    {
        color: parseColor('#308030'), selectedColor: parseColor('#5de250'),
        wallColorLight: parseColor('#207020'), wallColorDark: parseColor('#80e080')
    },
    {
        color: parseColor('#a05000'), selectedColor: parseColor('#ffb85a'),
        wallColorLight: parseColor('#804000'), wallColorDark: parseColor('#ffb060')
    },
];

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
    PAWN_SHADOW_OFFSET: 4,
    /** Shadow alpha for pawn. */
    PAWN_SHADOW_ALPHA: 0.4,
    /** Corner radius for squares. */
    SQUARE_CORNER_RADIUS: 10,
    /** Shadow offset for 3D effect on squares. */
    SQUARE_SHADOW_OFFSET: 5,
    /** Line width for square top highlight. */
    SQUARE_HIGHLIGHT_WIDTH: 1,
    /** Alpha for square top highlight. */
    SQUARE_HIGHLIGHT_ALPHA: 0.2,
    /** Alpha for valid move fill. */
    VALID_MOVE_ALPHA: 0.5,
    /** Line width for valid move ring outline. */
    VALID_MOVE_RING_WIDTH: 2,
    /** Alpha for valid move ring outline. */
    VALID_MOVE_RING_ALPHA: 0.8,
    /** Size multiplier for valid move indicator. */
    VALID_MOVE_SIZE: 0.6,
    /** Alpha for wall placement previews. */
    WALL_PREVIEW_ALPHA: 0.6,
    /** Thickness of wall rendering in pixels. */
    WALL_THICKNESS: 20,
    /** Corner radius for wall rendering. */
    WALL_CORNER_RADIUS: 5,
    /** Shadow offset for walls (X and Y). */
    WALL_SHADOW_OFFSET: 4,
    /** Shadow alpha for walls. */
    WALL_SHADOW_ALPHA: 0.3,
    /** Alpha for wall highlight line. */
    WALL_HIGHLIGHT_ALPHA: 0.3,
    /** Width ratio of direction triangle base relative to size. */
    DIRECTION_TRIANGLE_WIDTH: 0.7,
    /** Height ratio of direction triangle bottom relative to size. */
    DIRECTION_TRIANGLE_HEIGHT: 0.5,
    /** Alpha for direction triangle fill. */
    DIRECTION_TRIANGLE_ALPHA: 0.5,
    /** Default size of direction triangle relative to pawn radius. */
    DIRECTION_TRIANGLE_SIZE: 0.5,
    /** Radius of the status indicator circle relative to button size. */
    STATUS_CIRCLE_RATIO: 0.35,
    /** Stroke width for the status indicator circle outline. */
    STATUS_CIRCLE_STROKE_WIDTH: 3,
    /** Size of direction triangle in status indicator relative to circle radius. */
    STATUS_TRIANGLE_SIZE: 0.5,
    /** Border width for current player's square highlight. */
    CURRENT_PLAYER_BORDER_WIDTH: 4,
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

// ==================== Multiplayer Configuration ====================

import { SOCKET_IO_PATH, ROOM_NAME_REGEX } from '@shared/constants';

/**
 * Determines the WebSocket server URL based on the current hostname.
 * Returns empty string for localhost (same-origin connection), Cloud Run URL otherwise.
 */
const getServerUrl = (): string => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return ''; // Empty string = same origin (works for both dev and local prod)
    }
    return 'https://corridor-428046244270.europe-west1.run.app';
};

/**
 * Configuration for multiplayer functionality.
 */
export const MultiplayerConfig = {
    /** WebSocket server URL. Uses same-origin for localhost. */
    get SERVER_URL() { return getServerUrl(); },
    /** Socket.IO path (from shared constants). */
    SOCKET_PATH: SOCKET_IO_PATH,
    /** Pattern for valid room names (letters, numbers, and hyphens only). */
    ROOM_NAME_PATTERN: ROOM_NAME_REGEX,
};

