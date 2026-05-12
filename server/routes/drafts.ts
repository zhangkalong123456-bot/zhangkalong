import { Router } from 'express';
import db from '../db.js';
import { authRequired, teacherRequired, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// Save / update draft
router.post('/', authRequired as any, (req: AuthRequest, res) => {
  const { id, title, content, reviewJson } = req.body;

  if (!title?.trim() || !content?.trim()) {
    res.status(400).json({ error: '标题和内容不能为空' });
    return;
  }

  if (id) {
    // Update existing
    const existing = db.prepare('SELECT * FROM drafts WHERE id = ? AND user_id = ?').get(id, req.user!.id) as any;
    if (!existing) {
      res.status(404).json({ error: '稿件不存在' });
      return;
    }
    db.prepare(`
      UPDATE drafts SET title = ?, content = ?, review_json = ?, updated_at = datetime('now') WHERE id = ?
    `).run(title.trim(), content, reviewJson ? JSON.stringify(reviewJson) : existing.review_json, id);
    res.json({ id });
  } else {
    // Create new
    const result = db.prepare(
      'INSERT INTO drafts (user_id, title, content, review_json) VALUES (?, ?, ?, ?)'
    ).run(req.user!.id, title.trim(), content, reviewJson ? JSON.stringify(reviewJson) : null);
    res.json({ id: result.lastInsertRowid });
  }
});

// List my drafts
router.get('/', authRequired as any, (req: AuthRequest, res) => {
  const rows = db.prepare(`
    SELECT id, title, LENGTH(content) as char_count, updated_at, created_at
    FROM drafts WHERE user_id = ?
    ORDER BY updated_at DESC
  `).all(req.user!.id);
  res.json(rows);
});

// Get a draft
router.get('/:id', authRequired as any, (req: AuthRequest, res) => {
  const row = db.prepare('SELECT * FROM drafts WHERE id = ?').get(req.params.id) as any;
  if (!row) {
    res.status(404).json({ error: '稿件不存在' });
    return;
  }

  if (row.user_id !== req.user!.id && req.user!.role !== 'teacher') {
    res.status(403).json({ error: '无权限查看' });
    return;
  }

  const annotations = db.prepare(`
    SELECT a.*, u.display_name as teacher_name
    FROM annotations a
    JOIN users u ON u.id = a.teacher_id
    WHERE a.draft_id = ?
    ORDER BY a.position, a.created_at
  `).all(row.id);

  res.json({
    ...row,
    review: row.review_json ? JSON.parse(row.review_json) : null,
    annotations,
  });
});

// Delete a draft
router.delete('/:id', authRequired as any, (req: AuthRequest, res) => {
  const row = db.prepare('SELECT * FROM drafts WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id);
  if (!row) {
    res.status(404).json({ error: '稿件不存在' });
    return;
  }
  db.prepare('DELETE FROM drafts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Teacher: add annotation
router.post('/:id/annotate', teacherRequired as any, (req: AuthRequest, res) => {
  const { content, position } = req.body;
  const draftId = req.params.id;

  const draft = db.prepare('SELECT * FROM drafts WHERE id = ?').get(draftId);
  if (!draft) {
    res.status(404).json({ error: '稿件不存在' });
    return;
  }

  const result = db.prepare(
    'INSERT INTO annotations (draft_id, teacher_id, content, position) VALUES (?, ?, ?, ?)'
  ).run(draftId, req.user!.id, content, position || null);

  res.json({ id: result.lastInsertRowid });
});

// Teacher: list drafts for a student
router.get('/student/:userId', teacherRequired as any, (req: AuthRequest, res) => {
  const rows = db.prepare(`
    SELECT id, title, LENGTH(content) as char_count, updated_at, created_at
    FROM drafts WHERE user_id = ?
    ORDER BY updated_at DESC
  `).all(req.params.userId);
  res.json(rows);
});

export default router;
