import { Router } from 'express';
import db from '../db.js';
import { authRequired, teacherRequired, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// Teacher: create practice task
router.post('/', teacherRequired as any, (req: AuthRequest, res) => {
  const { classId, title, description, topic, dueDate } = req.body;

  if (!classId || !title?.trim()) {
    res.status(400).json({ error: '请填写完整信息' });
    return;
  }

  const cls = db.prepare('SELECT * FROM classes WHERE id = ? AND teacher_id = ?').get(classId, req.user!.id) as any;
  if (!cls) {
    res.status(404).json({ error: '班级不存在' });
    return;
  }

  const result = db.prepare(`
    INSERT INTO practice_tasks (class_id, teacher_id, title, description, topic, due_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(classId, req.user!.id, title.trim(), description || null, topic || null, dueDate || null);

  res.json({ id: result.lastInsertRowid });
});

// List tasks for a class
router.get('/class/:classId', authRequired as any, (req: AuthRequest, res) => {
  const rows = db.prepare(`
    SELECT pt.*, u.display_name as teacher_name
    FROM practice_tasks pt
    JOIN users u ON u.id = pt.teacher_id
    WHERE pt.class_id = ?
    ORDER BY pt.created_at DESC
  `).all(req.params.classId);
  res.json(rows);
});

// Delete task (teacher only)
router.delete('/:id', teacherRequired as any, (req: AuthRequest, res) => {
  const task = db.prepare('SELECT * FROM practice_tasks WHERE id = ? AND teacher_id = ?').get(req.params.id, req.user!.id);
  if (!task) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }
  db.prepare('DELETE FROM practice_tasks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
