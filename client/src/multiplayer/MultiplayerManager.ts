import { io, Socket } from 'socket.io-client';
import { MultiplayerConfig } from '../constants';
import {
    SocketEvents,
    type JoinRoomResponse,
    type LeaveRoomResponse,
    type PlayerJoinedPayload,
    type SendStatePayload,
    type StateRequestedPayload,
} from '@shared/types';
import type { RoomInfo } from '../types';

/**
 * Callback interface for multiplayer events.
 * GameScene implements these to react to multiplayer state changes.
 */
export interface MultiplayerCallbacks {
    /** Called when connection status changes (connected/disconnected). */
    onConnectionChange: (connected: boolean, roomInfo?: RoomInfo) => void;
    /** Called when game state is received from another player. */
    onStateReceived: (state: unknown) => void;
    /** Called when a multiplayer error occurs. */
    onError: (message: string) => void;
    /** Called when a player leaves the room (optional). */
    onPlayerLeft?: () => void;
    /** Called when a new player joins the room (optional). */
    onPlayerJoined?: (playerCount: number) => void;
    /** Called when a new player requests the current game state (sent to room owner). */
    onStateRequested: (requesterId: string) => void;
    /** Called when the room times out due to inactivity. */
    onRoomTimeout: () => void;
}

/**
 * Manages Socket.IO connection and multiplayer communication.
 * Encapsulates all socket logic, providing an event-driven interface to GameScene.
 */
export class MultiplayerManager {
    private socket: Socket | null = null;
    private callbacks: MultiplayerCallbacks;
    private roomInfo: RoomInfo | null = null;
    /** Room name to rejoin after reconnection. */
    private pendingRoomName: string | null = null;

    constructor(callbacks: MultiplayerCallbacks) {
        this.callbacks = callbacks;
    }

    // ==================== Public Methods ====================

    /**
     * Connects to the server and joins a room.
     * If already connected, disconnects first.
     *
     * @param roomName - The room name to join
     * @throws Error if connection or room join fails
     */
    public async connect(roomName: string): Promise<void> {
        // Disconnect any existing connection
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        this.pendingRoomName = roomName;

        return new Promise((resolve, reject) => {
            this.socket = io(MultiplayerConfig.SERVER_URL, {
                path: MultiplayerConfig.SOCKET_PATH,
                transports: ['websocket', 'polling'],
            });

            this.socket.on('connect', () => {
                console.log('Connected to server');
                this.joinRoom(roomName).then(resolve).catch(reject);
            });

            this.socket.on('connect_error', (error: Error) => {
                console.error('Connection error:', error);
                this.pendingRoomName = null;
                reject(new Error('Failed to connect to server'));
            });

            this.setupEventListeners();
        });
    }

    /**
     * Disconnects from the server and clears room state.
     */
    public disconnect(): void {
        if (!this.socket && !this.roomInfo) return; // Already disconnected

        if (this.socket) {
            if (this.roomInfo) {
                this.socket.emit(SocketEvents.LEAVE_ROOM, (_response: LeaveRoomResponse) => {
                    // Acknowledgment received
                });
            }
            this.socket.disconnect();
            this.socket = null;
        }
        this.roomInfo = null;
        this.pendingRoomName = null;
        this.callbacks.onConnectionChange(false);
    }

    /**
     * Cleans up socket connection on scene shutdown.
     */
    public destroy(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.roomInfo = null;
        this.pendingRoomName = null;
    }

    /**
     * Broadcasts state to all other players in the room.
     *
     * @param state - The multiplayer state bundle to broadcast
     */
    public broadcastState(state: unknown): void {
        if (this.socket?.connected && this.roomInfo) {
            this.socket.emit(SocketEvents.GAME_STATE, state);
        }
    }

    /**
     * Sends state directly to a specific player (used by room owner
     * in response to STATE_REQUESTED).
     *
     * @param targetId - Socket ID of the recipient
     * @param state - The multiplayer state bundle to send
     */
    public sendStateTo(targetId: string, state: unknown): void {
        if (this.socket?.connected && this.roomInfo) {
            const payload: SendStatePayload = { targetId, state };
            this.socket.emit(SocketEvents.SEND_STATE, payload);
        }
    }

    /**
     * Returns whether the manager is connected to a room.
     */
    public isConnected(): boolean {
        return this.socket?.connected === true && this.roomInfo !== null;
    }

    /**
     * Returns the current room info, or null if not connected.
     */
    public getRoomInfo(): RoomInfo | null {
        return this.roomInfo;
    }

    // ==================== Private Methods ====================

    /**
     * Joins a room via Socket.IO acknowledgment callback.
     *
     * @param roomName - The room name to join
     * @throws Error if room join fails
     */
    private joinRoom(roomName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Not connected'));
                return;
            }

            this.socket.emit(SocketEvents.JOIN_ROOM, roomName, (response: JoinRoomResponse) => {
                if (response.success) {
                    this.roomInfo = {
                        roomName,
                        isRoomOwner: response.isRoomOwner ?? false,
                        playerCount: response.playerCount ?? 1,
                    };
                    // Clear pending room — join succeeded, no need to retry on reconnect
                    this.pendingRoomName = null;
                    this.callbacks.onConnectionChange(true, this.roomInfo);

                    // If not room owner, request current state from owner
                    if (!response.isRoomOwner) {
                        this.socket!.emit(SocketEvents.REQUEST_STATE);
                    }

                    resolve();
                } else {
                    reject(new Error(response.error || 'Failed to join room'));
                }
            });
        });
    }

    /**
     * Sets up Socket.IO event listeners for multiplayer events.
     */
    private setupEventListeners(): void {
        if (!this.socket) return;

        // Receive game state from another player
        this.socket.on(SocketEvents.GAME_STATE, (state: unknown) => {
            this.callbacks.onStateReceived(state);
        });

        // Another player joined the room
        this.socket.on(SocketEvents.PLAYER_JOINED, (data: PlayerJoinedPayload) => {
            if (this.roomInfo) {
                this.roomInfo.playerCount = data.playerCount;
            }
            this.callbacks.onPlayerJoined?.(data.playerCount);
        });

        // A player left the room
        this.socket.on(SocketEvents.PLAYER_LEFT, () => {
            if (this.roomInfo) {
                this.roomInfo.playerCount = Math.max(1, this.roomInfo.playerCount - 1);
            }
            this.callbacks.onPlayerLeft?.();
        });

        // Room owner receives request to send state to a new player
        this.socket.on(SocketEvents.STATE_REQUESTED, (data: StateRequestedPayload) => {
            this.callbacks.onStateRequested(data.requesterId);
        });

        // Room timed out due to inactivity
        this.socket.on(SocketEvents.ROOM_TIMEOUT, () => {
            this.roomInfo = null;
            this.callbacks.onRoomTimeout();
        });

        // Handle reconnection
        this.socket.on('reconnect', () => {
            console.log('Reconnected to server');
            if (this.pendingRoomName) {
                this.joinRoom(this.pendingRoomName).catch((error) => {
                    this.callbacks.onError(error.message);
                });
            }
        });

        // Handle disconnection
        this.socket.on('disconnect', (reason: string) => {
            console.log('Disconnected:', reason);
            if (reason === 'io server disconnect') {
                // Server forcefully disconnected us
                this.roomInfo = null;
                this.callbacks.onConnectionChange(false);
            }
            // For other reasons (transport close, etc.), socket.io will auto-reconnect
        });
    }
}
