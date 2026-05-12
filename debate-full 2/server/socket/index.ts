import type { Server } from 'socket.io';
import { setupWhiteboardSocket } from './whiteboard.js';
import { setupRoomSocket } from './room.js';

export function setupSocket(io: Server) {
  setupWhiteboardSocket(io);
  setupRoomSocket(io);
}
