import { BoardConfig } from '../constants';
import type { GapEdge, GridPosition, WorldPosition } from '../types';

/**
 * Converts grid coordinates to world (pixel) coordinates for the top-left of a cell.
 */
export function gridToWorld(pos: GridPosition): WorldPosition {
    return {
        x: BoardConfig.BOARD_X + pos.col * BoardConfig.CELL_STEP,
        y: BoardConfig.BOARD_Y + pos.row * BoardConfig.CELL_STEP,
    };
}

/**
 * Converts grid coordinates to world (pixel) coordinates for the center of a cell.
 */
export function gridToWorldCenter(pos: GridPosition): WorldPosition {
    const topLeft = gridToWorld(pos);
    return {
        x: topLeft.x + BoardConfig.CELL_SIZE / 2,
        y: topLeft.y + BoardConfig.CELL_SIZE / 2,
    };
}

/**
 * Converts world (pixel) coordinates to board-relative cell coordinates.
 * Returns null if the position is outside the board.
 */
export function worldToBoard(pos: WorldPosition): { row: number; col: number; cellX: number; cellY: number } | null {
    const boardX = pos.x - BoardConfig.BOARD_X;
    const boardY = pos.y - BoardConfig.BOARD_Y;

    if (boardX < 0 || boardY < 0 ||
        boardX >= BoardConfig.BOARD_SIZE ||
        boardY >= BoardConfig.BOARD_SIZE) {
        return null;
    }

    return {
        col: Math.floor(boardX / BoardConfig.CELL_STEP),
        row: Math.floor(boardY / BoardConfig.CELL_STEP),
        cellX: boardX % BoardConfig.CELL_STEP,
        cellY: boardY % BoardConfig.CELL_STEP,
    };
}

/**
 * Converts world (pixel) coordinates to grid coordinates.
 * Returns null if the click is outside the board or in a gap.
 */
export function worldToGrid(pos: WorldPosition): GridPosition | null {
    const board = worldToBoard(pos);
    if (!board) return null;

    // Click must be within a cell (not in the gap)
    if (board.cellX > BoardConfig.CELL_SIZE || board.cellY > BoardConfig.CELL_SIZE) {
        return null;
    }

    // Validate grid bounds
    if (board.row < 0 || board.row >= BoardConfig.GRID_SIZE ||
        board.col < 0 || board.col >= BoardConfig.GRID_SIZE) {
        return null;
    }

    return { row: board.row, col: board.col };
}

/**
 * Converts world (pixel) coordinates to a gap edge between two adjacent cells.
 * Returns null if the click is not in a gap or is in a corner intersection.
 *
 * We detect clicks in the gap regions between cells:
 *   - Horizontal gap (between rows): cellY > CELL_SIZE in a cell step
 *   - Vertical gap (between columns): cellX > CELL_SIZE in a cell step
 *   - Corner intersection (both): ignored (shared by 4 cells)
 */
export function worldToGap(pos: WorldPosition): GapEdge | null {
    const board = worldToBoard(pos);
    if (!board) return null;

    const inHGap = board.cellY > BoardConfig.CELL_SIZE;
    const inVGap = board.cellX > BoardConfig.CELL_SIZE;

    if (!inHGap && !inVGap) return null; // Inside a cell
    if (inHGap && inVGap) return null;    // Corner intersection (shared by 4 cells)

    if (inHGap) {
        // Horizontal gap between row and row+1
        if (board.row + 1 < BoardConfig.GRID_SIZE) {
            return { from: { row: board.row, col: board.col }, to: { row: board.row + 1, col: board.col } };
        }
    } else {
        // Vertical gap between col and col+1
        if (board.col + 1 < BoardConfig.GRID_SIZE) {
            return { from: { row: board.row, col: board.col }, to: { row: board.row, col: board.col + 1 } };
        }
    }

    return null;
}
