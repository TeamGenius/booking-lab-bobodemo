import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useClient } from 'urql';
import { START_SESSION_MUTATION } from '../client/gql';

const KEY = 'booking-lab.sessionId';

type Ctx = {
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  ensureSession: () => Promise<string>;
  resetSession: () => Promise<string>;
};

const SessionContext = createContext<Ctx>({
  sessionId: null,
  setSessionId: () => {},
  ensureSession: async () => '',
  resetSession: async () => '',
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const client = useClient();
  const [sessionId, setSessionIdState] = useState<string | null>(() =>
    typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null,
  );
  const sessionRef = useRef(sessionId);
  const creationRef = useRef<Promise<string> | null>(null);

  const setSessionId = useCallback((id: string | null) => {
    sessionRef.current = id;
    setSessionIdState(id);
  }, []);

  const createSession = useCallback(() => {
    if (creationRef.current) return creationRef.current;
    creationRef.current = client
      .mutation(START_SESSION_MUTATION, {})
      .toPromise()
      .then((result) => {
        const id = result.data?.startBookingSession?.id as string | undefined;
        if (!id) throw new Error(result.error?.message ?? 'Unable to start booking session');
        setSessionId(id);
        return id;
      })
      .finally(() => {
        creationRef.current = null;
      });
    return creationRef.current;
  }, [client, setSessionId]);

  const ensureSession = useCallback(
    () => (sessionRef.current ? Promise.resolve(sessionRef.current) : createSession()),
    [createSession],
  );

  const resetSession = useCallback(async () => {
    setSessionId(null);
    return createSession();
  }, [createSession, setSessionId]);

  useEffect(() => {
    void ensureSession();
  }, [ensureSession]);

  useEffect(() => {
    if (sessionId) window.localStorage.setItem(KEY, sessionId);
    else window.localStorage.removeItem(KEY);
  }, [sessionId]);

  return (
    <SessionContext.Provider value={{ sessionId, setSessionId, ensureSession, resetSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  return useContext(SessionContext);
}
