/**
 * Represents a position on the game board (cell indices).
 * Rows are 0-8 from top to bottom, columns are 0-8 from left to right.
 */
export interface GridPosition {
    row: number;
    col: number;
}

/**
 * Number of players in the game (2 or 4).
 */
export type PlayerCount = 2 | 4;

/**
 * Represents the possible players in the game.
 * Player 1 starts at the bottom, Player 2 starts at the top.
 * In 4-player mode, Player 3 starts on the left, Player 4 on the right.
 */
export type Player = 1 | 2 | 3 | 4;

/**
 * Represents a pawn on the board.
 */
export interface Pawn {
    player: Player;
    position: GridPosition;
}

/**
 * Represents the complete game state.
 */
export interface GameState {
    /** Number of players in this game. */
    playerCount: PlayerCount;
    /** Positions of all player pawns. */
    pawns: Pawn[];
    /** The player whose turn it currently is. */
    currentPlayer: Player;
    /** The player who has won, or null if game is ongoing. */
    winner: Player | null;
}
