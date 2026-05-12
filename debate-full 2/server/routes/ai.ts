import { Router } from 'express';
import { chat, streamChat } from '../services/claude.js';

const router = Router();

router.post('/chat', async (req, res) => {
  const { messages, system } = req.body;
  try {
    const content = await chat(messages, system);
    res.json({ content });
  } catch (err: any) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/chat/stream', async (req, res) => {
  const { messages, system } = req.body;
  try {
    await streamChat(messages, system, res);
  } catch (err: any) {
    console.error('Stream error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

export default router;
