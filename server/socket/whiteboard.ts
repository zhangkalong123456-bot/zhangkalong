import type { Server, Socket } from 'socket.io';

interface WhiteboardRoom {
  elements: any[];
  appState: any;
  users: Map<string, { name: string; cursor?: { x: number; y: number } }>;
}

const rooms = new Map<string, WhiteboardRoom>();

export function setupWhiteboardSocket(io: Server) {
  const ns = io.of('/workshop');

  ns.on('connection', (socket: Socket) => {
    let currentRoom: string | null = null;

    socket.on('whiteboard:join', ({ roomId, userName }) => {
      currentRoom = roomId;
      socket.join(roomId);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, { elements: [], appState: {}, users: new Map() });
      }

      const room = rooms.get(roomId)!;
      room.users.set(socket.id, { name: userName || 'Anonymous' });

      // Send current state to joining user
      socket.emit('whiteboard:sync', {
        elements: room.elements,
        appState: room.appState,
      });

      // Notify others
      socket.to(roomId).emit('whiteboard:user-joined', {
        userId: socket.id,
        userName: userName || 'Anonymous',
      });
    });

    socket.on('whiteboard:update', ({ roomId, elements, appState }) => {
      const room = rooms.get(roomId);
      if (room) {
        room.elements = elements;
        if (appState) room.appState = appState;
        socket.to(roomId).emit('whiteboard:sync', { elements, appState });
      }
    });

    socket.on('whiteboard:cursor', ({ roomId, position }) => {
      const room = rooms.get(roomId);
      if (room) {
        const user = room.users.get(socket.id);
        if (user) user.cursor = position;
        socket.to(roomId).emit('whiteboard:cursors', {
          userId: socket.id,
          position,
          userName: user?.name,
        });
      }
    });

    socket.on('disconnect', () => {
      if (currentRoom) {
        const room = rooms.get(currentRoom);
        if (room) {
          room.users.delete(socket.id);
          if (room.users.size === 0) rooms.delete(currentRoom);
        }
        socket.to(currentRoom).emit('whiteboard:user-left', { userId: socket.id });
      }
    });
  });
}
