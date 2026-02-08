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
 * Player 0 starts at the bottom, Player 1 starts at the top.
 * In 4-player mode (clockwise from bottom):
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
