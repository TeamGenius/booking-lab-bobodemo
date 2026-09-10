import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { TutorialRunner, type TutorialMode } from './TutorialRunner';
import type { TutorialScript } from './scripts';

type Active = { script: TutorialScript; mode: TutorialMode } | null;

type Ctx = {
  active: Active;
  start: (script: TutorialScript, mode: TutorialMode) => void;
  stop: () => void;
};

const TutorialContext = createContext<Ctx>({
  active: null,
  start: () => {},
  stop: () => {},
});

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<Active>(null);
  const start = useCallback(
    (script: TutorialScript, mode: TutorialMode) => setActive({ script, mode }),
    [],
  );
  const stop = useCallback(() => setActive(null), []);
  const value = useMemo<Ctx>(
    () => ({
      active,
      start,
      stop,
    }),
    [active, start, stop],
  );
  return (
    <TutorialContext.Provider value={value}>
      {children}
      {active && (
        <TutorialRunner
          script={active.script}
          mode={active.mode}
          onComplete={stop}
          onCancel={stop}
        />
      )}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  return useContext(TutorialContext);
}
