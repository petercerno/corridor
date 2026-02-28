# Corridor

A modern digital version of the classic [Quoridor](https://en.wikipedia.org/wiki/Quoridor) board game. Built with Phaser 3, TypeScript, Vite, Node.js, Express, and Socket.IO for real-time multiplayer.

You can play the game for free here: https://vibephase.net/corridor/

## Features

*   **Classic Quoridor Gameplay**: Move your pawn toward the opposite side of the board while strategically placing walls to block your opponents.
*   **2-Player and 4-Player Modes**: Choose between a head-to-head duel (10 walls each) or a four-way battle (5 walls each).
*   **9×9 Board**: Standard Quoridor grid with wall slots between all cells.
*   **Wall Placement**: Click on gaps between cells to place walls. Walls span two cells and cannot block all paths to a player's goal.
*   **Pawn Movement with Jumping**: Move one square orthogonally, or jump over adjacent opponents (including diagonal jumps when blocked by walls).
*   **Real-Time Multiplayer**: Connect to rooms and play with friends via WebSocket synchronization.
*   **Dark/Light Theme Toggle**: Switch between dark and light modes with a single click. Defaults to your system preference.
*   **Undo Move**: Take back your last move with the undo button.
*   **Direction Indicators**: Each pawn displays a small triangle pointing toward its goal direction.
*   **Modern Stack**: Fast development and building with Vite.

## Project Structure

```
corridor/
├── client/          # Phaser 3 game (frontend)
│   ├── index.html   # HTML entry point
│   ├── src/
│   │   ├── main.ts              # Game entry point
│   │   ├── constants.ts         # Configuration and theming
│   │   ├── types.ts             # TypeScript type definitions
│   │   ├── coordinates.ts       # Grid ↔ world coordinate conversion
│   │   ├── logic/               # Pure game logic (GameLogic.ts)
│   │   ├── scenes/              # Phaser scenes (GameScene.ts)
│   │   ├── ui/                  # UI components (RoomModal.ts)
│   │   └── multiplayer/         # WebSocket client (MultiplayerManager.ts)
│   └── dist/        # Production build output
├── server/          # Node.js Express + Socket.IO backend
│   ├── src/
│   │   ├── index.ts           # Server entry point
│   │   ├── GameRoomManager.ts # Socket.IO room management
│   │   ├── RateLimiter.ts     # Rate limiting and connection tracking
│   │   └── ServerHealth.ts    # Health endpoint with server stats
│   └── dist/        # Compiled server output
├── shared/          # Shared types and constants
│   ├── types.ts     # Socket event types and payloads
│   └── constants.ts # Room validation and deployment config
└── package.json     # Root package with all scripts
```

## Tech Stack

### Frontend

*   [Phaser 3](https://phaser.io/) - HTML5 Game Framework
*   [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript
*   [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling
*   [Socket.IO Client](https://socket.io/) - Real-Time Communication

### Backend

*   [Node.js](https://nodejs.org/) - JavaScript Runtime
*   [Express 5](https://expressjs.com/) - Web Framework
*   [Socket.IO](https://socket.io/) - WebSocket Server for Multiplayer

## Getting Started

### Prerequisites

*   Node.js (v20 or higher)
*   npm (comes with Node.js)

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd corridor
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

## Usage

### Development

Start the Vite development server with hot-reload:

```bash
npm run dev
```

To run the backend server in watch mode alongside the frontend:

```bash
npm run dev:all
```

### Production

Build and start the production server:

```bash
npm run build
npm run start
```

This builds the client and server, then starts the Express server serving the static files.

### Server Health

Visit `/corridor/health` to view a dashboard with server statistics including active rooms and connected players.

### Multiplayer

1.  Click the connect button (⚡) in the game HUD
2.  Enter a room name to create or join a room
3.  Share the room name with a friend to play together
4.  Maximum 4 players per room
5.  Rooms automatically close after 10 minutes of inactivity
6.  Auto-reconnect: If your connection drops (e.g., switching apps on mobile), you'll automatically rejoin the room

### Security

The server includes built-in protection against abuse:

| Protection | Limit |
|------------|-------|
| Connections per IP | 100 |
| JOIN_ROOM requests | 5 per 10 seconds |
| GAME_STATE broadcasts | 30 per 10 seconds |
| REQUEST_STATE requests | 10 per 10 seconds |
| SEND_STATE requests | 10 per 10 seconds |
| Max game state payload | 100 KB |
| Max concurrent rooms | 10,000 |
| Health endpoint | 30 per 10 seconds per IP |

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server for frontend only |
| `npm run dev:all` | Run frontend and backend concurrently |
| `npm run build` | Build client and server for production |
| `npm run start` | Start the production server (run `build` first) |

## Deployment

The app is configured to be served from the `/corridor/` path, enabling multiple games on the same domain.

### Google Cloud Run

Deploy the game server to Cloud Run:

```bash
gcloud run deploy corridor \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --max-instances 1 \
  --min-instances 0 \
  --session-affinity
```

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
