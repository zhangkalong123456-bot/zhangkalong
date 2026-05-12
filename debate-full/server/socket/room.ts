import type { Server, Socket } from 'socket.io';
import db from '../db.js';
import { chat } from '../services/claude.js';
import { buildJudgePrompt } from '../services/prompts.js';

interface RoomSpeech {
  userId: number;
  displayName: string;
  content: string;
  stage: string;
  side: string;
  speaker: string;
  timestamp: number;
}

const roomState = new Map<string, {
  topic: string;
  speeches: RoomSpeech[];
  startTime: number;
  formatId: string;
}>();

export function setupRoomSocket(io: Server) {
  const roomNs = io.of('/room');

  roomNs.on('connection', (socket: Socket) => {
    let currentRoom: string | null = null;
    let userId: number | null = null;
    let displayName: string | null = null;

    // Join room
    socket.on('join-room', (data: { roomCode: string; userId: number; displayName: string }) => {
      currentRoom = `debate-${data.roomCode}`;
      userId = data.userId;
      displayName = data.displayName;
      socket.join(currentRoom);

      // Notify others
      socket.to(currentRoom).emit('participant-joined', {
        userId: data.userId,
        displayName: data.displayName,
      });

      // Send current participants in room
      const socketsInRoom = roomNs.adapter.rooms.get(currentRoom);
      roomNs.to(currentRoom).emit('room-count', socketsInRoom?.size || 0);
    });

    // Select seat (side + position)
    socket.on('select-seat', (data: { side: string; position: number; role?: string }) => {
      if (!currentRoom) return;
      roomNs.to(currentRoom).emit('seat-updated', {
        userId,
        displayName,
        side: data.side,
        position: data.position,
        role: data.role || 'player',
      });
    });

    // Start debate (host only)
    socket.on('start-debate', (data: { formatId: string; startTime?: number }) => {
      if (!currentRoom) return;
      const startTime = data.startTime || Date.now();

      // Initialize room state
      const roomCode = currentRoom.replace('debate-', '');
      roomState.set(currentRoom, {
        topic: '',
        speeches: [],
        startTime,
        formatId: data.formatId,
      });

      roomNs.to(currentRoom).emit('debate-started', {
        formatId: data.formatId,
        startTime,
      });
    });

    // Send speech (during debate)
    socket.on('speech', (data: { content: string; stage: string; side: string; speaker: string }) => {
      if (!currentRoom) return;
      const speech: RoomSpeech = {
        userId: userId!,
        displayName: displayName!,
        ...data,
        timestamp: Date.now(),
      };

      // Save speech to room state
      const state = roomState.get(currentRoom);
      if (state) {
        state.speeches.push(speech);
      }

      roomNs.to(currentRoom).emit('new-speech', speech);
    });

    // Advance stage
    socket.on('advance-stage', (data: { stageIndex?: number; stageTime?: number }) => {
      if (!currentRoom) return;
      roomNs.to(currentRoom).emit('stage-advanced', {
        stageIndex: data.stageIndex,
        stageTime: data.stageTime,
      });
    });

    // Timer sync
    socket.on('timer-update', (data: { seconds: number; running: boolean }) => {
      if (!currentRoom) return;
      socket.to(currentRoom).emit('timer-update', data);
    });

    // End debate
    socket.on('end-debate', (data: { reason?: string }) => {
      if (!currentRoom) return;
      roomNs.to(currentRoom).emit('debate-ended', data);
    });

    // Request judge analysis from AI
    socket.on('request-judge', async (data: { topic: string }) => {
      if (!currentRoom) return;
      const state = roomState.get(currentRoom);
      if (!state || state.speeches.length === 0) {
        socket.emit('judge-results', { verdicts: [], analysis: '没有辩论记录' });
        return;
      }

      try {
        // Run judge analysis
        const judgeTypes: Array<'logic' | 'expression' | 'strategy'> = ['logic', 'expression', 'strategy'];
        const verdicts: any[] = [];
        const recordText = state.speeches.map(s =>
          `【${s.stage} - ${s.speaker}(${s.displayName})】\n${s.content}`
        ).join('\n\n---\n\n');

        for (const judgeType of judgeTypes) {
          const system = buildJudgePrompt(judgeType, data.topic);
          const messages = [{
            role: 'user' as const,
            content: `以下是完整的辩论记录，请给出你的判决：\n\n${recordText}`,
          }];

          try {
            const content = await chat(messages, system);
            const parsed = JSON.parse(content);
            verdicts.push({
              judgeId: judgeType,
              judgeName: judgeType === 'logic' ? '逻辑评委' : judgeType === 'expression' ? '表达评委' : '战术评委',
              scores: parsed.scores,
              winner: parsed.winner,
              reasoning: parsed.reasoning,
              highlights: parsed.highlights || [],
            });
          } catch { }
        }

        // Broadcast results to all participants
        roomNs.to(currentRoom).emit('judge-results', {
          verdicts,
          analysis: '',
        });
        socket.emit('judge-results', { verdicts, analysis: '' });
      } catch { }
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (currentRoom) {
        socket.to(currentRoom).emit('participant-left', { userId, displayName });
        const socketsInRoom = roomNs.adapter.rooms.get(currentRoom);
        roomNs.to(currentRoom).emit('room-count', socketsInRoom?.size || 0);

        // Clean up room state if empty
        if (!socketsInRoom || socketsInRoom.size === 0) {
          roomState.delete(currentRoom);
        }
      }
    });
  });
}
