import type { GridPosition, Player, PlayerCount, GameState, Pawn } from '../types';
import { BoardConfig, StartPositions2P, StartPositions4P } from '../constants';

/**
 * Pure game logic for Corridor (Quoridor).
 * Handles game state, move validation, and turn management.
 * Supports both 2-player and 4-player modes.
 */
export class GameLogic {
    /**
     * Creates the initial game state with pawns at starting positions.
     * @param playerCount Number of players (2 or 4).
     */
    static getInitialState(playerCount: PlayerCount = 2): GameState {
        let pawns: Pawn[];

        if (playerCount === 2) {
            pawns = [
                { player: 1, position: { ...StartPositions2P.PLAYER_1 } },
                { player: 2, position: { ...StartPositions2P.PLAYER_2 } },
            ];
        } else {
            pawns = [
                { player: 1, position: { ...StartPositions4P.PLAYER_1 } },
                { player: 2, position: { ...StartPositions4P.PLAYER_2 } },
                { player: 3, position: { ...StartPositions4P.PLAYER_3 } },
                { player: 4, position: { ...StartPositions4P.PLAYER_4 } },
            ];
        }

        return {
            playerCount,
            pawns,
            currentPlayer: 1,
            winner: null,
        };
    }

    /**
     * Gets the pawn for a specific player.
     */
    static getPawn(state: GameState, player: Player): Pawn | undefined {
        return state.pawns.find(p => p.player === player);
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
        if (!pawn) return [];

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

        // Create new pawns array with updated position
        const newPawns = state.pawns.map(pawn => ({
            ...pawn,
            position: { ...pawn.position }
        }));

        // Update the current player's pawn position
        const currentPawn = newPawns.find(p => p.player === state.currentPlayer);
        if (currentPawn) {
            currentPawn.position = { ...target };
        }

        // Check for win condition
        const winner = this.checkWinner(newPawns, state.playerCount);

        // Switch to next player (cycles through all players)
        const nextPlayer = this.getNextPlayer(state.currentPlayer, state.playerCount);

        return {
            playerCount: state.playerCount,
            pawns: newPawns,
            currentPlayer: winner ? state.currentPlayer : nextPlayer,
            winner,
        };
    }

    /**
     * Gets the next player in turn order.
     */
    static getNextPlayer(current: Player, playerCount: PlayerCount): Player {
        const next = (current % playerCount) + 1;
        return next as Player;
    }

    /**
     * Checks if any player has won.
     * 
     * 2-player mode:
     *   Player 1: starts bottom → wins by reaching top row (row 0)
     *   Player 2: starts top → wins by reaching bottom row (row 8)
     * 
     * 4-player mode (clockwise from bottom):
     *   Player 1: starts bottom → wins by reaching top row (row 0)
     *   Player 2: starts left → wins by reaching right column (col 8)
     *   Player 3: starts top → wins by reaching bottom row (row 8)
     *   Player 4: starts right → wins by reaching left column (col 0)
     */
    static checkWinner(pawns: Pawn[], playerCount: PlayerCount): Player | null {
        for (const pawn of pawns) {
            if (pawn.player > playerCount) continue;

            if (playerCount === 2) {
                // 2-player mode
                switch (pawn.player) {
                    case 1:
                        if (pawn.position.row === 0) return 1;
                        break;
                    case 2:
                        if (pawn.position.row === BoardConfig.GRID_SIZE - 1) return 2;
                        break;
                }
            } else {
                // 4-player mode (clockwise)
                switch (pawn.player) {
                    case 1:
                        // Player 1 (bottom) wins by reaching top row
                        if (pawn.position.row === 0) return 1;
                        break;
                    case 2:
                        // Player 2 (left) wins by reaching right column
                        if (pawn.position.col === BoardConfig.GRID_SIZE - 1) return 2;
                        break;
                    case 3:
                        // Player 3 (top) wins by reaching bottom row
                        if (pawn.position.row === BoardConfig.GRID_SIZE - 1) return 3;
                        break;
                    case 4:
                        // Player 4 (right) wins by reaching left column
                        if (pawn.position.col === 0) return 4;
                        break;
                }
            }
        }
        return null;
    }

    /**
     * Resets the game to initial state.
     * @param playerCount Number of players (2 or 4).
     */
    static resetGame(playerCount: PlayerCount = 2): GameState {
        return this.getInitialState(playerCount);
    }
}
