import type { TimerFormat, DebateFormat, DebateStage } from './types';

// ===== Timer Presets (for standalone timer) =====

export const timerPresets: TimerFormat[] = [
  {
    id: 'standard',
    name: '标准赛制（世辩赛）',
    stages: [
      { name: '正方一辩·开篇立论', speaker: '正方一辩', time: 180 },
      { name: '反方一辩·开篇立论', speaker: '反方一辩', time: 180 },
      { name: '正方二辩·驳论', speaker: '正方二辩', time: 180 },
      { name: '反方二辩·驳论', speaker: '反方二辩', time: 180 },
      { name: '正方二辩·质询反方二辩', speaker: '正方二辩 → 反方二辩', time: 180 },
      { name: '反方二辩·质询正方二辩', speaker: '反方二辩 → 正方二辩', time: 180 },
      { name: '正方三辩·质询', speaker: '正方三辩', time: 180 },
      { name: '反方三辩·质询', speaker: '反方三辩', time: 180 },
      { name: '自由辩论', speaker: '双方交替', time: 300 },
      { name: '反方四辩·总结陈词', speaker: '反方四辩', time: 240 },
      { name: '正方四辩·总结陈词', speaker: '正方四辩', time: 240 },
    ],
  },
  {
    id: 'bp',
    name: '英国议会制（BP）',
    stages: [
      { name: '首相/总理发言', speaker: '正方一号', time: 420 },
      { name: '反对党领袖发言', speaker: '反方一号', time: 420 },
      { name: '副首相发言', speaker: '正方二号', time: 420 },
      { name: '反对党副领袖发言', speaker: '反方二号', time: 420 },
      { name: '政府议员发言', speaker: '正方三号', time: 420 },
      { name: '反对党议员发言', speaker: '反方三号', time: 420 },
      { name: '政府党鞭总结', speaker: '正方四号', time: 420 },
      { name: '反对党党鞭总结', speaker: '反方四号', time: 420 },
    ],
  },
  {
    id: 'policy',
    name: '政策辩论赛制',
    stages: [
      { name: '正方一辩·立论', speaker: '正方一辩', time: 480 },
      { name: '反方三辩·质询', speaker: '反方三辩 → 正方一辩', time: 180 },
      { name: '反方一辩·立论', speaker: '反方一辩', time: 480 },
      { name: '正方三辩·质询', speaker: '正方三辩 → 反方一辩', time: 180 },
      { name: '正方二辩·驳论', speaker: '正方二辩', time: 480 },
      { name: '反方一辩·质询', speaker: '反方一辩 → 正方二辩', time: 180 },
      { name: '反方二辩·驳论', speaker: '反方二辩', time: 480 },
      { name: '正方一辩·质询', speaker: '正方一辩 → 反方二辩', time: 180 },
      { name: '自由辩论', speaker: '双方交替', time: 480 },
      { name: '反方四辩·总结陈词', speaker: '反方四辩', time: 300 },
      { name: '正方四辩·总结陈词', speaker: '正方四辩', time: 300 },
    ],
  },
  {
    id: 'oregon',
    name: '奥瑞冈赛制',
    stages: [
      { name: '正方一辩·建构', speaker: '正方一辩', time: 360 },
      { name: '反方三辩·质询正方一辩', speaker: '反方三辩 → 正方一辩', time: 180 },
      { name: '反方一辩·建构', speaker: '反方一辩', time: 360 },
      { name: '正方三辩·质询反方一辩', speaker: '正方三辩 → 反方一辩', time: 180 },
      { name: '正方二辩·驳论', speaker: '正方二辩', time: 240 },
      { name: '反方三辩·质询正方二辩', speaker: '反方三辩 → 正方二辩', time: 180 },
      { name: '反方二辩·驳论', speaker: '反方二辩', time: 240 },
      { name: '正方三辩·质询反方二辩', speaker: '正方三辩 → 反方二辩', time: 180 },
      { name: '反方三辩·总结', speaker: '反方三辩', time: 240 },
      { name: '正方三辩·总结', speaker: '正方三辩', time: 240 },
    ],
  },
  {
    id: 'xinguobian',
    name: '新国辩赛制',
    stages: [
      { name: '正方一辩·立论', speaker: '正方一辩', time: 180 },
      { name: '反方一辩·立论', speaker: '反方一辩', time: 180 },
      { name: '正方二辩·攻辩', speaker: '正方二辩 → 反方二辩/三辩', time: 90 },
      { name: '反方二辩·攻辩', speaker: '反方二辩 → 正方二辩/三辩', time: 90 },
      { name: '正方三辩·攻辩', speaker: '正方三辩 → 反方二辩/三辩', time: 90 },
      { name: '反方三辩·攻辩', speaker: '反方三辩 → 正方二辩/三辩', time: 90 },
      { name: '正方一辩·攻辩小结', speaker: '正方一辩', time: 90 },
      { name: '反方一辩·攻辩小结', speaker: '反方一辩', time: 90 },
      { name: '自由辩论', speaker: '双方交替', time: 300 },
      { name: '反方四辩·总结陈词', speaker: '反方四辩', time: 240 },
      { name: '正方四辩·总结陈词', speaker: '正方四辩', time: 240 },
    ],
  },
  {
    id: 'huabian',
    name: '华辩赛制（世界华语辩论锦标赛）',
    stages: [
      { name: '正方一辩·开篇陈词', speaker: '正方一辩', time: 180 },
      { name: '反方一辩·开篇陈词', speaker: '反方一辩', time: 180 },
      { name: '正方二辩·质询', speaker: '正方二辩 → 反方一/二/四辩', time: 120 },
      { name: '反方二辩·质询', speaker: '反方二辩 → 正方一/二/四辩', time: 120 },
      { name: '正方三辩·质询', speaker: '正方三辩 → 反方一/三/四辩', time: 120 },
      { name: '反方三辩·质询', speaker: '反方三辩 → 正方一/三/四辩', time: 120 },
      { name: '正方一辩·质询小结', speaker: '正方一辩', time: 90 },
      { name: '反方一辩·质询小结', speaker: '反方一辩', time: 90 },
      { name: '对辩·正方二辩 vs 反方二辩', speaker: '正方二辩 ↔ 反方二辩', time: 180 },
      { name: '对辩·正方三辩 vs 反方三辩', speaker: '正方三辩 ↔ 反方三辩', time: 180 },
      { name: '自由辩论', speaker: '双方交替', time: 240 },
      { name: '反方四辩·总结陈词', speaker: '反方四辩', time: 210 },
      { name: '正方四辩·总结陈词', speaker: '正方四辩', time: 210 },
    ],
  },
  {
    id: 'guodazhuan',
    name: '国际大专辩论赛（经典赛制）',
    stages: [
      { name: '正方一辩·立论陈词', speaker: '正方一辩', time: 180 },
      { name: '反方一辩·立论陈词', speaker: '反方一辩', time: 180 },
      { name: '正方二辩·发言', speaker: '正方二辩', time: 180 },
      { name: '反方二辩·发言', speaker: '反方二辩', time: 180 },
      { name: '正方三辩·发言', speaker: '正方三辩', time: 180 },
      { name: '反方三辩·发言', speaker: '反方三辩', time: 180 },
      { name: '自由辩论', speaker: '双方交替', time: 240 },
      { name: '反方四辩·总结陈词', speaker: '反方四辩', time: 240 },
      { name: '正方四辩·总结陈词', speaker: '正方四辩', time: 240 },
    ],
  },
  {
    id: 'xingjian',
    name: '星辩赛制',
    stages: [
      { name: '正方一辩·开篇立论', speaker: '正方一辩', time: 210 },
      { name: '反方一辩·开篇立论', speaker: '反方一辩', time: 210 },
      { name: '正方二辩·质询反方一辩/二辩', speaker: '正方二辩 → 反方', time: 120 },
      { name: '反方二辩·质询正方一辩/二辩', speaker: '反方二辩 → 正方', time: 120 },
      { name: '正方二辩·质询小结', speaker: '正方二辩', time: 90 },
      { name: '反方二辩·质询小结', speaker: '反方二辩', time: 90 },
      { name: '对辩·正方三辩 vs 反方三辩', speaker: '正方三辩 ↔ 反方三辩', time: 180 },
      { name: '自由辩论', speaker: '双方交替', time: 240 },
      { name: '反方四辩·总结陈词', speaker: '反方四辩', time: 210 },
      { name: '正方四辩·总结陈词', speaker: '正方四辩', time: 210 },
    ],
  },
];

// ===== Debate Simulation Formats =====

export const debateFormats: DebateFormat[] = [
  {
    id: 'standard',
    name: '标准赛制',
    stages: [
      { name: '开篇立论', side: 'pro', debater: 1, time: 180, type: 'speech' },
      { name: '开篇立论', side: 'con', debater: 1, time: 180, type: 'speech' },
      { name: '驳论', side: 'pro', debater: 2, time: 180, type: 'speech' },
      { name: '驳论', side: 'con', debater: 2, time: 180, type: 'speech' },
      { name: '质询', side: 'pro', debater: 2, time: 180, type: 'crossfire', note: '质询对方二辩' },
      { name: '质询', side: 'con', debater: 2, time: 180, type: 'crossfire', note: '质询对方二辩' },
      { name: '质询小结', side: 'pro', debater: 3, time: 180, type: 'speech' },
      { name: '质询小结', side: 'con', debater: 3, time: 180, type: 'speech' },
      { name: '自由辩论', side: 'both', debater: 0, time: 300, type: 'free' },
      { name: '总结陈词', side: 'con', debater: 4, time: 240, type: 'summary' },
      { name: '总结陈词', side: 'pro', debater: 4, time: 240, type: 'summary' },
    ],
  },
  {
    id: 'bp',
    name: '英国议会制（BP）',
    stages: [
      { name: '首相发言', side: 'pro', debater: 1, time: 420, type: 'speech' },
      { name: '反对党领袖发言', side: 'con', debater: 1, time: 420, type: 'speech' },
      { name: '副首相发言', side: 'pro', debater: 2, time: 420, type: 'speech' },
      { name: '反对党副领袖发言', side: 'con', debater: 2, time: 420, type: 'speech' },
      { name: '政府议员发言', side: 'pro', debater: 3, time: 420, type: 'speech' },
      { name: '反对党议员发言', side: 'con', debater: 3, time: 420, type: 'speech' },
      { name: '政府党鞭总结', side: 'pro', debater: 4, time: 420, type: 'summary' },
      { name: '反对党党鞭总结', side: 'con', debater: 4, time: 420, type: 'summary' },
    ],
  },
  {
    id: 'policy',
    name: '政策辩论',
    stages: [
      { name: '立论', side: 'pro', debater: 1, time: 480, type: 'speech' },
      { name: '质询', side: 'con', debater: 3, time: 180, type: 'crossfire', note: '质询对方一辩' },
      { name: '立论', side: 'con', debater: 1, time: 480, type: 'speech' },
      { name: '质询', side: 'pro', debater: 3, time: 180, type: 'crossfire', note: '质询对方一辩' },
      { name: '驳论', side: 'pro', debater: 2, time: 480, type: 'speech' },
      { name: '质询', side: 'con', debater: 1, time: 180, type: 'crossfire', note: '质询对方二辩' },
      { name: '驳论', side: 'con', debater: 2, time: 480, type: 'speech' },
      { name: '质询', side: 'pro', debater: 1, time: 180, type: 'crossfire', note: '质询对方二辩' },
      { name: '自由辩论', side: 'both', debater: 0, time: 480, type: 'free' },
      { name: '总结陈词', side: 'con', debater: 4, time: 300, type: 'summary' },
      { name: '总结陈词', side: 'pro', debater: 4, time: 300, type: 'summary' },
    ],
  },
  {
    id: 'xinguobian',
    name: '新国辩赛制',
    stages: [
      { name: '立论', side: 'pro', debater: 1, time: 180, type: 'speech' },
      { name: '立论', side: 'con', debater: 1, time: 180, type: 'speech' },
      { name: '攻辩', side: 'pro', debater: 2, time: 90, type: 'crossfire', note: '质询对方二辩或三辩' },
      { name: '攻辩', side: 'con', debater: 2, time: 90, type: 'crossfire', note: '质询对方二辩或三辩' },
      { name: '攻辩', side: 'pro', debater: 3, time: 90, type: 'crossfire', note: '质询对方二辩或三辩' },
      { name: '攻辩', side: 'con', debater: 3, time: 90, type: 'crossfire', note: '质询对方二辩或三辩' },
      { name: '攻辩小结', side: 'pro', debater: 1, time: 90, type: 'speech' },
      { name: '攻辩小结', side: 'con', debater: 1, time: 90, type: 'speech' },
      { name: '自由辩论', side: 'both', debater: 0, time: 300, type: 'free' },
      { name: '总结陈词', side: 'con', debater: 4, time: 240, type: 'summary' },
      { name: '总结陈词', side: 'pro', debater: 4, time: 240, type: 'summary' },
    ],
  },
  {
    id: 'huabian',
    name: '华辩赛制',
    stages: [
      { name: '开篇陈词', side: 'pro', debater: 1, time: 180, type: 'speech' },
      { name: '开篇陈词', side: 'con', debater: 1, time: 180, type: 'speech' },
      { name: '质询', side: 'pro', debater: 2, time: 120, type: 'crossfire', note: '质询对方一/二/四辩' },
      { name: '质询', side: 'con', debater: 2, time: 120, type: 'crossfire', note: '质询对方一/二/四辩' },
      { name: '质询', side: 'pro', debater: 3, time: 120, type: 'crossfire', note: '质询对方一/三/四辩' },
      { name: '质询', side: 'con', debater: 3, time: 120, type: 'crossfire', note: '质询对方一/三/四辩' },
      { name: '质询小结', side: 'pro', debater: 1, time: 90, type: 'speech' },
      { name: '质询小结', side: 'con', debater: 1, time: 90, type: 'speech' },
      { name: '对辩', side: 'pro', debater: 2, time: 180, type: 'crossfire', note: '二辩对辩' },
      { name: '对辩', side: 'pro', debater: 3, time: 180, type: 'crossfire', note: '三辩对辩' },
      { name: '自由辩论', side: 'both', debater: 0, time: 240, type: 'free' },
      { name: '总结陈词', side: 'con', debater: 4, time: 210, type: 'summary' },
      { name: '总结陈词', side: 'pro', debater: 4, time: 210, type: 'summary' },
    ],
  },
  {
    id: 'guodazhuan',
    name: '国际大专辩论赛',
    stages: [
      { name: '立论陈词', side: 'pro', debater: 1, time: 180, type: 'speech' },
      { name: '立论陈词', side: 'con', debater: 1, time: 180, type: 'speech' },
      { name: '发言', side: 'pro', debater: 2, time: 180, type: 'speech' },
      { name: '发言', side: 'con', debater: 2, time: 180, type: 'speech' },
      { name: '发言', side: 'pro', debater: 3, time: 180, type: 'speech' },
      { name: '发言', side: 'con', debater: 3, time: 180, type: 'speech' },
      { name: '自由辩论', side: 'both', debater: 0, time: 240, type: 'free' },
      { name: '总结陈词', side: 'con', debater: 4, time: 240, type: 'summary' },
      { name: '总结陈词', side: 'pro', debater: 4, time: 240, type: 'summary' },
    ],
  },
  {
    id: 'xingjian',
    name: '星辩赛制',
    stages: [
      { name: '开篇立论', side: 'pro', debater: 1, time: 210, type: 'speech' },
      { name: '开篇立论', side: 'con', debater: 1, time: 210, type: 'speech' },
      { name: '质询', side: 'pro', debater: 2, time: 120, type: 'crossfire', note: '质询对方一辩或二辩' },
      { name: '质询', side: 'con', debater: 2, time: 120, type: 'crossfire', note: '质询对方一辩或二辩' },
      { name: '质询小结', side: 'pro', debater: 2, time: 90, type: 'speech' },
      { name: '质询小结', side: 'con', debater: 2, time: 90, type: 'speech' },
      { name: '对辩', side: 'pro', debater: 3, time: 180, type: 'crossfire', note: '三辩对辩' },
      { name: '自由辩论', side: 'both', debater: 0, time: 240, type: 'free' },
      { name: '总结陈词', side: 'con', debater: 4, time: 210, type: 'summary' },
      { name: '总结陈词', side: 'pro', debater: 4, time: 210, type: 'summary' },
    ],
  },
];

// Helper: get side label
export function getSideLabel(side: 'pro' | 'con'): string {
  return side === 'pro' ? '正方' : '反方';
}

// Helper: get debater label
export function getDebaterLabel(position: number): string {
  const labels = ['', '一辩', '二辩', '三辩', '四辩'];
  return labels[position] || '';
}

// Helper: get full speaker name
export function getSpeakerName(side: 'pro' | 'con', position: number): string {
  return `${getSideLabel(side)}${getDebaterLabel(position)}`;
}
