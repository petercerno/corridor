import type { GridPosition, Player, GameState, Pawn } from '../types';
import { BoardConfig, StartPositions } from '../constants';

/**
 * Pure game logic for Corridor (Quoridor).
 * Handles game state, move validation, and turn management.
 */
export class GameLogic {
    /**
     * Creates the initial game state with pawns at starting positions.
     */
    static getInitialState(): GameState {
        return {
            pawns: [
                { player: 1, position: { ...StartPositions.PLAYER_1 } },
                { player: 2, position: { ...StartPositions.PLAYER_2 } },
            ],
            currentPlayer: 1,
            winner: null,
        };
    }

    /**
     * Gets the pawn for a specific player.
     */
    static getPawn(state: GameState, player: Player): Pawn {
        return state.pawns[player - 1];
    }

    /**
     * Checks if a position is within the board bounds.
     */
    static isInBounds(position: GridPosition): boolean {
        return (
            position.row >= 0 &&
            position.row < BoardConfig.GRID_SIZE &&
            position.col >= 0 &&
            position.col < BoardConfig.GRID_SIZE
        );
    }

    /**
     * Checks if a position is occupied by any pawn.
     */
    static isOccupied(state: GameState, position: GridPosition): boolean {
        return state.pawns.some(
            pawn => pawn.position.row === position.row && pawn.position.col === position.col
        );
    }

    /**
     * Gets valid moves for the current player's pawn.
     * Returns an array of valid target positions.
     */
    static getValidMoves(state: GameState): GridPosition[] {
        const pawn = this.getPawn(state, state.currentPlayer);
        const { row, col } = pawn.position;
        const validMoves: GridPosition[] = [];

        // Orthogonal directions: up, down, left, right
        const directions = [
            { row: -1, col: 0 },  // up
            { row: 1, col: 0 },   // down
            { row: 0, col: -1 },  // left
            { row: 0, col: 1 },   // right
        ];

        for (const dir of directions) {
            const newPos: GridPosition = {
                row: row + dir.row,
                col: col + dir.col,
            };

            // Check bounds
            if (!this.isInBounds(newPos)) continue;

            // Check if occupied by opponent (jumping logic for later)
            if (this.isOccupied(state, newPos)) {
                // For now, skip occupied squares
                // TODO: Add jumping over opponent logic
                continue;
            }

            // TODO: Add wall blocking check

            validMoves.push(newPos);
        }

        return validMoves;
    }

    /**
     * Checks if a move from current position to target is valid.
     */
    static isValidMove(state: GameState, target: GridPosition): boolean {
        const validMoves = this.getValidMoves(state);
        return validMoves.some(
            move => move.row === target.row && move.col === target.col
        );
    }

    /**
     * Makes a move for the current player.
     * Returns the new game state, or null if the move is invalid.
     */
    static makeMove(state: GameState, target: GridPosition): GameState | null {
        if (!this.isValidMove(state, target)) {
            return null;
        }

        // Create new state with updated pawn position
        const newPawns: [Pawn, Pawn] = [
            { ...state.pawns[0], position: { ...state.pawns[0].position } },
            { ...state.pawns[1], position: { ...state.pawns[1].position } },
        ];

        // Update the current player's pawn position
        newPawns[state.currentPlayer - 1].position = { ...target };

        // Check for win condition
        const winner = this.checkWinner(newPawns);

        // Switch to next player
        const nextPlayer: Player = state.currentPlayer === 1 ? 2 : 1;

        return {
            pawns: newPawns,
            currentPlayer: winner ? state.currentPlayer : nextPlayer,
            winner,
        };
    }

    /**
     * Checks if any player has won.
     * Player 1 wins by reaching row 0, Player 2 wins by reaching row 8.
     */
    static checkWinner(pawns: [Pawn, Pawn]): Player | null {
        // Player 1 wins by reaching the top row (row 0)
        if (pawns[0].position.row === 0) {
            return 1;
        }
        // Player 2 wins by reaching the bottom row (row 8)
        if (pawns[1].position.row === BoardConfig.GRID_SIZE - 1) {
            return 2;
        }
        return null;
    }

    /**
     * Resets the game to initial state.
     */
    static resetGame(): GameState {
        return this.getInitialState();
    }
}
