import { BoardConfig } from './constants';
import type { GapEdge, GridPosition, WorldPosition } from './types';

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
function worldToBoard(pos: WorldPosition): { row: number; col: number; cellX: number; cellY: number } | null {
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
 * Returns null if the click is outside the board or in a gap hit zone.
 */
export function worldToGrid(pos: WorldPosition): GridPosition | null {
    const board = worldToBoard(pos);
    if (!board) return null;

    // Click must be within the cell hit zone (between LOW and HIGH boundaries)
    if (board.cellX < BoardConfig.HIT_BOUNDARY_LOW || board.cellX > BoardConfig.HIT_BOUNDARY_HIGH ||
        board.cellY < BoardConfig.HIT_BOUNDARY_LOW || board.cellY > BoardConfig.HIT_BOUNDARY_HIGH) {
        return null;
    }

    return { row: board.row, col: board.col };
}

/**
 * Converts world (pixel) coordinates to a gap edge between two adjacent cells.
 * Returns null if the click is not in a gap or is in a corner intersection.
 *
 * The gap hit zone is centered on the physical gap and leaks equally into
 * both adjacent squares. Within a cell step:
 *   - cellLocal < HIT_BOUNDARY_LOW → belongs to the gap from the previous cell
 *   - cellLocal > HIT_BOUNDARY_HIGH → belongs to the gap after the current cell
 *   - Corner intersection (both axes in gap zone): ignored
 */
export function worldToGap(pos: WorldPosition): GapEdge | null {
    const board = worldToBoard(pos);
    if (!board) return null;

    const inHGapAbove = board.cellY < BoardConfig.HIT_BOUNDARY_LOW;
    const inHGapBelow = board.cellY > BoardConfig.HIT_BOUNDARY_HIGH;
    const inVGapLeft = board.cellX < BoardConfig.HIT_BOUNDARY_LOW;
    const inVGapRight = board.cellX > BoardConfig.HIT_BOUNDARY_HIGH;

    const inHGap = inHGapAbove || inHGapBelow;
    const inVGap = inVGapLeft || inVGapRight;

    if (!inHGap && !inVGap) return null; // Inside a cell
    if (inHGap && inVGap) return null;   // Corner intersection

    if (inHGap) {
        if (inHGapBelow) {
            // Gap between row and row+1
            if (board.row + 1 < BoardConfig.GRID_SIZE) {
                return { from: { row: board.row, col: board.col }, to: { row: board.row + 1, col: board.col } };
            }
        } else {
            // Gap between row-1 and row (hit zone leaks into current cell from above)
            if (board.row > 0) {
                return { from: { row: board.row - 1, col: board.col }, to: { row: board.row, col: board.col } };
            }
        }
    } else {
        if (inVGapRight) {
            // Gap between col and col+1
            if (board.col + 1 < BoardConfig.GRID_SIZE) {
                return { from: { row: board.row, col: board.col }, to: { row: board.row, col: board.col + 1 } };
            }
        } else {
            // Gap between col-1 and col (hit zone leaks into current cell from left)
            if (board.col > 0) {
                return { from: { row: board.row, col: board.col - 1 }, to: { row: board.row, col: board.col } };
            }
        }
    }

    return null;
}
