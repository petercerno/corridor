/**
 * Main entry point for the Phaser game.
 * Sets up the game configuration and initializes the game instance.
 */
import Phaser from 'phaser';
import GameScene from './scenes/GameScene';
import { BoardConfig, ColorConfig, initTheme } from './constants';

// Initialize theme based on system preference before creating the game
initTheme();
document.body.style.backgroundColor = ColorConfig.BOARD_BG_STR;

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: BoardConfig.CANVAS_WIDTH,
    height: BoardConfig.CANVAS_HEIGHT,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    parent: 'app',
    backgroundColor: ColorConfig.BOARD_BG_STR,
    scene: [GameScene],
    fps: {
        limit: 10 // Sufficient for a turn-based board game; reduces idle CPU usage.
    }
};

new Phaser.Game(config);
