import { Router } from 'express';
import { chat, streamChat } from '../services/claude.js';
import {
  buildOpponentPrompt,
  buildTeammatePrompt,
  buildJudgePrompt,
  buildAnalysisPrompt,
  buildPlayerAnalysisPrompt,
} from '../services/prompts.js';

const router = Router();

// AI debater speaks
router.post('/speak', async (req, res) => {
  const {
    topic, side, opponentSide, stageName, debaterPosition,
    stageType, role, draftArguments, chatHistory, stageTime,
  } = req.body;

  let system: string;
  const isFreeDebate = stageType === 'free';

  if (role === 'opponent') {
    system = buildOpponentPrompt(topic, side, opponentSide, stageName, debaterPosition, stageType, isFreeDebate, stageTime);
  } else {
    system = buildTeammatePrompt(topic, side, opponentSide, stageName, debaterPosition, draftArguments, stageTime, stageType);
  }

  const messages = [...(chatHistory || [])];
  const posLabel = ['', '一辩', '二辩', '三辩', '四辩'][debaterPosition] || '';
  if (isFreeDebate) {
    messages.push({
      role: 'user',
      content: `（自由辩论环节，请以${side}的身份回应对方刚才的发言，简洁有力，控制在150字以内）`,
    });
  } else if (role === 'opponent') {
    messages.push({
      role: 'user',
      content: `现在请你以${side}${posLabel}的身份进行${stageName}。`,
    });
  } else {
    // AI teammate
    messages.push({
      role: 'user',
      content: `现在请你以${side}${posLabel}（队友）的身份进行${stageName}。请基于我方整体论述框架进行发言。`,
    });
  }

  try {
    await streamChat(messages, system, res);
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// AI judge evaluates
router.post('/judge', async (req, res) => {
  const { topic, judgeType, debateRecord } = req.body;

  const system = buildJudgePrompt(judgeType, topic);
  const recordText = debateRecord.map((r: any) =>
    `【${r.stage} - ${r.speaker}】\n${r.content}`
  ).join('\n\n---\n\n');

  const messages = [{
    role: 'user' as const,
    content: `以下是完整的辩论记录，请给出你的判决：\n\n${recordText}`,
  }];

  try {
    const content = await chat(messages, system);
    res.json({ content });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Post-match analysis
router.post('/analyze', async (req, res) => {
  const { topic, userSide, debateRecord } = req.body;

  const system = buildAnalysisPrompt(topic, userSide);
  const recordText = debateRecord.map((r: any) =>
    `【${r.stage} - ${r.speaker}】\n${r.content}`
  ).join('\n\n---\n\n');

  const messages = [{
    role: 'user' as const,
    content: `以下是完整的辩论记录：\n\n${recordText}\n\n请进行复盘分析。`,
  }];

  try {
    const content = await chat(messages, system);
    res.json({ content });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Player analysis
router.post('/analyze-player', async (req, res) => {
  const { topic, playerName, side, debateRecord } = req.body;

  const system = buildPlayerAnalysisPrompt(topic, playerName, side);
  const playerRecords = debateRecord.filter((r: any) => r.speaker === playerName);
  const recordText = playerRecords.map((r: any) =>
    `【${r.stage}】\n${r.content}`
  ).join('\n\n---\n\n');

  const messages = [{
    role: 'user' as const,
    content: `以下是${playerName}在本场辩论中的所有发言：\n\n${recordText}\n\n请分析该选手的表现。`,
  }];

  try {
    const content = await chat(messages, system);
    res.json({ content });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Batch judge: 3 judges in one call
router.post('/judge-all', async (req, res) => {
  const { topic, debateRecord } = req.body;

  const recordText = debateRecord.map((r: any) =>
    `【${r.stage} - ${r.speaker}】\n${r.content}`
  ).join('\n\n---\n\n');

  const judgeTypes: Array<'logic' | 'expression' | 'strategy'> = ['logic', 'expression', 'strategy'];
  const judgeNames = { logic: '逻辑评委', expression: '表达评委', strategy: '战术评委' };
  const verdicts: any[] = [];

  try {
    for (const judgeType of judgeTypes) {
      const system = buildJudgePrompt(judgeType, topic);
      const messages = [{
        role: 'user' as const,
        content: `以下是完整的辩论记录，请给出你的判决：\n\n${recordText}`,
      }];
      try {
        const content = await chat(messages, system);
        const parsed = JSON.parse(content);
        verdicts.push({
          judgeId: judgeType,
          judgeName: judgeNames[judgeType],
          scores: parsed.scores,
          winner: parsed.winner,
          reasoning: parsed.reasoning,
          highlights: parsed.highlights || [],
        });
      } catch {
        verdicts.push({
          judgeId: judgeType,
          judgeName: judgeNames[judgeType],
          scores: { pro: 50, con: 50 },
          winner: 'pro',
          reasoning: '判定出错，请重试',
          highlights: [],
        });
      }
    }

    res.json({ verdicts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
