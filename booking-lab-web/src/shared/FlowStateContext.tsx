import { useLocation } from 'react-router-dom';
import { useQuery } from 'urql';
import { BOOKING_SESSION_QUERY } from '../client/gql';
import { useSessionContext } from './SessionContext';

export type FlowStepId =
  | 'landing'
  | 'services'
  | 'schedule'
  | 'review'
  | 'confirmation'
  | 'gift-claim-landing'
  | 'gift-claim-schedule'
  | 'unknown';

export type FlowMode = 'self' | 'gift-schedule-now' | 'gift-schedule-later' | 'unknown';

export type FlowSession = {
  id: string;
  status: string;
  claimToken: string | null;
  confirmationCode: string | null;
  priceCents: number | null;
  selections: {
    siteId: string | null;
    serviceId: string | null;
    slotId: string | null;
    isGiftBooking: boolean;
    mode: 'SELF' | 'GIFT_SCHEDULE_NOW' | 'GIFT_SCHEDULE_LATER';
    purchaserName: string | null;
    purchaserEmail: string | null;
    recipientName: string | null;
    recipientEmail: string | null;
  };
  site: { id: string; name: string; city: string; addressLine: string } | null;
  service: {
    id: string;
    name: string;
    description: string;
    priceCents: number;
    durationMinutes: number;
  } | null;
  slot: { id: string; startsAt: string; employeeName: string } | null;
};

export type FlowState = {
  sessionId: string | null;
  session: FlowSession | null;
  stepId: FlowStepId;
  mode: FlowMode;
  isGiftPath: boolean;
};

function pathToStep(pathname: string): FlowStepId {
  if (pathname === '/' || pathname === '') return 'landing';
  if (pathname === '/booking') return 'services';
  if (pathname === '/booking/schedule') return 'schedule';
  if (pathname === '/booking/review') return 'review';
  if (pathname === '/booking/confirmation') return 'confirmation';
  if (/^\/gift\/[^/]+\/schedule$/.test(pathname)) return 'gift-claim-schedule';
  if (/^\/gift\/[^/]+$/.test(pathname)) return 'gift-claim-landing';
  return 'unknown';
}

function mapMode(s: FlowSession | null): FlowMode {
  if (!s) return 'unknown';
  if (s.selections.mode === 'GIFT_SCHEDULE_NOW') return 'gift-schedule-now';
  if (s.selections.mode === 'GIFT_SCHEDULE_LATER') return 'gift-schedule-later';
  if (s.selections.mode === 'SELF') return 'self';
  return 'unknown';
}

export function useFlowState(): FlowState {
  const location = useLocation();
  const { sessionId } = useSessionContext();
  const [sessionResult] = useQuery<{ bookingSession: FlowSession | null }>({
    query: BOOKING_SESSION_QUERY,
    variables: { id: sessionId ?? '' },
    pause: !sessionId,
    requestPolicy: 'cache-and-network',
  });
  const session = sessionResult.data?.bookingSession ?? null;
  const stepId = pathToStep(location.pathname);
  return {
    sessionId,
    session,
    stepId,
    mode: mapMode(session),
    isGiftPath: location.pathname.startsWith('/gift'),
  };
}
