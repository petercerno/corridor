/**
 * Represents a position on the game board (cell indices).
 * Rows are 0-8 from top to bottom, columns are 0-8 from left to right.
 */
export interface GridPosition {
    row: number;
    col: number;
}

/**
 * Represents the two possible players in the game.
 * Player 1 starts at the bottom, Player 2 starts at the top.
 */
export type Player = 1 | 2;

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
    /** Positions of both player pawns. */
    pawns: [Pawn, Pawn];
    /** The player whose turn it currently is. */
    currentPlayer: Player;
    /** The player who has won, or null if game is ongoing. */
    winner: Player | null;
}
