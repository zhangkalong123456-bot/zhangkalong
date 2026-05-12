import { create } from 'zustand';
import type {
  DebateSession, DebateFormat, DebateMode, DebateStage,
  PlayerAssignment, DebateMessage, DebateRecord, JudgeVerdict,
} from '../lib/types';
import { getSideLabel, getDebaterLabel } from '../lib/debate-formats';

interface DebateState {
  session: DebateSession | null;
  isGenerating: boolean;
  ttsEnabled: boolean;
  verdicts: JudgeVerdict[];
  savedRecordId: number | null;

  // Setup
  initSession: (config: {
    topic: string;
    format: DebateFormat;
    mode: DebateMode;
    userSide: 'pro' | 'con';
    humanPositions: number[];
    draftArguments: Record<string, string>;
  }) => void;

  // Runtime
  setGenerating: (v: boolean) => void;
  addMessage: (msg: Omit<DebateMessage, 'id' | 'timestamp'>) => void;
  addRecord: (rec: DebateRecord) => void;
  advanceStage: () => void;
  setStatus: (status: DebateSession['status']) => void;
  setTtsEnabled: (v: boolean) => void;
  setVerdicts: (v: JudgeVerdict[]) => void;
  setSavedRecordId: (id: number | null) => void;
  reset: () => void;

  // Computed helpers
  getCurrentStage: () => DebateStage | null;
  isUserTurn: () => boolean;
  getCurrentSpeakerName: () => string;
}

function buildPlayers(
  mode: DebateMode,
  userSide: 'pro' | 'con',
  humanPositions: number[],
  draftArguments: Record<string, string>,
): PlayerAssignment[] {
  const opponentSide = userSide === 'pro' ? 'con' : 'pro';
  const players: PlayerAssignment[] = [];

  // User's team
  for (let pos = 1; pos <= 4; pos++) {
    const isHuman = humanPositions.includes(pos);
    players.push({
      side: userSide,
      position: pos as 1 | 2 | 3 | 4,
      type: isHuman ? 'human' : 'ai-teammate',
      name: `${getSideLabel(userSide)}${getDebaterLabel(pos)}`,
      draftArguments: draftArguments[`${userSide}-${pos}`],
    });
  }

  // Opponent's team
  if (mode !== '4v4-full') {
    for (let pos = 1; pos <= 4; pos++) {
      players.push({
        side: opponentSide,
        position: pos as 1 | 2 | 3 | 4,
        type: 'ai-opponent',
        name: `${getSideLabel(opponentSide)}${getDebaterLabel(pos)}`,
      });
    }
  }

  return players;
}

export const useDebateStore = create<DebateState>((set, get) => ({
  session: null,
  isGenerating: false,
  ttsEnabled: false,
  verdicts: [],
  savedRecordId: null,

  initSession: ({ topic, format, mode, userSide, humanPositions, draftArguments }) => {
    const players = buildPlayers(mode, userSide, humanPositions, draftArguments);
    set({
      session: {
        id: Date.now().toString(),
        topic,
        format,
        mode,
        userSide,
        players,
        currentStageIndex: 0,
        status: 'running',
        messages: [],
        record: [],
      },
      verdicts: [],
      isGenerating: false,
    });
  },

  setGenerating: (v) => set({ isGenerating: v }),

  addMessage: (msg) => {
    set(state => {
      if (!state.session) return state;
      const newMsg: DebateMessage = {
        ...msg,
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
      };
      return {
        session: {
          ...state.session,
          messages: [...state.session.messages, newMsg],
        },
      };
    });
  },

  addRecord: (rec) => {
    set(state => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          record: [...state.session.record, rec],
        },
      };
    });
  },

  advanceStage: () => {
    set(state => {
      if (!state.session) return state;
      const next = state.session.currentStageIndex + 1;
      if (next >= state.session.format.stages.length) {
        return { session: { ...state.session, status: 'finished' } };
      }
      return {
        session: { ...state.session, currentStageIndex: next },
        isGenerating: false,
      };
    });
  },

  setStatus: (status) => {
    set(state => {
      if (!state.session) return state;
      return { session: { ...state.session, status } };
    });
  },

  setTtsEnabled: (v) => set({ ttsEnabled: v }),
  setVerdicts: (v) => set({ verdicts: v }),
  setSavedRecordId: (id) => set({ savedRecordId: id }),

  reset: () => set({ session: null, verdicts: [], isGenerating: false, savedRecordId: null }),

  getCurrentStage: () => {
    const { session } = get();
    if (!session) return null;
    return session.format.stages[session.currentStageIndex] || null;
  },

  isUserTurn: () => {
    const { session } = get();
    if (!session) return false;
    const stage = session.format.stages[session.currentStageIndex];
    if (!stage) return false;
    if (stage.side === 'both') return true;

    // Check if the speaking side has a human player at this position
    const speakingSide = stage.side;
    const isUserSide = speakingSide === session.userSide;
    if (!isUserSide) return false;

    const player = session.players.find(
      p => p.side === speakingSide && p.position === stage.debater
    );
    return player?.type === 'human';
  },

  getCurrentSpeakerName: () => {
    const { session } = get();
    if (!session) return '';
    const stage = session.format.stages[session.currentStageIndex];
    if (!stage) return '';
    if (stage.side === 'both') return '双方交替';
    return `${getSideLabel(stage.side)}${getDebaterLabel(stage.debater)}`;
  },
}));
