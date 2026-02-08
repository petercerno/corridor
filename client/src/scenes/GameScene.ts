import Phaser from 'phaser';
import { BoardConfig, ColorConfig, GraphicsConfig, UIConfig } from '../constants';
import { GameLogic } from '../logic/GameLogic';
import type { GapEdge, GridPosition, GameState, Player, Wall } from '../types';

/**
 * Represents a position in world (pixel) coordinates.
 */
interface WorldPosition {
    x: number;
    y: number;
}

/**
 * Main game scene for Corridor.
 * Manages the game board, pawn rendering, wall placement, and player input.
 */
export default class GameScene extends Phaser.Scene {
    /** Current game state. */
    private gameState!: GameState;

    /** Graphics object for the board. */
    private boardGraphics!: Phaser.GameObjects.Graphics;

    /** Graphics object for placed walls. */
    private wallGraphics!: Phaser.GameObjects.Graphics;

    /** Graphics object for wall placement previews. */
    private wallPreviewGraphics!: Phaser.GameObjects.Graphics;

    /** Graphics object for pawns. */
    private pawnGraphics!: Phaser.GameObjects.Graphics;

    /** Graphics object for valid move highlights. */
    private highlightGraphics!: Phaser.GameObjects.Graphics;

    /** Currently selected pawn's player, or null if none selected. */
    private selectedPlayer: Player | null = null;

    /** Valid moves for the selected pawn. */
    private validMoves: GridPosition[] = [];

    /** Status text showing current player. */
    private statusText!: Phaser.GameObjects.Text;

    // --- Wall placement state ---

    /** The first gap edge selected during wall placement. */
    private wallFirstEdge: GapEdge | null = null;

    /** The two candidate wall placements after clicking the first gap. */
    private wallOptions: Wall[] = [];

    constructor() {
        super({ key: 'GameScene' });
    }

    // =========================================================================
    // Phaser Lifecycle Methods
    // =========================================================================

    /**
     * Called when the scene is created.
     * Initializes game state, graphics, and input handling.
     */
    create(): void {
        this.gameState = GameLogic.getInitialState();

        this.setupGraphics();
        this.setupUI();
        this.setupInput();

        this.drawBoard();
        this.drawWalls();
        this.drawPawns();
        this.updateStatusText();
    }

    // =========================================================================
    // Setup Methods
    // =========================================================================

    /**
     * Creates graphics objects for rendering.
     * Order determines z-layering: board → walls → highlights/previews → pawns.
     */
    private setupGraphics(): void {
        this.boardGraphics = this.add.graphics();
        this.wallGraphics = this.add.graphics();
        this.wallPreviewGraphics = this.add.graphics();
        this.highlightGraphics = this.add.graphics();
        this.pawnGraphics = this.add.graphics();
    }

    /**
     * Creates UI elements.
     */
    private setupUI(): void {
        // Status text showing current player
        this.statusText = this.add.text(
            BoardConfig.CANVAS_WIDTH / 2,
            BoardConfig.MARGIN / 2 + UIConfig.UI_VERTICAL_OFFSET,
            '',
            {
                fontSize: UIConfig.STATUS_FONT_SIZE,
                fontFamily: UIConfig.FONT_FAMILY,
                color: ColorConfig.UI_TEXT_STR,
            }
        );
        this.statusText.setOrigin(0.5, 0.5);

        // Add reset buttons (4-player rightmost, 2-player to its left)
        const reset4Btn = this.createResetButton(
            BoardConfig.CANVAS_WIDTH - BoardConfig.MARGIN, '⏻₄', 4
        );
        this.createResetButton(
            reset4Btn.x - reset4Btn.width - UIConfig.BUTTON_PADDING_X, '⏻₂', 2
        );
    }

    /**
     * Creates a reset button at the given x position.
     */
    private createResetButton(x: number, label: string, playerCount: 2 | 4): Phaser.GameObjects.Text {
        const btn = this.add.text(
            x,
            BoardConfig.MARGIN / 2 + UIConfig.UI_VERTICAL_OFFSET,
            label,
            {
                fontSize: UIConfig.BUTTON_FONT_SIZE,
                fontFamily: UIConfig.FONT_FAMILY,
                color: ColorConfig.UI_TEXT_STR,
                backgroundColor: ColorConfig.BUTTON_BG_STR,
                padding: { x: UIConfig.BUTTON_PADDING_X, y: UIConfig.BUTTON_PADDING_Y },
            }
        );
        btn.setOrigin(1, 0.5);
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => this.resetGame(playerCount));
        btn.on('pointerover', () => btn.setStyle({ backgroundColor: ColorConfig.BUTTON_HOVER_STR }));
        btn.on('pointerout', () => btn.setStyle({ backgroundColor: ColorConfig.BUTTON_BG_STR }));
        return btn;
    }

    /**
     * Sets up input handling for board clicks.
     */
    private setupInput(): void {
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.handleClick({ x: pointer.x, y: pointer.y });
        });
    }

    // =========================================================================
    // Drawing Methods
    // =========================================================================

    /**
     * Draws the game board with wooden squares and gaps.
     */
    private drawBoard(): void {
        const g = this.boardGraphics;
        g.clear();

        // Draw board background (gap color)
        g.fillStyle(ColorConfig.GAP_COLOR);
        g.fillRect(
            BoardConfig.BOARD_X,
            BoardConfig.BOARD_Y,
            BoardConfig.BOARD_SIZE,
            BoardConfig.BOARD_SIZE
        );

        // Draw squares
        for (let row = 0; row < BoardConfig.GRID_SIZE; row++) {
            for (let col = 0; col < BoardConfig.GRID_SIZE; col++) {
                this.drawSquare({ row, col });
            }
        }
    }

    /**
     * Draws a single square at the given grid position.
     */
    private drawSquare(pos: GridPosition): void {
        const g = this.boardGraphics;
        const { x, y } = this.gridToWorld(pos);
        const size = BoardConfig.CELL_SIZE;
        const radius = GraphicsConfig.SQUARE_CORNER_RADIUS;
        const shadowOffset = GraphicsConfig.SQUARE_SHADOW_OFFSET;

        // Alternate colors for checkerboard pattern (subtle)
        const isLight = (pos.row + pos.col) % 2 === 0;
        const fillColor = isLight ? ColorConfig.SQUARE_LIGHT : ColorConfig.SQUARE_DARK;

        // Draw shadow (bottom-right offset)
        g.fillStyle(ColorConfig.SQUARE_BORDER, 0.5);
        g.fillRoundedRect(
            x + shadowOffset,
            y + shadowOffset,
            size,
            size,
            radius
        );

        // Draw main square
        g.fillStyle(fillColor);
        g.fillRoundedRect(x, y, size, size, radius);

        // Draw subtle highlight on top-left edge
        g.lineStyle(GraphicsConfig.SQUARE_HIGHLIGHT_WIDTH, 0xffffff, GraphicsConfig.SQUARE_HIGHLIGHT_ALPHA);
        g.beginPath();
        g.moveTo(x + radius, y);
        g.lineTo(x + size - radius, y);
        g.stroke();
    }

    /**
     * Draws all placed walls on the board.
     */
    private drawWalls(): void {
        const g = this.wallGraphics;
        g.clear();

        for (const wall of this.gameState.walls) {
            this.drawWall(g, wall, ColorConfig.WALL_COLOR, 1.0);
        }
    }

    /**
     * Draws a single wall as a rounded rectangle spanning two cells + gap.
     *
     * A wall at anchor (row, col):
     *   Horizontal: sits on the horizontal gap between rows `row` and `row+1`,
     *     spanning columns `col` and `col+1`.
     *   Vertical: sits on the vertical gap between columns `col` and `col+1`,
     *     spanning rows `row` and `row+1`.
     */
    private drawWall(g: Phaser.GameObjects.Graphics, wall: Wall, color: number, alpha: number): void {
        const thickness = GraphicsConfig.WALL_THICKNESS;
        const cornerRadius = GraphicsConfig.WALL_CORNER_RADIUS;

        // Top-left corners of the anchor cell and the diagonally opposite cell
        const topLeft0 = this.gridToWorld({ row: wall.row, col: wall.col });
        const topLeft1 = this.gridToWorld({ row: wall.row + 1, col: wall.col + 1 });

        let x: number, y: number, w: number, h: number;

        if (wall.orientation === 'horizontal') {
            // Horizontal wall: between row and row+1
            // Spans from column `col` left edge to column `col+1` right edge
            x = topLeft0.x;
            y = topLeft0.y + BoardConfig.CELL_SIZE + (BoardConfig.GAP_SIZE - thickness) / 2;
            w = topLeft1.x + BoardConfig.CELL_SIZE - topLeft0.x;
            h = thickness;
        } else {
            // Vertical wall: between col and col+1
            // Spans from row `row` top edge to row `row+1` bottom edge
            x = topLeft0.x + BoardConfig.CELL_SIZE + (BoardConfig.GAP_SIZE - thickness) / 2;
            y = topLeft0.y;
            w = thickness;
            h = topLeft1.y + BoardConfig.CELL_SIZE - topLeft0.y;
        }

        // Draw shadow
        g.fillStyle(0x000000, 0.3 * alpha);
        g.fillRoundedRect(x + 2, y + 2, w, h, cornerRadius);

        // Draw wall body
        g.fillStyle(color, alpha);
        g.fillRoundedRect(x, y, w, h, cornerRadius);

        // Draw highlight line on top
        g.lineStyle(1, 0xffffff, 0.3 * alpha);
        if (wall.orientation === 'horizontal') {
            g.beginPath();
            g.moveTo(x + cornerRadius, y);
            g.lineTo(x + w - cornerRadius, y);
            g.stroke();
        } else {
            g.beginPath();
            g.moveTo(x, y + cornerRadius);
            g.lineTo(x, y + h - cornerRadius);
            g.stroke();
        }
    }

    /**
     * Draws wall placement previews for the current wall options.
     */
    private drawWallPreviews(): void {
        const g = this.wallPreviewGraphics;
        g.clear();

        for (const wall of this.wallOptions) {
            const isValid = GameLogic.isValidWallPlacement(this.gameState, wall);
            const color = isValid ? ColorConfig.WALL_PREVIEW : ColorConfig.WALL_INVALID;
            const alpha = isValid ? ColorConfig.WALL_PREVIEW_ALPHA : ColorConfig.WALL_INVALID_ALPHA;
            this.drawWall(g, wall, color, alpha);
        }
    }

    /**
     * Draws all pawns on the board.
     */
    private drawPawns(): void {
        const g = this.pawnGraphics;
        g.clear();

        this.gameState.pawns.forEach((pos, player) => {
            this.drawPawn(
                pos,
                player as Player,
                this.selectedPlayer === player
            );
        });
    }

    /**
     * Draws a single pawn at the given position.
     */
    private drawPawn(position: GridPosition, player: Player, isSelected: boolean): void {
        const g = this.pawnGraphics;
        const center = this.gridToWorldCenter(position);

        // Get colors based on player and selection state
        const { fill: fillColor, stroke: strokeColor } = this.getPlayerColors(player, isSelected);
        const strokeWidth = isSelected
            ? GraphicsConfig.PAWN_SELECTED_STROKE_WIDTH
            : GraphicsConfig.PAWN_STROKE_WIDTH;

        // Draw selection glow if selected
        if (isSelected) {
            g.fillStyle(fillColor, 0.3);
            g.fillCircle(center.x, center.y, GraphicsConfig.PAWN_RADIUS + GraphicsConfig.PAWN_GLOW_RADIUS_OFFSET);
        }

        // Draw pawn shadow
        g.fillStyle(0x000000, GraphicsConfig.PAWN_SHADOW_ALPHA);
        g.fillCircle(center.x + GraphicsConfig.PAWN_SHADOW_OFFSET, center.y + GraphicsConfig.PAWN_SHADOW_OFFSET, GraphicsConfig.PAWN_RADIUS);

        // Draw pawn body
        g.fillStyle(fillColor);
        g.fillCircle(center.x, center.y, GraphicsConfig.PAWN_RADIUS);

        // Draw pawn outline
        g.lineStyle(strokeWidth, strokeColor);
        g.strokeCircle(center.x, center.y, GraphicsConfig.PAWN_RADIUS);

        // Draw direction triangle
        this.drawDirectionTriangle(g, center.x, center.y, player);
    }

    /**
     * Draws a small triangle inside the pawn pointing to the goal direction.
     */
    private drawDirectionTriangle(g: Phaser.GameObjects.Graphics, cx: number, cy: number, player: Player): void {
        const size = GraphicsConfig.PAWN_RADIUS * 0.5;
        const direction = this.getGoalDirection(player);

        // Calculate triangle points based on direction
        let points: WorldPosition[];

        switch (direction) {
            case 'up':
                points = [
                    { x: cx, y: cy - size },           // tip
                    { x: cx - size * 0.7, y: cy + size * 0.5 },  // bottom left
                    { x: cx + size * 0.7, y: cy + size * 0.5 },  // bottom right
                ];
                break;
            case 'down':
                points = [
                    { x: cx, y: cy + size },           // tip
                    { x: cx - size * 0.7, y: cy - size * 0.5 },  // top left
                    { x: cx + size * 0.7, y: cy - size * 0.5 },  // top right
                ];
                break;
            case 'left':
                points = [
                    { x: cx - size, y: cy },           // tip
                    { x: cx + size * 0.5, y: cy - size * 0.7 },  // top right
                    { x: cx + size * 0.5, y: cy + size * 0.7 },  // bottom right
                ];
                break;
            case 'right':
                points = [
                    { x: cx + size, y: cy },           // tip
                    { x: cx - size * 0.5, y: cy - size * 0.7 },  // top left
                    { x: cx - size * 0.5, y: cy + size * 0.7 },  // bottom left
                ];
                break;
        }

        // Draw the triangle
        g.fillStyle(0xffffff, 0.5);
        g.beginPath();
        g.moveTo(points[0].x, points[0].y);
        g.lineTo(points[1].x, points[1].y);
        g.lineTo(points[2].x, points[2].y);
        g.closePath();
        g.fillPath();
    }

    /**
     * Gets the goal direction for a player.
     *
     * 2-player mode: P0 up, P1 down.
     * 4-player mode (clockwise from bottom): P0 up, P1 right, P2 down, P3 left.
     */
    private getGoalDirection(player: Player): 'up' | 'down' | 'left' | 'right' {
        if (this.gameState.playerCount === 2) {
            return player === 0 ? 'up' : 'down';
        }
        switch (player) {
            case 0: return 'up';
            case 1: return 'right';
            case 2: return 'down';
            case 3: return 'left';
        }
    }

    /**
     * Draws highlights on valid move targets.
     */
    private drawValidMoveHighlights(): void {
        const g = this.highlightGraphics;
        g.clear();

        for (const move of this.validMoves) {
            const center = this.gridToWorldCenter(move);

            // Draw semi-transparent circle
            g.fillStyle(ColorConfig.VALID_MOVE, ColorConfig.VALID_MOVE_ALPHA);
            g.fillCircle(center.x, center.y, GraphicsConfig.PAWN_RADIUS * GraphicsConfig.VALID_MOVE_SIZE);

            // Draw ring outline
            g.lineStyle(GraphicsConfig.VALID_MOVE_RING_WIDTH, ColorConfig.VALID_MOVE, GraphicsConfig.VALID_MOVE_RING_ALPHA);
            g.strokeCircle(center.x, center.y, GraphicsConfig.PAWN_RADIUS * GraphicsConfig.VALID_MOVE_SIZE);
        }
    }

    // =========================================================================
    // Coordinate Conversion Methods
    // =========================================================================

    /**
     * Converts grid coordinates to world (pixel) coordinates for the top-left of a cell.
     */
    private gridToWorld(pos: GridPosition): WorldPosition {
        return {
            x: BoardConfig.BOARD_X + pos.col * BoardConfig.CELL_STEP,
            y: BoardConfig.BOARD_Y + pos.row * BoardConfig.CELL_STEP,
        };
    }

    /**
     * Converts grid coordinates to world (pixel) coordinates for the center of a cell.
     */
    private gridToWorldCenter(pos: GridPosition): WorldPosition {
        const topLeft = this.gridToWorld(pos);
        return {
            x: topLeft.x + BoardConfig.CELL_SIZE / 2,
            y: topLeft.y + BoardConfig.CELL_SIZE / 2,
        };
    }

    /**
     * Converts world (pixel) coordinates to grid coordinates.
     * Returns null if the click is outside the board or in a gap.
     */
    private worldToGrid(pos: WorldPosition): GridPosition | null {
        // Check if within board bounds
        const boardX = pos.x - BoardConfig.BOARD_X;
        const boardY = pos.y - BoardConfig.BOARD_Y;

        if (boardX < 0 || boardY < 0 ||
            boardX >= BoardConfig.BOARD_SIZE ||
            boardY >= BoardConfig.BOARD_SIZE) {
            return null;
        }

        // Calculate grid position
        const col = Math.floor(boardX / BoardConfig.CELL_STEP);
        const row = Math.floor(boardY / BoardConfig.CELL_STEP);

        // Check if click is within a cell (not in the gap)
        const cellX = boardX % BoardConfig.CELL_STEP;
        const cellY = boardY % BoardConfig.CELL_STEP;

        if (cellX > BoardConfig.CELL_SIZE || cellY > BoardConfig.CELL_SIZE) {
            return null; // Click is in the gap
        }

        // Validate grid bounds
        if (row < 0 || row >= BoardConfig.GRID_SIZE ||
            col < 0 || col >= BoardConfig.GRID_SIZE) {
            return null;
        }

        return { row, col };
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
    private worldToGap(pos: WorldPosition): GapEdge | null {
        const boardX = pos.x - BoardConfig.BOARD_X;
        const boardY = pos.y - BoardConfig.BOARD_Y;

        if (boardX < 0 || boardY < 0 ||
            boardX >= BoardConfig.BOARD_SIZE ||
            boardY >= BoardConfig.BOARD_SIZE) {
            return null;
        }

        const col = Math.floor(boardX / BoardConfig.CELL_STEP);
        const row = Math.floor(boardY / BoardConfig.CELL_STEP);
        const cellX = boardX % BoardConfig.CELL_STEP;
        const cellY = boardY % BoardConfig.CELL_STEP;

        const inHGap = cellY > BoardConfig.CELL_SIZE;
        const inVGap = cellX > BoardConfig.CELL_SIZE;

        if (!inHGap && !inVGap) return null; // Inside a cell
        if (inHGap && inVGap) return null;    // Corner intersection (shared by 4 cells)

        if (inHGap) {
            // Horizontal gap between row and row+1
            if (row + 1 < BoardConfig.GRID_SIZE) {
                return { from: { row, col }, to: { row: row + 1, col } };
            }
        } else {
            // Vertical gap between col and col+1
            if (col + 1 < BoardConfig.GRID_SIZE) {
                return { from: { row, col }, to: { row, col: col + 1 } };
            }
        }

        return null;
    }

    // =========================================================================
    // Input Handling Methods
    // =========================================================================

    /**
     * Handles a click on the game board.
     */
    private handleClick(pos: WorldPosition): void {
        // Ignore clicks if game is over
        if (this.gameState.winner) {
            return;
        }

        // --- Phase 1: Wall placement second click ---
        // If we're in wall placement mode (first gap already selected),
        // check if this click finalizes a wall placement.
        if (this.wallFirstEdge !== null) {
            if (this.handleWallSecondClick(pos)) return;
            // Click didn't land on a valid preview — cancel wall placement
            this.cancelWallPlacement();
            // Fall through to handle as a normal click
        }

        // --- Phase 2: Check for gap click (start wall placement) ---
        const gap = this.worldToGap(pos);
        if (gap) {
            this.handleGapClick(gap);
            return;
        }

        // --- Phase 3: Cell click (pawn selection / movement) ---
        const gridPos = this.worldToGrid(pos);
        if (!gridPos) {
            // Click outside board — deselect
            this.deselectPawn();
            return;
        }

        // Check if clicking on a pawn
        const clickedPlayer = this.gameState.pawns.findIndex(
            pos => pos.row === gridPos.row && pos.col === gridPos.col
        );

        if (clickedPlayer >= 0) {
            if (clickedPlayer === this.gameState.currentPlayer) {
                this.selectPawn(clickedPlayer as Player);
            } else {
                this.deselectPawn();
            }
        } else if (this.selectedPlayer !== null) {
            this.tryMove(gridPos);
        }
    }

    /**
     * Handles a click on a gap between two cells.
     * Starts wall placement mode by showing the two possible wall options.
     */
    private handleGapClick(gap: GapEdge): void {
        // Must have walls remaining
        if (this.gameState.wallCounts[this.gameState.currentPlayer] <= 0) return;

        this.deselectPawn();

        this.wallFirstEdge = gap;
        this.wallOptions = GameLogic.getWallOptionsFromEdge(gap);

        this.drawWallPreviews();
    }

    /**
     * Handles the second click during wall placement.
     * Checks if the click maps to one of the wall options and places it.
     * Returns true if the click was consumed (placed wall or clicked another gap preview).
     */
    private handleWallSecondClick(pos: WorldPosition): boolean {
        // Check if clicking on a gap that corresponds to one of the wall options
        const gap = this.worldToGap(pos);
        if (!gap) return false;

        // Clicking the same gap again deselects wall placement
        if (this.wallFirstEdge &&
            gap.from.row === this.wallFirstEdge.from.row &&
            gap.from.col === this.wallFirstEdge.from.col &&
            gap.to.row === this.wallFirstEdge.to.row &&
            gap.to.col === this.wallFirstEdge.to.col) {
            this.cancelWallPlacement();
            return true;
        }

        // For each wall option, check if this gap is part of that wall
        for (const wall of this.wallOptions) {
            if (this.isGapPartOfWall(gap, wall)) {
                // Try to place this wall
                const newState = GameLogic.placeWall(this.gameState, wall);
                if (newState) {
                    this.gameState = newState;
                    this.cancelWallPlacement();
                    this.drawWalls();
                    this.drawPawns();
                    this.updateStatusText();
                    return true;
                }
            }
        }

        // The gap click might start a new wall placement instead
        return false;
    }

    /**
     * Checks if a gap edge is part of a given wall.
     */
    private isGapPartOfWall(gap: GapEdge, wall: Wall): boolean {
        const dr = gap.to.row - gap.from.row;
        const dc = gap.to.col - gap.from.col;

        if (wall.orientation === 'horizontal' && dr !== 0) {
            // Gap is between rows (vertical movement) — matches horizontal wall
            const gapRow = Math.min(gap.from.row, gap.to.row);
            const gapCol = gap.from.col;  // same column
            return gapRow === wall.row && (gapCol === wall.col || gapCol === wall.col + 1);
        } else if (wall.orientation === 'vertical' && dc !== 0) {
            // Gap is between columns (horizontal movement) — matches vertical wall
            const gapCol = Math.min(gap.from.col, gap.to.col);
            const gapRow = gap.from.row;  // same row
            return gapCol === wall.col && (gapRow === wall.row || gapRow === wall.row + 1);
        }
        return false;
    }

    /**
     * Cancels wall placement mode and clears previews.
     */
    private cancelWallPlacement(): void {
        this.wallFirstEdge = null;
        this.wallOptions = [];
        this.wallPreviewGraphics.clear();
    }

    /**
     * Selects a pawn and shows valid moves.
     */
    private selectPawn(player: Player): void {
        this.cancelWallPlacement();
        this.selectedPlayer = player;
        this.validMoves = GameLogic.getValidMoves(this.gameState);
        this.drawPawns();
        this.drawValidMoveHighlights();
    }

    /**
     * Deselects the currently selected pawn.
     */
    private deselectPawn(): void {
        if (this.selectedPlayer !== null) {
            this.selectedPlayer = null;
            this.validMoves = [];
            this.highlightGraphics.clear();
            this.drawPawns();
        }
    }

    /**
     * Attempts to move the selected pawn to the target position.
     */
    private tryMove(target: GridPosition): void {
        const newState = GameLogic.makeMove(this.gameState, target);

        if (newState) {
            this.gameState = newState;
            this.deselectPawn();
            this.drawPawns();
            this.updateStatusText();
        }
    }

    // =========================================================================
    // UI Update Methods
    // =========================================================================

    /**
     * Updates the status text to show current player and wall count.
     */
    private updateStatusText(): void {
        if (this.gameState.winner !== null) {
            this.statusText.setText(`🎉 Player ${this.gameState.winner + 1} Wins!`);
        } else {
            const player = this.gameState.currentPlayer;
            const playerEmoji = this.getPlayerEmoji(player);
            const wallCount = this.gameState.wallCounts[player];
            this.statusText.setText(`${playerEmoji} Player ${player + 1} 🧱×${wallCount}`);
        }
    }

    /**
     * Gets the emoji for a player.
     */
    private getPlayerEmoji(player: Player): string {
        switch (player) {
            case 0: return '🔴';
            case 1: return '🔵';
            case 2: return '🟢';
            case 3: return '🟠';
        }
    }

    /** Base and selected fill colors per player (index = player). */
    private static readonly PLAYER_COLORS: { base: number; selected: number }[] = [
        { base: ColorConfig.PLAYER_1, selected: ColorConfig.PLAYER_1_SELECTED },
        { base: ColorConfig.PLAYER_2, selected: ColorConfig.PLAYER_2_SELECTED },
        { base: ColorConfig.PLAYER_3, selected: ColorConfig.PLAYER_3_SELECTED },
        { base: ColorConfig.PLAYER_4, selected: ColorConfig.PLAYER_4_SELECTED },
    ];

    /**
     * Gets the fill and stroke colors for a player.
     */
    private getPlayerColors(player: Player, isSelected: boolean): { fill: number; stroke: number } {
        const colors = GameScene.PLAYER_COLORS[player];
        return {
            fill: isSelected ? colors.selected : colors.base,
            stroke: colors.base,
        };
    }

    /**
     * Resets the game to initial state.
     * @param playerCount Number of players (2 or 4).
     */
    private resetGame(playerCount: 2 | 4): void {
        this.gameState = GameLogic.getInitialState(playerCount);
        this.cancelWallPlacement();
        this.deselectPawn();
        this.drawWalls();
        this.drawPawns();
        this.updateStatusText();
    }
}
