import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClient } from 'urql';
import {
  AVAILABLE_SLOTS_QUERY,
  CLAIM_GIFT_MUTATION,
  FINALIZE_GIFT_BOOKING_MUTATION,
  MAKE_SELECTIONS_MUTATION,
  PAY_AND_FINALIZE_MUTATION,
  SCHEDULE_CLAIMED_MUTATION,
} from '../client/gql';
import { useSessionContext } from '../shared/SessionContext';

const KEY_SITE = 'booking-lab.selection.siteId';
const KEY_SVC = 'booking-lab.selection.serviceId';

export type FinalizeResult = { id: string; claimToken: string | null };

export type TutorialCtx = {
  navigate: (to: string, opts?: { replace?: boolean }) => void;
  getSessionId: () => string | null;

  // UI-driven — waits for the real page to render, then dispatches a real click.
  waitForSelector: (selector: string, timeoutMs?: number) => Promise<HTMLElement>;
  clickSelector: (selector: string, timeoutMs?: number) => Promise<void>;
  pickSiteAndServiceViaUI: () => Promise<void>;
  pickFirstSlotViaUI: () => Promise<void>;
  clickPrimaryAction: () => Promise<void>;

  // Backend-only — writes straight to the mock schema, used for steps that
  // don't have a natural "click" affordance (mode toggle, pay, gift claim).
  waitForSession: (timeoutMs?: number) => Promise<string>;
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
  reset: () => Promise<void>;
};

const isVisible = (el: HTMLElement) => {
  if (!el.isConnected) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

async function pollForSelector(
  selector: string,
  timeoutMs: number,
): Promise<HTMLElement> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el && isVisible(el) && !el.hasAttribute('disabled')) return el;
    await new Promise((r) => setTimeout(r, 80));
  }
  throw new Error(`Timed out waiting for selector: ${selector}`);
}

export function useTutorialCtx(): TutorialCtx {
  const client = useClient();
  const navigate = useNavigate();
  const { sessionId, resetSession } = useSessionContext();
  const sessionRef = useRef<string | null>(sessionId);
  useEffect(() => {
    sessionRef.current = sessionId;
  }, [sessionId]);

  const getSessionId = useCallback(() => sessionRef.current, []);

  const waitForSelector = useCallback(
    (selector: string, timeoutMs = 6000) => pollForSelector(selector, timeoutMs),
    [],
  );

  const clickSelector = useCallback(
    async (selector: string, timeoutMs = 6000) => {
      const el = await pollForSelector(selector, timeoutMs);
      el.click();
    },
    [],
  );

  // The pages own session creation; the tutorial just waits for it.
  const waitForSession = useCallback(async (timeoutMs = 6000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (sessionRef.current) return sessionRef.current;
      await new Promise((r) => setTimeout(r, 80));
    }
    throw new Error('Timed out waiting for session id');
  }, []);

  const pickSiteAndServiceViaUI = useCallback(async () => {
    const site = await pollForSelector(
      '[data-tour-site-card]:not([data-tour-site-card=""])',
      8000,
    );
    site.click();
    const svc = await pollForSelector(
      '[data-tour-service-card]:not([data-tour-service-card=""])',
      8000,
    );
    svc.click();
    // Give urql/React a beat to commit the mutation + re-enable Continue.
    await new Promise((r) => setTimeout(r, 250));
  }, []);

  const pickFirstSlotViaUI = useCallback(async () => {
    const serviceId = window.localStorage.getItem(KEY_SVC);
    if (!serviceId) throw new Error('No selected service for tutorial');
    const slotsResult = await client
      .query(AVAILABLE_SLOTS_QUERY, { serviceId }, { requestPolicy: 'network-only' })
      .toPromise();
    const firstSlot = (
      slotsResult.data?.availableSlots as Array<{ id: string; startsAt: string }> | undefined
    )?.[0];
    if (!firstSlot) throw new Error('No available slots for tutorial');

    const slotDate = new Date(firstSlot.startsAt);
    const dateKey = `${slotDate.getFullYear()}-${String(slotDate.getMonth() + 1).padStart(2, '0')}-${String(slotDate.getDate()).padStart(2, '0')}`;
    const dateButton = await pollForSelector(`[data-tour-date="${dateKey}"]`, 8000);
    dateButton.click();

    const slot = await pollForSelector(`[data-tour-slot="${firstSlot.id}"]`, 8000);
    slot.click();
    await new Promise((r) => setTimeout(r, 150));
  }, [client]);

  const clickPrimaryAction = useCallback(async () => {
    await clickSelector('[data-tour="primary-action"]:not([disabled])', 8000);
    await new Promise((r) => setTimeout(r, 150));
  }, [clickSelector]);

  const setMode = useCallback(
    async (mode: 'SELF' | 'GIFT_SCHEDULE_NOW' | 'GIFT_SCHEDULE_LATER') => {
      const sid = await waitForSession();
      await client
        .mutation(MAKE_SELECTIONS_MUTATION, {
          sessionId: sid,
          input: { mode, isGiftBooking: mode !== 'SELF' },
        })
        .toPromise();
    },
    [client, waitForSession],
  );

  const payAndFinalize = useCallback<TutorialCtx['payAndFinalize']>(
    async (input) => {
      const sid = await waitForSession();
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
    [client, waitForSession],
  );

  const finalizeGift = useCallback<TutorialCtx['finalizeGift']>(
    async (input) => {
      const sid = await waitForSession();
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
    [client, waitForSession],
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

  const reset = useCallback(async () => {
    window.localStorage.removeItem(KEY_SITE);
    window.localStorage.removeItem(KEY_SVC);
    navigate('/booking', { replace: true });
    const id = await resetSession();
    sessionRef.current = id;
  }, [navigate, resetSession]);

  const navigateTo = useCallback<TutorialCtx['navigate']>(
    (to, opts) => navigate(to, opts),
    [navigate],
  );

  return useMemo(
    () => ({
      navigate: navigateTo,
      getSessionId,
      waitForSelector,
      clickSelector,
      pickSiteAndServiceViaUI,
      pickFirstSlotViaUI,
      clickPrimaryAction,
      waitForSession,
      setMode,
      payAndFinalize,
      finalizeGift,
      claimGift,
      scheduleClaimed,
      reset,
    }),
    [
      navigateTo,
      getSessionId,
      waitForSelector,
      clickSelector,
      pickSiteAndServiceViaUI,
      pickFirstSlotViaUI,
      clickPrimaryAction,
      waitForSession,
      setMode,
      payAndFinalize,
      finalizeGift,
      claimGift,
      scheduleClaimed,
      reset,
    ],
  );
}
