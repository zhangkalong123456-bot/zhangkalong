// ===== Timer & Debate Format Types =====

export interface TimerStage {
  name: string;
  speaker: string;
  time: number; // seconds
}

export interface DebateStage {
  name: string;
  side: 'pro' | 'con' | 'both';
  debater: 0 | 1 | 2 | 3 | 4;
  time: number;
  type: 'speech' | 'crossfire' | 'free' | 'summary';
  note?: string;
}

export interface DebateFormat {
  id: string;
  name: string;
  stages: DebateStage[];
}

export interface TimerFormat {
  id: string;
  name: string;
  stages: TimerStage[];
}

// ===== Debate Session Types =====

export type DebateMode = '1v4' | '2v4' | '3v4' | '4v4' | '4v4-full';

export interface PlayerAssignment {
  side: 'pro' | 'con';
  position: 1 | 2 | 3 | 4;
  type: 'human' | 'ai-teammate' | 'ai-opponent';
  name: string;
  draftArguments?: string;
}

export interface DebateMessage {
  id: string;
  role: 'user' | 'ai-opponent' | 'ai-teammate' | 'judge' | 'system';
  speaker: string;
  content: string;
  stageIndex: number;
  timestamp: number;
}

export interface DebateRecord {
  side: string;
  speaker: string;
  stage: string;
  content: string;
}

export interface DebateSession {
  id: string;
  topic: string;
  format: DebateFormat;
  mode: DebateMode;
  userSide: 'pro' | 'con';
  players: PlayerAssignment[];
  currentStageIndex: number;
  status: 'setup' | 'running' | 'paused' | 'finished';
  messages: DebateMessage[];
  record: DebateRecord[];
}

// ===== Judge Types =====

export type JudgeType = 'logic' | 'expression' | 'strategy';

export interface JudgePersonality {
  id: JudgeType;
  name: string;
  title: string;
  description: string;
}

export interface JudgeVerdict {
  judgeId: JudgeType;
  judgeName: string;
  scores: { pro: number; con: number };
  winner: 'pro' | 'con';
  reasoning: string;
  highlights: string[];
}

// ===== Analysis Types =====

export interface PlayerProfile {
  player: PlayerAssignment;
  strengths: string[];
  weaknesses: string[];
  improvementPlan: string[];
  scores: {
    logic: number;
    expression: number;
    strategy: number;
    evidence: number;
  };
}

export interface ClashPoint {
  topic: string;
  proArgument: string;
  conArgument: string;
  winner: 'pro' | 'con' | 'draw';
  analysis: string;
}

export interface AnalysisResult {
  playerProfiles: PlayerProfile[];
  clashPoints: ClashPoint[];
  verdicts: JudgeVerdict[];
  winner: 'pro' | 'con';
  voteCount: { pro: number; con: number };
  overallFeedback: string;
}

// ===== Workshop Types =====

export interface Annotation {
  id: string;
  from: number;
  to: number;
  text: string;
  author: string;
  timestamp: number;
}

export interface ReviewResult {
  type: 'fallacy' | 'vulnerability' | 'suggestion';
  content: string;
  location?: string;
}
