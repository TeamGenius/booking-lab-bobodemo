import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type PrimaryAction = {
  label: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  helper?: string;
};

type Ctx = {
  action: PrimaryAction | null;
  setAction: (a: PrimaryAction | null) => void;
};

const BookingActionsContext = createContext<Ctx>({ action: null, setAction: () => {} });

export function BookingActionsProvider({ children }: { children: React.ReactNode }) {
  const [action, setActionState] = useState<PrimaryAction | null>(null);
  const setAction = useCallback((a: PrimaryAction | null) => setActionState(a), []);
  const value = useMemo(() => ({ action, setAction }), [action, setAction]);
  return <BookingActionsContext.Provider value={value}>{children}</BookingActionsContext.Provider>;
}

export function useBookingActions() {
  return useContext(BookingActionsContext);
}
