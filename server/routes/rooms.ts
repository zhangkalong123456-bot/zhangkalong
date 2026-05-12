import { Router } from 'express';
import db from '../db.js';
import { authRequired, type AuthRequest } from '../middleware/auth.js';

const router = Router();

function generateRoomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Create a room
router.post('/', authRequired as any, (req: AuthRequest, res) => {
  const { topic, formatId } = req.body;
  if (!topic?.trim()) {
    res.status(400).json({ error: '请输入辩题' });
    return;
  }

  let code = generateRoomCode();
  while (db.prepare('SELECT id FROM debate_rooms WHERE room_code = ?').get(code)) {
    code = generateRoomCode();
  }

  const result = db.prepare(`
    INSERT INTO debate_rooms (room_code, topic, format_id, host_id, config_json)
    VALUES (?, ?, ?, ?, ?)
  `).run(code, topic.trim(), formatId || 'standard', req.user!.id, JSON.stringify(req.body.config || {}));

  // Host joins as player
  db.prepare(
    'INSERT INTO room_participants (room_id, user_id, role) VALUES (?, ?, ?)'
  ).run(result.lastInsertRowid, req.user!.id, 'player');

  res.json({ id: result.lastInsertRowid, roomCode: code });
});

// Get room by code
router.get('/code/:code', authRequired as any, (req: AuthRequest, res) => {
  const room = db.prepare('SELECT * FROM debate_rooms WHERE room_code = ?').get(req.params.code) as any;
  if (!room) {
    res.status(404).json({ error: '房间不存在' });
    return;
  }

  const participants = db.prepare(`
    SELECT rp.*, u.display_name, u.username
    FROM room_participants rp
    JOIN users u ON u.id = rp.user_id
    WHERE rp.room_id = ?
  `).all(room.id);

  const host = db.prepare('SELECT display_name FROM users WHERE id = ?').get(room.host_id) as any;

  res.json({ ...room, hostName: host?.display_name, participants });
});

// Join room
router.post('/join', authRequired as any, (req: AuthRequest, res) => {
  const { roomCode, role: joinRole } = req.body;
  const room = db.prepare('SELECT * FROM debate_rooms WHERE room_code = ?').get(roomCode?.toUpperCase()) as any;
  if (!room) {
    res.status(404).json({ error: '房间不存在' });
    return;
  }
  if (room.status !== 'waiting') {
    res.status(400).json({ error: '辩论已开始或已结束' });
    return;
  }

  const existing = db.prepare(
    'SELECT id FROM room_participants WHERE room_id = ? AND user_id = ?'
  ).get(room.id, req.user!.id);

  if (!existing) {
    db.prepare(
      'INSERT INTO room_participants (room_id, user_id, role) VALUES (?, ?, ?)'
    ).run(room.id, req.user!.id, joinRole || 'player');
  }

  res.json({ roomId: room.id, roomCode: room.room_code, topic: room.topic });
});

// Update participant position/side
router.post('/:id/seat', authRequired as any, (req: AuthRequest, res) => {
  const { side, position } = req.body;
  db.prepare(`
    UPDATE room_participants SET side = ?, position = ? WHERE room_id = ? AND user_id = ?
  `).run(side, position, req.params.id, req.user!.id);
  res.json({ ok: true });
});

// Update room status
router.post('/:id/status', authRequired as any, (req: AuthRequest, res) => {
  const { status } = req.body;
  const room = db.prepare('SELECT * FROM debate_rooms WHERE id = ?').get(req.params.id) as any;
  if (!room) {
    res.status(404).json({ error: '房间不存在' });
    return;
  }
  if (room.host_id !== req.user!.id && req.user!.role !== 'teacher') {
    res.status(403).json({ error: '只有房主可以操作' });
    return;
  }
  db.prepare('UPDATE debate_rooms SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

// List active rooms
router.get('/', authRequired as any, (_req: AuthRequest, res) => {
  const rooms = db.prepare(`
    SELECT dr.*, u.display_name as host_name, COUNT(rp.id) as player_count
    FROM debate_rooms dr
    JOIN users u ON u.id = dr.host_id
    LEFT JOIN room_participants rp ON rp.room_id = dr.id
    WHERE dr.status = 'waiting'
    GROUP BY dr.id
    ORDER BY dr.created_at DESC
    LIMIT 20
  `).all();
  res.json(rooms);
});

export default router;
