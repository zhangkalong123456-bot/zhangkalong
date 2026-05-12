import { Router } from 'express';
import db from '../db.js';
import { authRequired, teacherRequired, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// Save a debate record
router.post('/', authRequired as any, (req: AuthRequest, res) => {
  const { topic, formatName, userSide, mode, record, messages, verdicts, analysis, scores, durationSec } = req.body;

  const result = db.prepare(`
    INSERT INTO debate_records (user_id, topic, format_name, user_side, mode, record_json, messages_json, verdicts_json, analysis_json, scores_json, duration_sec)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user!.id,
    topic,
    formatName,
    userSide,
    mode,
    JSON.stringify(record),
    JSON.stringify(messages),
    verdicts ? JSON.stringify(verdicts) : null,
    analysis ? JSON.stringify(analysis) : null,
    scores ? JSON.stringify(scores) : null,
    durationSec || null,
  );

  res.json({ id: result.lastInsertRowid });
});

// List my records
router.get('/', authRequired as any, (req: AuthRequest, res) => {
  const rows = db.prepare(`
    SELECT id, topic, format_name, user_side, mode, scores_json, duration_sec, created_at
    FROM debate_records
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(req.user!.id);

  res.json(rows.map((r: any) => ({
    ...r,
    scores: r.scores_json ? JSON.parse(r.scores_json) : null,
  })));
});

// Get a specific record
router.get('/:id', authRequired as any, (req: AuthRequest, res) => {
  const row = db.prepare('SELECT * FROM debate_records WHERE id = ?').get(req.params.id) as any;
  if (!row) {
    res.status(404).json({ error: '记录不存在' });
    return;
  }

  // Allow owner or teacher to view
  if (row.user_id !== req.user!.id && req.user!.role !== 'teacher') {
    res.status(403).json({ error: '无权限查看' });
    return;
  }

  res.json({
    ...row,
    record: JSON.parse(row.record_json),
    messages: JSON.parse(row.messages_json),
    verdicts: row.verdicts_json ? JSON.parse(row.verdicts_json) : null,
    analysis: row.analysis_json ? JSON.parse(row.analysis_json) : null,
    scores: row.scores_json ? JSON.parse(row.scores_json) : null,
  });
});

// Update analysis for a record
router.post('/:id/analysis', authRequired as any, (req: AuthRequest, res) => {
  const { analysisJson } = req.body;
  const row = db.prepare('SELECT * FROM debate_records WHERE id = ?').get(req.params.id) as any;
  if (!row) {
    res.status(404).json({ error: '记录不存在' });
    return;
  }
  if (row.user_id !== req.user!.id && req.user!.role !== 'teacher') {
    res.status(403).json({ error: '无权限' });
    return;
  }

  // Merge with existing analysis if any
  const existingAnalysis = row.analysis_json ? JSON.parse(row.analysis_json) : {};
  const merged = { ...existingAnalysis, ...analysisJson };

  db.prepare('UPDATE debate_records SET analysis_json = ? WHERE id = ?')
    .run(JSON.stringify(merged), req.params.id);

  res.json({ success: true });
});

// Teacher: list records for a specific student
router.get('/student/:userId', teacherRequired as any, (req: AuthRequest, res) => {
  const rows = db.prepare(`
    SELECT id, topic, format_name, user_side, mode, scores_json, duration_sec, created_at
    FROM debate_records
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(req.params.userId);

  res.json(rows.map((r: any) => ({
    ...r,
    scores: r.scores_json ? JSON.parse(r.scores_json) : null,
  })));
});

export default router;
