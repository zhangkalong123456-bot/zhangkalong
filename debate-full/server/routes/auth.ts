import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { signToken, authRequired, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// Register
router.post('/register', (req, res) => {
  const { username, password, displayName, role } = req.body;

  if (!username || !password || !displayName) {
    res.status(400).json({ error: '请填写完整信息' });
    return;
  }
  if (!['teacher', 'student'].includes(role)) {
    res.status(400).json({ error: '角色无效' });
    return;
  }
  if (password.length < 4) {
    res.status(400).json({ error: '密码至少4位' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    res.status(400).json({ error: '用户名已存在' });
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)'
  ).run(username, hash, displayName, role);

  const user = {
    id: result.lastInsertRowid as number,
    username,
    displayName,
    role: role as 'teacher' | 'student',
  };

  const token = signToken(user);
  res.json({ token, user });
});

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: '请输入用户名和密码' });
    return;
  }

  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  if (!row) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }

  if (!bcrypt.compareSync(password, row.password_hash)) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }

  const user = {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role as 'teacher' | 'student',
  };

  const token = signToken(user);
  res.json({ token, user });
});

// Get current user info
router.get('/me', authRequired as any, (req: AuthRequest, res) => {
  const row = db.prepare('SELECT id, username, display_name, role, created_at FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!row) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  res.json({
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    createdAt: row.created_at,
  });
});

export default router;
