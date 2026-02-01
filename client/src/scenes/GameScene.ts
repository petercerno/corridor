import Phaser from 'phaser';
import { BoardConfig, ColorConfig, GraphicsConfig, UIConfig } from '../constants';
import { GameLogic } from '../logic/GameLogic';
import type { GridPosition, GameState, Player } from '../types';

/**
 * Main game scene for Corridor.
 * Manages the game board, pawn rendering, and player input.
 */
export default class GameScene extends Phaser.Scene {
    /** Current game state. */
    private gameState!: GameState;

    /** Graphics object for the board. */
    private boardGraphics!: Phaser.GameObjects.Graphics;

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
        this.drawPawns();
        this.updateStatusText();
    }

    // =========================================================================
    // Setup Methods
    // =========================================================================

    /**
     * Creates graphics objects for rendering.
     */
    private setupGraphics(): void {
        this.boardGraphics = this.add.graphics();
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

        // Add reset button for 4 players (rightmost)
        const reset4Btn = this.add.text(
            BoardConfig.CANVAS_WIDTH - BoardConfig.MARGIN,
            BoardConfig.MARGIN / 2 + UIConfig.UI_VERTICAL_OFFSET,
            '⏻₄',
            {
                fontSize: UIConfig.BUTTON_FONT_SIZE,
                fontFamily: UIConfig.FONT_FAMILY,
                color: ColorConfig.UI_TEXT_STR,
                backgroundColor: ColorConfig.BUTTON_BG_STR,
                padding: { x: UIConfig.BUTTON_PADDING_X, y: UIConfig.BUTTON_PADDING_Y },
            }
        );
        reset4Btn.setOrigin(1, 0.5);
        reset4Btn.setInteractive({ useHandCursor: true });
        reset4Btn.on('pointerdown', () => this.resetGame(4));
        reset4Btn.on('pointerover', () => reset4Btn.setStyle({ backgroundColor: ColorConfig.BUTTON_HOVER_STR }));
        reset4Btn.on('pointerout', () => reset4Btn.setStyle({ backgroundColor: ColorConfig.BUTTON_BG_STR }));

        // Add reset button for 2 players (left of 4-player button)
        const reset2Btn = this.add.text(
            reset4Btn.x - reset4Btn.width - UIConfig.BUTTON_PADDING_X,
            BoardConfig.MARGIN / 2 + UIConfig.UI_VERTICAL_OFFSET,
            '⏻₂',
            {
                fontSize: UIConfig.BUTTON_FONT_SIZE,
                fontFamily: UIConfig.FONT_FAMILY,
                color: ColorConfig.UI_TEXT_STR,
                backgroundColor: ColorConfig.BUTTON_BG_STR,
                padding: { x: UIConfig.BUTTON_PADDING_X, y: UIConfig.BUTTON_PADDING_Y },
            }
        );
        reset2Btn.setOrigin(1, 0.5);
        reset2Btn.setInteractive({ useHandCursor: true });
        reset2Btn.on('pointerdown', () => this.resetGame(2));
        reset2Btn.on('pointerover', () => reset2Btn.setStyle({ backgroundColor: ColorConfig.BUTTON_HOVER_STR }));
        reset2Btn.on('pointerout', () => reset2Btn.setStyle({ backgroundColor: ColorConfig.BUTTON_BG_STR }));
    }

    /**
     * Sets up input handling for board clicks.
     */
    private setupInput(): void {
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.handleClick(pointer.x, pointer.y);
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
                this.drawSquare(row, col);
            }
        }
    }

    /**
     * Draws a single square at the given grid position.
     */
    private drawSquare(row: number, col: number): void {
        const g = this.boardGraphics;
        const { x, y } = this.gridToWorld(row, col);
        const size = BoardConfig.CELL_SIZE;
        const radius = GraphicsConfig.SQUARE_CORNER_RADIUS;
        const shadowOffset = GraphicsConfig.SQUARE_SHADOW_OFFSET;

        // Alternate colors for checkerboard pattern (subtle)
        const isLight = (row + col) % 2 === 0;
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
     * Draws all pawns on the board.
     */
    private drawPawns(): void {
        const g = this.pawnGraphics;
        g.clear();

        for (const pawn of this.gameState.pawns) {
            this.drawPawn(
                pawn.position,
                pawn.player,
                this.selectedPlayer === pawn.player
            );
        }
    }

    /**
     * Draws a single pawn at the given position.
     */
    private drawPawn(position: GridPosition, player: Player, isSelected: boolean): void {
        const g = this.pawnGraphics;
        const center = this.gridToWorldCenter(position.row, position.col);

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
        let points: { x: number; y: number }[];

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
     * Gets the goal direction for a player based on the current game mode.
     */
    private getGoalDirection(player: Player): 'up' | 'down' | 'left' | 'right' {
        if (this.gameState.playerCount === 2) {
            // 2-player mode: P1 goes up, P2 goes down
            return player === 1 ? 'up' : 'down';
        } else {
            // 4-player mode (clockwise): P1 up, P2 right, P3 down, P4 left
            switch (player) {
                case 1: return 'up';
                case 2: return 'right';
                case 3: return 'down';
                case 4: return 'left';
            }
        }
    }

    /**
     * Draws highlights on valid move targets.
     */
    private drawValidMoveHighlights(): void {
        const g = this.highlightGraphics;
        g.clear();

        for (const move of this.validMoves) {
            const center = this.gridToWorldCenter(move.row, move.col);

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
    private gridToWorld(row: number, col: number): { x: number; y: number } {
        return {
            x: BoardConfig.BOARD_X + col * BoardConfig.CELL_STEP,
            y: BoardConfig.BOARD_Y + row * BoardConfig.CELL_STEP,
        };
    }

    /**
     * Converts grid coordinates to world (pixel) coordinates for the center of a cell.
     */
    private gridToWorldCenter(row: number, col: number): { x: number; y: number } {
        const topLeft = this.gridToWorld(row, col);
        return {
            x: topLeft.x + BoardConfig.CELL_SIZE / 2,
            y: topLeft.y + BoardConfig.CELL_SIZE / 2,
        };
    }

    /**
     * Converts world (pixel) coordinates to grid coordinates.
     * Returns null if the click is outside the board or in a gap.
     */
    private worldToGrid(worldX: number, worldY: number): GridPosition | null {
        // Check if within board bounds
        const boardX = worldX - BoardConfig.BOARD_X;
        const boardY = worldY - BoardConfig.BOARD_Y;

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

    // =========================================================================
    // Input Handling Methods
    // =========================================================================

    /**
     * Handles a click on the game board.
     */
    private handleClick(x: number, y: number): void {
        // Ignore clicks if game is over
        if (this.gameState.winner) {
            return;
        }

        const gridPos = this.worldToGrid(x, y);
        if (!gridPos) {
            // Click outside board - deselect
            this.deselectPawn();
            return;
        }

        // Check if clicking on a pawn
        const clickedPawn = this.gameState.pawns.find(
            pawn => pawn.position.row === gridPos.row && pawn.position.col === gridPos.col
        );

        if (clickedPawn) {
            // Clicking on a pawn
            if (clickedPawn.player === this.gameState.currentPlayer) {
                // Select current player's pawn
                this.selectPawn(clickedPawn.player);
            } else {
                // Clicking opponent's pawn - deselect
                this.deselectPawn();
            }
        } else if (this.selectedPlayer !== null) {
            // A pawn is selected, try to move to this position
            this.tryMove(gridPos);
        }
    }

    /**
     * Selects a pawn and shows valid moves.
     */
    private selectPawn(player: Player): void {
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
     * Updates the status text to show current player or winner.
     */
    private updateStatusText(): void {
        if (this.gameState.winner) {
            this.statusText.setText(`🎉 Player ${this.gameState.winner} Wins!`);
        } else {
            const playerEmoji = this.getPlayerEmoji(this.gameState.currentPlayer);
            this.statusText.setText(`${playerEmoji} Player ${this.gameState.currentPlayer}`);
        }
    }

    /**
     * Gets the emoji for a player.
     */
    private getPlayerEmoji(player: Player): string {
        switch (player) {
            case 1: return '🔴';
            case 2: return '🔵';
            case 3: return '🟢';
            case 4: return '🟠';
        }
    }

    /**
     * Gets the fill and stroke colors for a player.
     */
    private getPlayerColors(player: Player, isSelected: boolean): { fill: number; stroke: number } {
        switch (player) {
            case 1:
                return {
                    fill: isSelected ? ColorConfig.PLAYER_1_SELECTED : ColorConfig.PLAYER_1,
                    stroke: ColorConfig.PLAYER_1
                };
            case 2:
                return {
                    fill: isSelected ? ColorConfig.PLAYER_2_SELECTED : ColorConfig.PLAYER_2,
                    stroke: ColorConfig.PLAYER_2
                };
            case 3:
                return {
                    fill: isSelected ? ColorConfig.PLAYER_3_SELECTED : ColorConfig.PLAYER_3,
                    stroke: ColorConfig.PLAYER_3
                };
            case 4:
                return {
                    fill: isSelected ? ColorConfig.PLAYER_4_SELECTED : ColorConfig.PLAYER_4,
                    stroke: ColorConfig.PLAYER_4
                };
        }
    }

    /**
     * Resets the game to initial state.
     * @param playerCount Number of players (2 or 4).
     */
    private resetGame(playerCount: 2 | 4): void {
        this.gameState = GameLogic.resetGame(playerCount);
        this.deselectPawn();
        this.drawPawns();
        this.updateStatusText();
    }
}
