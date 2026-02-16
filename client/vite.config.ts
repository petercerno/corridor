import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    base: '/corridor/',
    resolve: {
        alias: {
            '@shared': path.resolve(__dirname, '../shared'),
        },
    },
    server: {
        proxy: {
            // Proxy Socket.IO requests to Express server during development
            '/corridor/socket.io': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                ws: true,
            },
            // Proxy health endpoint to Express server during development
            '/corridor/health': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
        },
    },
});
