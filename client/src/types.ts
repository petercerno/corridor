/**
 * Represents a position on the game board (cell indices).
 * Rows are 0-8 from top to bottom, columns are 0-8 from left to right.
 */
export interface GridPosition {
    row: number;
    col: number;
}

/**
 * Describes a gap between two adjacent cells on the board.
 * `from` is the cell closer to top-left; `to` is the adjacent cell.
 * The orientation is implicit: if they differ in row it's a horizontal gap,
 * if they differ in column it's a vertical gap.
 */
export interface GapEdge {
    from: GridPosition;
    to: GridPosition;
}

/**
 * Number of players in the game (2 or 4).
 */
export type PlayerCount = 2 | 4;

/**
 * Represents the possible players in the game (0-indexed).
 * 2-player mode: Player 0 bottom, Player 1 top.
 * 4-player mode (clockwise from bottom):
 * Player 0: bottom, Player 1: left, Player 2: top, Player 3: right.
 */
export type Player = 0 | 1 | 2 | 3;

/**
 * Orientation of a wall (horizontal or vertical).
 */
export type WallOrientation = 'horizontal' | 'vertical';

/**
 * Represents a placed wall on the board.
 * A wall sits between a 2x2 block of cells.
 * `row` and `col` define the top-left cell of the 2x2 block.
 *
 * Horizontal wall: blocks vertical movement between
 *   [row,col]↔[row+1,col] and [row,col+1]↔[row+1,col+1]
 * Vertical wall: blocks horizontal movement between
 *   [row,col]↔[row,col+1] and [row+1,col]↔[row+1,col+1]
 */
export interface Wall {
    row: number;
    col: number;
    orientation: WallOrientation;
    /** The player who placed this wall (set when placed, absent for candidates). */
    player?: Player;
}

/**
 * Represents the complete game state.
 */
export interface GameState {
    /** Number of players in this game. */
    playerCount: PlayerCount;
    /** Positions of all player pawns (index = player). */
    pawns: GridPosition[];
    /** Placed walls on the board. */
    walls: Wall[];
    /** Remaining wall count per player (index = player). */
    wallCounts: number[];
    /** The player whose turn it currently is. */
    currentPlayer: Player;
    /** The player who has won, or null if game is ongoing. */
    winner: Player | null;
}

/**
 * Represents a position in world (pixel) coordinates.
 */
export interface WorldPosition {
    x: number;
    y: number;
}

/**
 * Cardinal direction on the board.
 */
export type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Checks if two grid positions are the same cell.
 */
export function samePosition(a: GridPosition, b: GridPosition): boolean {
    return a.row === b.row && a.col === b.col;
}

/**
 * Checks if two gap edges are identical (same from and to cells).
 */
export function sameGapEdge(a: GapEdge, b: GapEdge): boolean {
    return samePosition(a.from, b.from) && samePosition(a.to, b.to);
}

/**
 * Information about the current multiplayer room connection.
 */
export interface RoomInfo {
    /** Name of the connected room. */
    roomName: string;
    /** Whether this client is the room owner (first to join). */
    isRoomOwner: boolean;
    /** Number of players currently in the room. */
    playerCount: number;
}

