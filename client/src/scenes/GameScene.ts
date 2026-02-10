import Phaser from 'phaser';
import { BoardConfig, ColorConfig, GraphicsConfig, isDarkMode, PlayerConfig, toggleTheme, UIConfig } from '../constants';
import { GameLogic } from '../logic/GameLogic';
import { gridToWorld, gridToWorldCenter, worldToGap, worldToGrid } from '../logic/coordinates';
import { samePosition, sameGapEdge } from '../types';
import type { Direction, GapEdge, GridPosition, GameState, Player, Wall, WorldPosition } from '../types';

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

    /** Graphics object for the player status indicator. */
    private statusGraphics!: Phaser.GameObjects.Graphics;

    /** Graphics object for the wall count background. */
    private wallCountBg!: Phaser.GameObjects.Graphics;

    /** Text showing the current player's remaining wall count. */
    private wallCountText!: Phaser.GameObjects.Text;

    /** Computed button width (shared by all buttons and the status indicator). */
    private btnWidth = 0;

    /** Computed button height (shared by all buttons and the status indicator). */
    private btnHeight = 0;

    /** Stack of previous game states for undo (cleared on game reset). */
    private moveHistory: GameState[] = [];

    /** Theme button text reference (for updating label on toggle). */
    private themeButtonText!: Phaser.GameObjects.Text;

    /** All button components for theme refresh. */
    private buttons: { bg: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text; drawBg: (color: number) => void }[] = [];

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
        this.updateStatusIndicator();
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
        // Player status indicator (circle with direction triangle)
        this.statusGraphics = this.add.graphics();

        // All buttons are cell-sized squares, aligned with the board grid
        this.btnWidth = BoardConfig.CELL_SIZE;
        this.btnHeight = BoardConfig.CELL_SIZE;
        const btnY = BoardConfig.BOARD_Y - BoardConfig.CELL_SIZE - BoardConfig.GAP_SIZE;

        // Wall count indicator (next to player indicator)
        this.wallCountBg = this.add.graphics();
        this.wallCountBg.setDepth(0);
        const wallBgX = BoardConfig.BOARD_X + this.btnWidth + BoardConfig.GAP_SIZE;
        this.wallCountBg.fillStyle(ColorConfig.BUTTON_BG);
        this.wallCountBg.fillRoundedRect(wallBgX, btnY, this.btnWidth, this.btnHeight, UIConfig.BUTTON_CORNER_RADIUS);
        this.wallCountText = this.add.text(
            wallBgX + this.btnWidth / 2,
            btnY + this.btnHeight / 2,
            '',
            {
                fontSize: UIConfig.BUTTON_FONT_SIZE,
                fontFamily: UIConfig.FONT_FAMILY,
                color: ColorConfig.UI_TEXT_STR,
                align: 'center',
            }
        );
        this.wallCountText.setOrigin(0.5, 0.5);
        this.wallCountText.setDepth(1);

        // Add buttons right-to-left from the board's right edge
        const gap = BoardConfig.GAP_SIZE;
        let rightEdge = BoardConfig.BOARD_X + BoardConfig.BOARD_SIZE;
        this.createButton(rightEdge, '⏻₄', () => this.resetGame(4));
        rightEdge -= this.btnWidth + gap;
        this.createButton(rightEdge, '⏻₂', () => this.resetGame(2));
        rightEdge -= this.btnWidth + gap;
        this.createButton(rightEdge, '↺', () => this.undoMove());
        rightEdge -= this.btnWidth + gap;
        this.themeButtonText = this.createButton(rightEdge, isDarkMode() ? '☼' : '☾', () => this.handleToggleTheme());
    }

    /**
     * Creates a styled button with a rounded-rectangle background.
     * Buttons are cell-sized squares aligned with the board's top row.
     * @param rightEdge Right edge x-coordinate of the button.
     * @param label Button text label.
     * @param onClick Click handler.
     * @returns The button's text object (for label updates).
     */
    private createButton(rightEdge: number, label: string, onClick: () => void): Phaser.GameObjects.Text {
        const width = this.btnWidth;
        const height = this.btnHeight;
        const radius = UIConfig.BUTTON_CORNER_RADIUS;
        const bgX = rightEdge - width;
        const bgY = BoardConfig.BOARD_Y - BoardConfig.CELL_SIZE - BoardConfig.GAP_SIZE;
        const cx = bgX + width / 2;
        const cy = bgY + height / 2;

        // Draw rounded-rect background (behind text)
        const bg = this.add.graphics();
        bg.setDepth(0);
        const drawBg = (color: number) => {
            bg.clear();
            bg.fillStyle(color);
            bg.fillRoundedRect(bgX, bgY, width, height, radius);
        };
        drawBg(ColorConfig.BUTTON_BG);

        // Create centered text with internal padding for subscript clipping
        const text = this.add.text(cx, cy, label, {
            fontSize: UIConfig.BUTTON_FONT_SIZE,
            fontFamily: UIConfig.FONT_FAMILY,
            color: ColorConfig.UI_TEXT_STR,
            padding: { top: UIConfig.BUTTON_PADDING_Y, bottom: UIConfig.BUTTON_PADDING_Y, left: 0, right: 0 },
        });
        text.setOrigin(0.5, 0.5);
        text.setDepth(1);

        // Track button components for theme refresh
        this.buttons.push({ bg, text, drawBg });

        // Interactive hit area over the background
        const hitZone = this.add.zone(cx, cy, width, height);
        hitZone.setInteractive({ useHandCursor: true });
        hitZone.on('pointerdown', onClick);
        hitZone.on('pointerover', () => drawBg(ColorConfig.BUTTON_HOVER));
        hitZone.on('pointerout', () => drawBg(ColorConfig.BUTTON_BG));

        return text;
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
        const { x, y } = gridToWorld(pos);
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
        const topLeft0 = gridToWorld({ row: wall.row, col: wall.col });
        const topLeft1 = gridToWorld({ row: wall.row + 1, col: wall.col + 1 });

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
        const center = gridToWorldCenter(position);

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

    /** Angle offsets for each direction (radians, 0 = up). */
    private static readonly DIRECTION_ANGLES: Record<Direction, number> = {
        up: 0,
        right: Math.PI / 2,
        down: Math.PI,
        left: -Math.PI / 2,
    };

    /**
     * Draws a small triangle inside the pawn pointing to the goal direction.
     * Uses a rotation-based approach: the base triangle points up (angle 0),
     * then is rotated to match the player's goal direction.
     */
    private drawDirectionTriangle(
        g: Phaser.GameObjects.Graphics, cx: number, cy: number,
        player: Player, sizeOverride?: number
    ): void {
        const size = sizeOverride ?? GraphicsConfig.PAWN_RADIUS * 0.5;
        const angle = GameScene.DIRECTION_ANGLES[this.getGoalDirection(player)];

        // Base triangle pointing up: tip, bottom-left, bottom-right
        const basePoints = [
            { x: 0, y: -size },
            { x: -size * 0.7, y: size * 0.5 },
            { x: size * 0.7, y: size * 0.5 },
        ];

        // Rotate each point and translate to center
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const points = basePoints.map(p => ({
            x: cx + p.x * cos - p.y * sin,
            y: cy + p.x * sin + p.y * cos,
        }));

        g.fillStyle(0xffffff, 0.5);
        g.beginPath();
        g.moveTo(points[0].x, points[0].y);
        g.lineTo(points[1].x, points[1].y);
        g.lineTo(points[2].x, points[2].y);
        g.closePath();
        g.fillPath();
    }

    /** Goal directions per player in 4-player mode (also works for 2P subset). */
    private static readonly GOAL_DIRECTIONS: Direction[] = ['up', 'right', 'down', 'left'];

    /**
     * Gets the goal direction for a player.
     *
     * 2-player mode: P0 up, P1 down.
     * 4-player mode (clockwise from bottom): P0 up, P1 right, P2 down, P3 left.
     */
    private getGoalDirection(player: Player): Direction {
        if (this.gameState.playerCount === 2) {
            return player === 0 ? 'up' : 'down';
        }
        return GameScene.GOAL_DIRECTIONS[player];
    }

    /**
     * Draws highlights on valid move targets.
     */
    private drawValidMoveHighlights(): void {
        const g = this.highlightGraphics;
        g.clear();

        for (const move of this.validMoves) {
            const center = gridToWorldCenter(move);

            // Draw semi-transparent circle
            g.fillStyle(ColorConfig.VALID_MOVE, ColorConfig.VALID_MOVE_ALPHA);
            g.fillCircle(center.x, center.y, GraphicsConfig.PAWN_RADIUS * GraphicsConfig.VALID_MOVE_SIZE);

            // Draw ring outline
            g.lineStyle(GraphicsConfig.VALID_MOVE_RING_WIDTH, ColorConfig.VALID_MOVE, GraphicsConfig.VALID_MOVE_RING_ALPHA);
            g.strokeCircle(center.x, center.y, GraphicsConfig.PAWN_RADIUS * GraphicsConfig.VALID_MOVE_SIZE);
        }
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
        const gap = worldToGap(pos);
        if (gap) {
            this.handleGapClick(gap);
            return;
        }

        // --- Phase 3: Cell click (pawn selection / movement) ---
        const gridPos = worldToGrid(pos);
        if (!gridPos) {
            // Click outside board — deselect
            this.deselectPawn();
            return;
        }

        // Check if clicking on a pawn
        const clickedPlayer = this.gameState.pawns.findIndex(
            pos => samePosition(pos, gridPos)
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
        const gap = worldToGap(pos);
        if (!gap) return false;

        // Clicking the same gap again deselects wall placement
        if (this.wallFirstEdge && sameGapEdge(gap, this.wallFirstEdge)) {
            this.cancelWallPlacement();
            return true;
        }

        // For each wall option, check if this gap is part of that wall
        for (const wall of this.wallOptions) {
            if (this.isGapPartOfWall(gap, wall)) {
                // Try to place this wall
                const newState = GameLogic.placeWall(this.gameState, wall);
                if (newState) {
                    this.moveHistory.push(this.gameState);
                    this.gameState = newState;
                    this.refreshAfterStateChange();
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
            this.moveHistory.push(this.gameState);
            this.gameState = newState;
            this.refreshAfterStateChange();
        }
    }

    // =========================================================================
    // UI Update Methods
    // =========================================================================

    /**
     * Draws the player status indicator: a cell-sized rounded rect
     * with the current player's colored circle and direction triangle.
     */
    private updateStatusIndicator(): void {
        const g = this.statusGraphics;
        g.clear();

        const player = this.gameState.winner ?? this.gameState.currentPlayer;
        const width = this.btnWidth;
        const height = this.btnHeight;
        const radius = UIConfig.BUTTON_CORNER_RADIUS;
        const bgX = BoardConfig.BOARD_X;
        const bgY = BoardConfig.BOARD_Y - BoardConfig.CELL_SIZE - BoardConfig.GAP_SIZE;
        const cx = bgX + width / 2;
        const cy = bgY + height / 2;
        const { fill: fillColor, stroke: strokeColor } = this.getPlayerColors(player, false);

        // Draw button-style rounded-rect background (green when a player has won)
        const bgColor = this.gameState.winner != null
            ? ColorConfig.WINNER_BG
            : ColorConfig.BUTTON_BG;
        g.fillStyle(bgColor);
        g.fillRoundedRect(bgX, bgY, width, height, radius);

        // Draw player-colored circle inside
        const circleRadius = Math.min(width, height) * 0.35;
        g.fillStyle(fillColor);
        g.fillCircle(cx, cy, circleRadius);

        // Draw outline
        g.lineStyle(3, strokeColor);
        g.strokeCircle(cx, cy, circleRadius);

        // Draw direction triangle
        this.drawDirectionTriangle(g, cx, cy, player, circleRadius * 0.65);

        // Update wall count text
        const wallCount = this.gameState.wallCounts[player];
        this.wallCountText.setText(`${wallCount}`);
    }

    /**
     * Gets the fill and stroke colors for a player.
     */
    private getPlayerColors(player: Player, isSelected: boolean): { fill: number; stroke: number } {
        const config = PlayerConfig[player];
        return {
            fill: isSelected ? config.selectedColor : config.color,
            stroke: config.color,
        };
    }

    /**
     * Refreshes all visuals after a game state change.
     * Cancels any in-progress interactions and redraws the board.
     */
    private refreshAfterStateChange(): void {
        this.cancelWallPlacement();
        this.deselectPawn();
        this.drawWalls();
        this.drawPawns();
        this.updateStatusIndicator();
    }

    /**
     * Handles theme toggle: updates colors and refreshes all visual elements.
     */
    private handleToggleTheme(): void {
        toggleTheme();
        this.cameras.main.setBackgroundColor(ColorConfig.BOARD_BG_STR);
        document.body.style.backgroundColor = ColorConfig.BOARD_BG_STR;
        this.themeButtonText.setText(isDarkMode() ? '☼' : '☾');

        // Refresh all button backgrounds and text colors
        for (const btn of this.buttons) {
            btn.drawBg(ColorConfig.BUTTON_BG);
            btn.text.setColor(ColorConfig.UI_TEXT_STR);
        }

        // Refresh wall count indicator
        this.wallCountBg.clear();
        const wallBgX = BoardConfig.BOARD_X + this.btnWidth + BoardConfig.GAP_SIZE;
        const btnY = BoardConfig.BOARD_Y - BoardConfig.CELL_SIZE - BoardConfig.GAP_SIZE;
        this.wallCountBg.fillStyle(ColorConfig.BUTTON_BG);
        this.wallCountBg.fillRoundedRect(wallBgX, btnY, this.btnWidth, this.btnHeight, UIConfig.BUTTON_CORNER_RADIUS);
        this.wallCountText.setColor(ColorConfig.UI_TEXT_STR);

        // Redraw board and game elements
        this.drawBoard();
        this.drawWalls();
        this.drawPawns();
        this.updateStatusIndicator();
    }

    /**
     * Resets the game to initial state.
     * @param playerCount Number of players (2 or 4).
     */
    private resetGame(playerCount: 2 | 4): void {
        this.gameState = GameLogic.getInitialState(playerCount);
        this.moveHistory = [];
        this.refreshAfterStateChange();
    }

    /**
     * Undoes the last move by restoring the previous game state.
     */
    private undoMove(): void {
        if (this.moveHistory.length === 0) return;

        this.gameState = this.moveHistory.pop()!;
        this.refreshAfterStateChange();
    }
}
