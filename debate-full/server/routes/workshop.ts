import { Router } from 'express';
import { streamChat } from '../services/claude.js';
import { buildReviewPrompt } from '../services/prompts.js';

const router = Router();

// AI Review of debate drafts
router.post('/review', async (req, res) => {
  const { content, type } = req.body;

  if (!content || !type) {
    return res.status(400).json({ error: '请提供内容和审核类型' });
  }

  const system = buildReviewPrompt(type);
  const messages = [{ role: 'user', content: `请审核以下辩论稿件：\n\n${content}` }];

  try {
    await streamChat(messages, system, res);
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

export default router;
