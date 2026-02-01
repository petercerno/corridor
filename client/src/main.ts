/**
 * Main entry point for the Phaser game.
 * Sets up the game configuration and initializes the game instance.
 */
import Phaser from 'phaser';
import GameScene from './scenes/GameScene';
import { BoardConfig, ColorConfig } from './constants';

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
    scene: [GameScene]
};

new Phaser.Game(config);
