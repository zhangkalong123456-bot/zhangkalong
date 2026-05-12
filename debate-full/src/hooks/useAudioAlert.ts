import { useCallback } from 'react';

export function useAudioAlert() {
  const beep = useCallback((frequency = 800, duration = 200) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = frequency;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + duration / 1000);
    } catch {
      // ignore audio errors
    }
  }, []);

  const beepWarning = useCallback(() => beep(600, 300), [beep]);

  const beepEnd = useCallback(() => {
    beep(400, 150);
    setTimeout(() => beep(400, 150), 200);
    setTimeout(() => beep(300, 400), 400);
  }, [beep]);

  return { beep, beepWarning, beepEnd };
}
