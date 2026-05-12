import { Router } from 'express';
import db from '../db.js';
import { authRequired, teacherRequired, type AuthRequest } from '../middleware/auth.js';

const router = Router();

function generateCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Create class (teacher only)
router.post('/', teacherRequired as any, (req: AuthRequest, res) => {
  const { name } = req.body;
  if (!name?.trim()) {
    res.status(400).json({ error: '请输入班级名称' });
    return;
  }

  let code = generateCode();
  // Ensure uniqueness
  while (db.prepare('SELECT id FROM classes WHERE invite_code = ?').get(code)) {
    code = generateCode();
  }

  const result = db.prepare(
    'INSERT INTO classes (name, invite_code, teacher_id) VALUES (?, ?, ?)'
  ).run(name.trim(), code, req.user!.id);

  res.json({
    id: result.lastInsertRowid,
    name: name.trim(),
    inviteCode: code,
    teacherId: req.user!.id,
  });
});

// List my classes
router.get('/', authRequired as any, (req: AuthRequest, res) => {
  if (req.user!.role === 'teacher') {
    const classes = db.prepare(`
      SELECT c.*, COUNT(cm.id) as member_count
      FROM classes c
      LEFT JOIN class_members cm ON cm.class_id = c.id
      WHERE c.teacher_id = ?
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all(req.user!.id);
    res.json(classes);
  } else {
    const classes = db.prepare(`
      SELECT c.*, u.display_name as teacher_name
      FROM classes c
      JOIN class_members cm ON cm.class_id = c.id
      JOIN users u ON u.id = c.teacher_id
      WHERE cm.user_id = ?
      ORDER BY cm.joined_at DESC
    `).all(req.user!.id);
    res.json(classes);
  }
});

// Join class by invite code (student)
router.post('/join', authRequired as any, (req: AuthRequest, res) => {
  const { inviteCode } = req.body;
  if (!inviteCode?.trim()) {
    res.status(400).json({ error: '请输入邀请码' });
    return;
  }

  const cls = db.prepare('SELECT * FROM classes WHERE invite_code = ?').get(inviteCode.trim().toUpperCase()) as any;
  if (!cls) {
    res.status(404).json({ error: '邀请码无效' });
    return;
  }

  const existing = db.prepare(
    'SELECT id FROM class_members WHERE class_id = ? AND user_id = ?'
  ).get(cls.id, req.user!.id);
  if (existing) {
    res.status(400).json({ error: '你已在该班级中' });
    return;
  }

  db.prepare('INSERT INTO class_members (class_id, user_id) VALUES (?, ?)').run(cls.id, req.user!.id);
  res.json({ message: '加入成功', classId: cls.id, className: cls.name });
});

// Get class details with members
router.get('/:id', authRequired as any, (req: AuthRequest, res) => {
  const classId = req.params.id;
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId) as any;
  if (!cls) {
    res.status(404).json({ error: '班级不存在' });
    return;
  }

  const members = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.role, cm.joined_at
    FROM class_members cm
    JOIN users u ON u.id = cm.user_id
    WHERE cm.class_id = ?
    ORDER BY cm.joined_at
  `).all(classId);

  const teacher = db.prepare('SELECT id, display_name FROM users WHERE id = ?').get(cls.teacher_id) as any;

  res.json({
    ...cls,
    teacher,
    members,
  });
});

// Get class members' practice stats (teacher)
router.get('/:id/stats', teacherRequired as any, (req: AuthRequest, res) => {
  const classId = req.params.id;
  const cls = db.prepare('SELECT * FROM classes WHERE id = ? AND teacher_id = ?').get(classId, req.user!.id) as any;
  if (!cls) {
    res.status(404).json({ error: '班级不存在或无权限' });
    return;
  }

  const stats = db.prepare(`
    SELECT
      u.id as user_id,
      u.display_name,
      COUNT(dr.id) as practice_count,
      MAX(dr.created_at) as last_practice,
      COUNT(d.id) as draft_count
    FROM class_members cm
    JOIN users u ON u.id = cm.user_id
    LEFT JOIN debate_records dr ON dr.user_id = u.id
    LEFT JOIN drafts d ON d.user_id = u.id
    WHERE cm.class_id = ?
    GROUP BY u.id
    ORDER BY u.display_name
  `).all(classId);

  res.json(stats);
});

export default router;
