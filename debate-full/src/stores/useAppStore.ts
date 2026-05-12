import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  apiKey: string;
  setApiKey: (key: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      apiKey: '',
      setApiKey: (key: string) => set({ apiKey: key }),
    }),
    { name: 'debate-master-app' }
  )
);
