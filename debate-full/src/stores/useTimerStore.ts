import { create } from 'zustand';
import type { TimerStage } from '../lib/types';
import { timerPresets } from '../lib/debate-formats';

interface TimerState {
  stages: TimerStage[];
  currentStageIndex: number;
  remainingSeconds: number;
  running: boolean;
  started: boolean;

  setStages: (stages: TimerStage[]) => void;
  loadPreset: (presetId: string) => void;
  addStage: () => void;
  removeStage: (index: number) => void;
  updateStage: (index: number, field: keyof TimerStage, value: string | number) => void;
  start: () => void;
  tick: () => void;
  pause: () => void;
  resume: () => void;
  nextStage: () => void;
  prevStage: () => void;
  stop: () => void;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  stages: timerPresets[0].stages.map(s => ({ ...s })),
  currentStageIndex: 0,
  remainingSeconds: 0,
  running: false,
  started: false,

  setStages: (stages) => set({ stages }),

  loadPreset: (presetId) => {
    const preset = timerPresets.find(p => p.id === presetId);
    if (preset) {
      set({ stages: preset.stages.map(s => ({ ...s })) });
    } else {
      set({ stages: [{ name: '环节 1', speaker: '', time: 180 }] });
    }
  },

  addStage: () => {
    const { stages } = get();
    set({ stages: [...stages, { name: `环节 ${stages.length + 1}`, speaker: '', time: 180 }] });
  },

  removeStage: (index) => {
    const { stages } = get();
    set({ stages: stages.filter((_, i) => i !== index) });
  },

  updateStage: (index, field, value) => {
    const { stages } = get();
    const updated = stages.map((s, i) => (i === index ? { ...s, [field]: value } : s));
    set({ stages: updated });
  },

  start: () => {
    const { stages } = get();
    if (stages.length === 0) return;
    set({
      started: true,
      currentStageIndex: 0,
      remainingSeconds: stages[0].time,
      running: false,
    });
  },

  tick: () => {
    set(state => ({ remainingSeconds: state.remainingSeconds - 1 }));
  },

  pause: () => set({ running: false }),
  resume: () => set({ running: true }),

  nextStage: () => {
    const { stages, currentStageIndex } = get();
    if (currentStageIndex < stages.length - 1) {
      const next = currentStageIndex + 1;
      set({
        currentStageIndex: next,
        remainingSeconds: stages[next].time,
        running: false,
      });
    }
  },

  prevStage: () => {
    const { stages, currentStageIndex } = get();
    if (currentStageIndex > 0) {
      const prev = currentStageIndex - 1;
      set({
        currentStageIndex: prev,
        remainingSeconds: stages[prev].time,
        running: false,
      });
    }
  },

  stop: () => set({ running: false, started: false }),
}));
