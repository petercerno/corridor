/**
 * Express + Socket.IO server for Corridor application.
 *
 * Serves the static Phaser game from client/dist and provides real-time
 * multiplayer functionality through WebSocket rooms.
 *
 * Security features:
 * - Connection limits per IP address
 * - Rate limiting on Socket.IO events
 * - Payload size validation
 * - Room count limits
 */
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { GameRoomManager } from './GameRoomManager.js';
import { ServerHealth } from './ServerHealth.js';
import { trackConnection, releaseConnection } from './RateLimiter.js';
import { BASE_PATH, SOCKET_IO_PATH } from '../../shared/constants.js';

const app = express();
const server = createServer(app);

// Trust proxy for correct IP detection behind reverse proxies (Cloud Run, etc.)
app.set('trust proxy', true);

// Initialize Socket.IO with security settings
const io = new Server(server, {
    path: SOCKET_IO_PATH,
    cors: {
        // TODO: Restrict to specific origins when deploying to production
        origin: '*',
        methods: ['GET', 'POST'],
    },
    // Stability settings for mobile/poor networks
    pingTimeout: 30000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB max payload
});

// ==================== Per-IP Connection Limiting ====================

io.use((socket, next) => {
    const ip = socket.handshake.address;
    if (trackConnection(ip)) {
        socket.on('disconnect', () => {
            releaseConnection(ip);
        });
        next();
    } else {
        next(new Error('Too many connections from this IP'));
    }
});

// ==================== Static File Serving ====================

// Serve client build files
const clientDistPath = path.join(process.cwd(), 'client', 'dist');
app.use(BASE_PATH, express.static(clientDistPath));

// ==================== Health Endpoint ====================

const serverHealth = new ServerHealth(io);
serverHealth.register(app);

// ==================== Game Room Manager ====================

const roomManager = new GameRoomManager(io);
roomManager.initialize();

// SPA fallback: serve index.html for any unmatched routes under BASE_PATH
// Must be registered AFTER all other routes to avoid catching them
app.get(`${BASE_PATH}/{*path}`, (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
});

// ==================== Start Server ====================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Game: http://localhost:${PORT}${BASE_PATH}`);
    console.log(`Health: http://localhost:${PORT}${BASE_PATH}/health`);
});

