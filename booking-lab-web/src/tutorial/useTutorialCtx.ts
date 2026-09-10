import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClient } from 'urql';
import {
  AVAILABLE_SLOTS_QUERY,
  CLAIM_GIFT_MUTATION,
  FINALIZE_GIFT_BOOKING_MUTATION,
  MAKE_SELECTIONS_MUTATION,
  PAY_AND_FINALIZE_MUTATION,
  SCHEDULE_CLAIMED_MUTATION,
  SITES_QUERY,
  START_SESSION_MUTATION,
} from '../client/gql';
import { useSessionContext } from '../shared/SessionContext';

const KEY_SITE = 'booking-lab.selection.siteId';
const KEY_SVC = 'booking-lab.selection.serviceId';

export type FinalizeResult = { id: string; claimToken: string | null };

export type TutorialCtx = {
  navigate: (to: string, opts?: { replace?: boolean }) => void;
  getSessionId: () => string | null;
  setSessionId: (id: string | null) => void;
  ensureSession: () => Promise<string>;
  chooseServiceAndSite: () => Promise<{ siteId: string; serviceId: string }>;
  pickFirstSlot: () => Promise<string>;
  setMode: (mode: 'SELF' | 'GIFT_SCHEDULE_NOW' | 'GIFT_SCHEDULE_LATER') => Promise<void>;
  payAndFinalize: (input: {
    purchaserName: string;
    purchaserEmail: string;
    recipientName?: string;
    recipientEmail?: string;
  }) => Promise<FinalizeResult>;
  finalizeGift: (input: {
    purchaserName: string;
    purchaserEmail: string;
    recipientName: string;
    recipientEmail: string;
  }) => Promise<FinalizeResult>;
  claimGift: (claimToken: string, recipientEmail: string) => Promise<string>;
  scheduleClaimed: (claimToken: string) => Promise<void>;
  reset: () => void;
};

export function useTutorialCtx(): TutorialCtx {
  const client = useClient();
  const navigate = useNavigate();
  const { sessionId, setSessionId } = useSessionContext();
  const sessionRef = useRef<string | null>(sessionId);
  useEffect(() => {
    sessionRef.current = sessionId;
  }, [sessionId]);

  const getSessionId = useCallback(() => sessionRef.current, []);

  const ensureSession = useCallback(async () => {
    if (sessionRef.current) return sessionRef.current;
    const res = await client.mutation(START_SESSION_MUTATION, {}).toPromise();
    const id = res.data?.startBookingSession?.id as string | undefined;
    if (!id) throw new Error('startBookingSession returned no id');
    sessionRef.current = id;
    setSessionId(id);
    return id;
  }, [client, setSessionId]);

  const chooseServiceAndSite = useCallback(async () => {
    const sid = await ensureSession();
    const sitesRes = await client.query(SITES_QUERY, {}).toPromise();
    const sites = sitesRes.data?.sites as
      | Array<{ id: string; services: Array<{ id: string }> }>
      | undefined;
    const site = sites?.[0];
    const service = site?.services?.[0];
    if (!site || !service) throw new Error('No sites/services in mock schema');
    window.localStorage.setItem(KEY_SITE, site.id);
    window.localStorage.setItem(KEY_SVC, service.id);
    await client
      .mutation(MAKE_SELECTIONS_MUTATION, {
        sessionId: sid,
        input: { siteId: site.id, serviceId: service.id },
      })
      .toPromise();
    return { siteId: site.id, serviceId: service.id };
  }, [client, ensureSession]);

  const pickFirstSlot = useCallback(async () => {
    const sid = await ensureSession();
    const { serviceId } = await chooseServiceAndSite();
    const slotsRes = await client
      .query(AVAILABLE_SLOTS_QUERY, { serviceId })
      .toPromise();
    const slots = slotsRes.data?.availableSlots as Array<{ id: string }> | undefined;
    const slot = slots?.[0];
    if (!slot) throw new Error('No available slots for tutorial');
    await client
      .mutation(MAKE_SELECTIONS_MUTATION, {
        sessionId: sid,
        input: { slotId: slot.id },
      })
      .toPromise();
    return slot.id;
  }, [client, chooseServiceAndSite, ensureSession]);

  const setMode = useCallback(
    async (mode: 'SELF' | 'GIFT_SCHEDULE_NOW' | 'GIFT_SCHEDULE_LATER') => {
      const sid = await ensureSession();
      await client
        .mutation(MAKE_SELECTIONS_MUTATION, {
          sessionId: sid,
          input: { mode, isGiftBooking: mode !== 'SELF' },
        })
        .toPromise();
    },
    [client, ensureSession],
  );

  const payAndFinalize = useCallback<TutorialCtx['payAndFinalize']>(
    async (input) => {
      const sid = await ensureSession();
      const res = await client
        .mutation(PAY_AND_FINALIZE_MUTATION, {
          input: {
            sessionId: sid,
            cardNonce: 'cnon-tutorial',
            purchaserName: input.purchaserName,
            purchaserEmail: input.purchaserEmail,
            recipientName: input.recipientName ?? null,
            recipientEmail: input.recipientEmail ?? null,
          },
        })
        .toPromise();
      const data = res.data?.payAndFinalize as
        | { id: string; claimToken: string | null }
        | undefined;
      if (!data) throw new Error(res.error?.message ?? 'payAndFinalize failed');
      return { id: data.id, claimToken: data.claimToken ?? null };
    },
    [client, ensureSession],
  );

  const finalizeGift = useCallback<TutorialCtx['finalizeGift']>(
    async (input) => {
      const sid = await ensureSession();
      const res = await client
        .mutation(FINALIZE_GIFT_BOOKING_MUTATION, {
          input: {
            sessionId: sid,
            cardNonce: 'cnon-tutorial',
            purchaserName: input.purchaserName,
            purchaserEmail: input.purchaserEmail,
            recipientName: input.recipientName,
            recipientEmail: input.recipientEmail,
          },
        })
        .toPromise();
      const data = res.data?.finalizeGiftBooking as
        | { id: string; claimToken: string | null }
        | undefined;
      if (!data) throw new Error(res.error?.message ?? 'finalizeGiftBooking failed');
      return { id: data.id, claimToken: data.claimToken ?? null };
    },
    [client, ensureSession],
  );

  const claimGift = useCallback(
    async (claimToken: string, recipientEmail: string) => {
      const res = await client
        .mutation(CLAIM_GIFT_MUTATION, {
          input: { bookingId: claimToken, recipientEmail },
        })
        .toPromise();
      const id = res.data?.claimGiftBooking?.id as string | undefined;
      if (!id) throw new Error(res.error?.message ?? 'claimGiftBooking failed');
      return id;
    },
    [client],
  );

  const scheduleClaimed = useCallback(
    async (claimToken: string) => {
      const previewRes = await client
        .query(AVAILABLE_SLOTS_QUERY, { serviceId: 'svc-vo2' })
        .toPromise();
      const slot = (previewRes.data?.availableSlots as Array<{ id: string }> | undefined)?.[0];
      if (!slot) throw new Error('No slots for claim schedule step');
      const res = await client
        .mutation(SCHEDULE_CLAIMED_MUTATION, {
          bookingId: claimToken,
          slotId: slot.id,
        })
        .toPromise();
      if (res.error) throw res.error;
    },
    [client],
  );

  const reset = useCallback(() => {
    sessionRef.current = null;
    setSessionId(null);
    window.localStorage.removeItem(KEY_SITE);
    window.localStorage.removeItem(KEY_SVC);
    navigate('/booking', { replace: true });
  }, [navigate, setSessionId]);

  return {
    navigate: (to, opts) => navigate(to, opts),
    getSessionId,
    setSessionId,
    ensureSession,
    chooseServiceAndSite,
    pickFirstSlot,
    setMode,
    payAndFinalize,
    finalizeGift,
    claimGift,
    scheduleClaimed,
    reset,
  };
}
