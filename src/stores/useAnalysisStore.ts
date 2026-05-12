import { create } from 'zustand';
import type { AnalysisResult, JudgeVerdict } from '../lib/types';

interface AnalysisState {
  result: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  setResult: (r: AnalysisResult) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  result: null,
  isLoading: false,
  error: null,
  setResult: (r) => set({ result: r, isLoading: false, error: null }),
  setLoading: (v) => set({ isLoading: v }),
  setError: (e) => set({ error: e, isLoading: false }),
  reset: () => set({ result: null, isLoading: false, error: null }),
}));
