import { useEffect, useRef } from 'react';
import { useTimerStore } from '../stores/useTimerStore';
import { useAudioAlert } from './useAudioAlert';

export function useTimer() {
  const { running, remainingSeconds, tick, pause, stages, currentStageIndex } = useTimerStore();
  const { beepWarning, beepEnd } = useAudioAlert();
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => {
        const state = useTimerStore.getState();
        if (state.remainingSeconds === 31) {
          beepWarning();
        }
        if (state.remainingSeconds <= 1) {
          beepEnd();
          pause();
          // Auto advance after 2 seconds
          const { currentStageIndex, stages } = state;
          if (currentStageIndex < stages.length - 1) {
            setTimeout(() => useTimerStore.getState().nextStage(), 2000);
          }
        }
        tick();
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, tick, pause, beepWarning, beepEnd]);

  return {
    stages,
    currentStageIndex,
    remainingSeconds,
    running,
    currentStage: stages[currentStageIndex],
  };
}
