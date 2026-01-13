// hooks/useTimer.ts - Hook para timer sincronizado

import { useState, useEffect } from 'react';

export const useTimer = (initialRemaining: number = 0) => {
  const [remainingMs, setRemainingMs] = useState(initialRemaining);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning || remainingMs <= 0) return;

    const interval = setInterval(() => {
      setRemainingMs((prev) => {
        const next = prev - 100;
        if (next <= 0) {
          setIsRunning(false);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, remainingMs]);

  const start = (durationMs: number) => {
    setRemainingMs(durationMs);
    setIsRunning(true);
  };

  const stop = () => {
    setIsRunning(false);
  };

  const reset = () => {
    setRemainingMs(0);
    setIsRunning(false);
  };

  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const percentage = initialRemaining > 0 ? (remainingMs / initialRemaining) * 100 : 0;

  return {
    remainingMs,
    remainingSeconds,
    percentage,
    isRunning,
    start,
    stop,
    reset,
  };
};
