import type { GapEdge, GridPosition, Player, PlayerCount, GameState, Wall } from '../types';
import { BoardConfig, StartPositions2P, StartPositions4P, WallConfig } from '../constants';

/** Orthogonal directions: up, down, left, right. */
const DIRECTIONS = [
    { row: -1, col: 0 },  // up
    { row: 1, col: 0 },   // down
    { row: 0, col: -1 },  // left
    { row: 0, col: 1 },   // right
];

/**
 * Pure game logic for Corridor (Quoridor).
 * Handles game state, move validation, wall placement, and turn management.
 * Supports both 2-player and 4-player modes.
 */
export class GameLogic {

    // =========================================================================
    // Initialization
    // =========================================================================

    /**
     * Creates the initial game state with pawns at starting positions.
     * @param playerCount Number of players (2 or 4).
     */
    static getInitialState(playerCount: PlayerCount = 2): GameState {
        const startPositions = playerCount === 2 ? StartPositions2P : StartPositions4P;
        const wallsPerPlayer = playerCount === 2 ? WallConfig.WALLS_2P : WallConfig.WALLS_4P;

        return {
            playerCount,
            pawns: startPositions.map(pos => ({ ...pos })),
            walls: [],
            wallCounts: Array(playerCount).fill(wallsPerPlayer),
            currentPlayer: 0,
            winner: null,
        };
    }

    // =========================================================================
    // Pawn Queries
    // =========================================================================

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
            pos => pos.row === position.row && pos.col === position.col
        );
    }

    // =========================================================================
    // Wall Blocking
    // =========================================================================

    /**
     * Checks if a wall blocks movement between two adjacent cells.
     *
     * A horizontal wall at (wr, wc) blocks vertical movement between:
     *   [wr, wc] ↔ [wr+1, wc]  AND  [wr, wc+1] ↔ [wr+1, wc+1]
     *
     * A vertical wall at (wr, wc) blocks horizontal movement between:
     *   [wr, wc] ↔ [wr, wc+1]  AND  [wr+1, wc] ↔ [wr+1, wc+1]
     */
    static isWallBlocking(walls: Wall[], from: GridPosition, to: GridPosition): boolean {
        const dr = to.row - from.row;
        const dc = to.col - from.col;

        for (const wall of walls) {
            if (wall.orientation === 'horizontal' && dr !== 0) {
                // Horizontal wall blocks vertical movement (row change)
                // Wall at (wr, wc) blocks moving between rows wr and wr+1
                // at columns wc and wc+1.
                const crossRow = dr > 0 ? from.row : to.row; // smaller row
                if (crossRow === wall.row &&
                    (from.col === wall.col || from.col === wall.col + 1) &&
                    (to.col === wall.col || to.col === wall.col + 1)) {
                    return true;
                }
            } else if (wall.orientation === 'vertical' && dc !== 0) {
                // Vertical wall blocks horizontal movement (column change)
                // Wall at (wr, wc) blocks moving between cols wc and wc+1
                // at rows wr and wr+1.
                const crossCol = dc > 0 ? from.col : to.col; // smaller col
                if (crossCol === wall.col &&
                    (from.row === wall.row || from.row === wall.row + 1) &&
                    (to.row === wall.row || to.row === wall.row + 1)) {
                    return true;
                }
            }
        }
        return false;
    }

    // =========================================================================
    // Movement
    // =========================================================================

    /**
     * Gets valid moves for the current player's pawn.
     * Handles simple moves, wall blocking, and jumping over opponents.
     */
    static getValidMoves(state: GameState): GridPosition[] {
        const pos = state.pawns[state.currentPlayer];
        const { row, col } = pos;
        const validMoves: GridPosition[] = [];

        for (const dir of DIRECTIONS) {
            const adjacent: GridPosition = {
                row: row + dir.row,
                col: col + dir.col,
            };

            // Check bounds
            if (!this.isInBounds(adjacent)) continue;

            // Check wall blocking
            if (this.isWallBlocking(state.walls, pos, adjacent)) continue;

            // Check if occupied by another pawn (jumping logic)
            if (this.isOccupied(state, adjacent)) {
                // Try to jump straight over the opponent
                const jumpTarget: GridPosition = {
                    row: adjacent.row + dir.row,
                    col: adjacent.col + dir.col,
                };

                if (this.isInBounds(jumpTarget) &&
                    !this.isOccupied(state, jumpTarget) &&
                    !this.isWallBlocking(state.walls, adjacent, jumpTarget)) {
                    // Straight jump is valid
                    validMoves.push(jumpTarget);
                } else {
                    // Straight jump blocked — try diagonal (side) jumps
                    const sideDirs = dir.row !== 0
                        ? [{ row: 0, col: -1 }, { row: 0, col: 1 }]   // left/right
                        : [{ row: -1, col: 0 }, { row: 1, col: 0 }];  // up/down

                    for (const sideDir of sideDirs) {
                        const sideTarget: GridPosition = {
                            row: adjacent.row + sideDir.row,
                            col: adjacent.col + sideDir.col,
                        };

                        if (this.isInBounds(sideTarget) &&
                            !this.isOccupied(state, sideTarget) &&
                            !this.isWallBlocking(state.walls, adjacent, sideTarget)) {
                            validMoves.push(sideTarget);
                        }
                    }
                }
                continue;
            }

            validMoves.push(adjacent);
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
        const newPawns = state.pawns.map(pos => ({ ...pos }));
        newPawns[state.currentPlayer] = { ...target };

        // Check for win condition
        const winner = this.checkWinner(newPawns, state.playerCount);

        // Switch to next player (cycles through all players)
        const nextPlayer = this.getNextPlayer(state.currentPlayer, state.playerCount);

        return {
            playerCount: state.playerCount,
            pawns: newPawns,
            walls: state.walls,
            wallCounts: [...state.wallCounts],
            currentPlayer: winner ? state.currentPlayer : nextPlayer,
            winner,
        };
    }

    // =========================================================================
    // Wall Placement
    // =========================================================================

    /**
     * Checks if a wall placement is valid.
     * A wall is valid if:
     * 1. Current player has walls remaining.
     * 2. Wall is within bounds (row 0–7, col 0–7).
     * 3. No overlap with existing walls at the same position and orientation.
     * 4. No crossing (horizontal and vertical walls sharing the same center).
     * 5. All players still have a path to their goal after placement.
     */
    static isValidWallPlacement(state: GameState, wall: Wall): boolean {
        // 1. Check wall count
        if (state.wallCounts[state.currentPlayer] <= 0) return false;

        // 2. Check bounds (valid anchors are 0..7 for both row and col)
        const maxIdx = BoardConfig.GRID_SIZE - 2; // 7
        if (wall.row < 0 || wall.row > maxIdx ||
            wall.col < 0 || wall.col > maxIdx) {
            return false;
        }

        // 3 & 4. Check overlap and crossing in a single pass.
        // Overlap: two walls of the same orientation whose anchors differ
        //   by ≤1 along their spanning axis share at least one segment.
        // Crossing: a horizontal wall at (r,c) crosses a vertical wall at
        //   (r,c) because they share the same center point.
        for (const existing of state.walls) {
            if (existing.orientation === wall.orientation) {
                // Overlap check
                if (existing.orientation === 'horizontal') {
                    if (existing.row === wall.row &&
                        Math.abs(existing.col - wall.col) <= 1) {
                        return false;
                    }
                } else {
                    if (existing.col === wall.col &&
                        Math.abs(existing.row - wall.row) <= 1) {
                        return false;
                    }
                }
            } else {
                // Crossing check
                if (existing.row === wall.row &&
                    existing.col === wall.col) {
                    return false;
                }
            }
        }

        // 5. Pathfinding check — every player must still have a path to goal
        const testWalls = [...state.walls, wall];
        for (let p = 0; p < state.playerCount; p++) {
            if (!this.hasPath(state, p as Player, testWalls)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Places a wall for the current player.
     * Returns the new game state, or null if the placement is invalid.
     */
    static placeWall(state: GameState, wall: Wall): GameState | null {
        if (!this.isValidWallPlacement(state, wall)) {
            return null;
        }

        const newWallCounts = [...state.wallCounts];
        newWallCounts[state.currentPlayer]--;

        const nextPlayer = this.getNextPlayer(state.currentPlayer, state.playerCount);

        return {
            playerCount: state.playerCount,
            pawns: state.pawns.map(pos => ({ ...pos })),
            walls: [...state.walls, { ...wall }],
            wallCounts: newWallCounts,
            currentPlayer: nextPlayer,
            winner: null,
        };
    }

    /**
     * Gets the two possible wall placements from a clicked gap edge.
     * Returns two Wall objects representing the two possible continuations,
     * or an empty array if the edge is invalid.
     */
    static getWallOptionsFromEdge(edge: GapEdge): Wall[] {
        const dr = edge.to.row - edge.from.row;
        const dc = edge.to.col - edge.from.col;

        if (dr !== 0 && dc === 0) {
            // Vertical movement between rows → horizontal wall
            const wallRow = Math.min(edge.from.row, edge.to.row); // top cell row
            const col = edge.from.col; // same column for both

            // Wall can extend left (col-1) or right (col)
            const options: Wall[] = [];
            if (col - 1 >= 0) {
                options.push({ row: wallRow, col: col - 1, orientation: 'horizontal' });
            }
            if (col + 1 < BoardConfig.GRID_SIZE) {
                options.push({ row: wallRow, col: col, orientation: 'horizontal' });
            }
            return options;
        } else if (dc !== 0 && dr === 0) {
            // Horizontal movement between cols → vertical wall
            const wallCol = Math.min(edge.from.col, edge.to.col); // left cell col
            const row = edge.from.row; // same row for both

            // Wall can extend up (row-1) or down (row)
            const options: Wall[] = [];
            if (row - 1 >= 0) {
                options.push({ row: row - 1, col: wallCol, orientation: 'vertical' });
            }
            if (row + 1 < BoardConfig.GRID_SIZE) {
                options.push({ row: row, col: wallCol, orientation: 'vertical' });
            }
            return options;
        }

        return [];
    }

    // =========================================================================
    // Pathfinding (BFS)
    // =========================================================================

    /**
     * Checks if a player has a path from their current position to their goal.
     * Uses BFS over the grid, respecting walls.
     */
    static hasPath(state: GameState, player: Player, walls: Wall[]): boolean {
        const pos = state.pawns[player];
        const size = BoardConfig.GRID_SIZE;

        const visited = new Array<boolean>(size * size).fill(false);
        const queue: GridPosition[] = [{ ...pos }];
        visited[pos.row * size + pos.col] = true;

        let head = 0;
        while (head < queue.length) {
            const current = queue[head++];

            // Check if current position satisfies the goal
            if (this.isGoal(current, player, state.playerCount)) {
                return true;
            }

            // Explore neighbors
            for (const dir of DIRECTIONS) {
                const next: GridPosition = {
                    row: current.row + dir.row,
                    col: current.col + dir.col,
                };

                if (!this.isInBounds(next)) continue;

                const idx = next.row * size + next.col;
                if (visited[idx]) continue;

                // Check wall blocking (ignore other pawns for pathfinding)
                if (this.isWallBlocking(walls, current, next)) continue;

                visited[idx] = true;
                queue.push(next);
            }
        }

        return false;
    }

    /**
     * Checks if a position is a goal square for a given player.
     *
     * 2-player mode:
     *   P0 starts bottom → goal is top row (row 0)
     *   P1 starts top → goal is bottom row (row 8)
     *
     * 4-player mode (clockwise from bottom):
     *   P0 → row 0, P1 → col 8, P2 → row 8, P3 → col 0
     */
    private static isGoal(pos: GridPosition, player: Player, playerCount: PlayerCount): boolean {
        if (playerCount === 2) {
            switch (player) {
                case 0: return pos.row === 0;
                case 1: return pos.row === BoardConfig.GRID_SIZE - 1;
                default: return false;
            }
        } else {
            switch (player) {
                case 0: return pos.row === 0;
                case 1: return pos.col === BoardConfig.GRID_SIZE - 1;
                case 2: return pos.row === BoardConfig.GRID_SIZE - 1;
                case 3: return pos.col === 0;
            }
        }
    }

    // =========================================================================
    // Turn & Win Logic
    // =========================================================================

    /**
     * Gets the next player in turn order.
     */
    static getNextPlayer(current: Player, playerCount: PlayerCount): Player {
        return ((current + 1) % playerCount) as Player;
    }

    /**
     * Checks if any player has won.
     *
     * 2-player mode:
     *   Player 0: starts bottom → wins by reaching top row (row 0)
     *   Player 1: starts top → wins by reaching bottom row (row 8)
     *
     * 4-player mode (clockwise from bottom):
     *   Player 0: starts bottom → wins by reaching top row (row 0)
     *   Player 1: starts left → wins by reaching right column (col 8)
     *   Player 2: starts top → wins by reaching bottom row (row 8)
     *   Player 3: starts right → wins by reaching left column (col 0)
     */
    static checkWinner(pawns: GridPosition[], playerCount: PlayerCount): Player | null {
        for (let i = 0; i < playerCount; i++) {
            if (this.isGoal(pawns[i], i as Player, playerCount)) {
                return i as Player;
            }
        }
        return null;
    }
}
