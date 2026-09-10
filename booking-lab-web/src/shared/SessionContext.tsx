import { createContext, useContext, useEffect, useState } from 'react';

const KEY = 'booking-lab.sessionId';

type Ctx = {
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
};

const SessionContext = createContext<Ctx>({
  sessionId: null,
  setSessionId: () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionIdState] = useState<string | null>(() =>
    typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null,
  );

  useEffect(() => {
    if (sessionId) window.localStorage.setItem(KEY, sessionId);
    else window.localStorage.removeItem(KEY);
  }, [sessionId]);

  return (
    <SessionContext.Provider value={{ sessionId, setSessionId: setSessionIdState }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  return useContext(SessionContext);
}
