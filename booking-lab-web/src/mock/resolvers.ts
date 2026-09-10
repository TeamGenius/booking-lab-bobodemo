import { store } from './store';
import type { BookingSession } from './types';

const WEB_ORIGIN = 'http://localhost:5173';

function priceForSession(session: BookingSession): number | null {
  const serviceId = session.selections.serviceId;
  if (!serviceId) return null;
  const svc = store.serviceById(serviceId);
  return svc?.priceCents ?? null;
}

function buildEmailPreview(session: BookingSession): BookingSession['emailPreview'] {
  const { recipientName, recipientEmail, purchaserName } = session.selections;
  const svc = session.selections.serviceId
    ? store.serviceById(session.selections.serviceId)
    : null;
  const site = session.selections.siteId ? store.siteById(session.selections.siteId) : null;
  if (!recipientEmail || !session.claimToken) return null;
  const claimUrl = `${WEB_ORIGIN}/gift/${session.claimToken}`;
  return {
    to: recipientEmail,
    toName: recipientName ?? 'friend',
    fromName: purchaserName ?? 'Someone',
    subject: `You have a Human Powered Health gift from ${purchaserName ?? 'a friend'}`,
    body: [
      `Hi ${recipientName ?? 'there'},`,
      ``,
      `${purchaserName ?? 'A friend'} purchased a ${svc?.name ?? 'Human Powered Health assessment'}${site ? ` at ${site.name}` : ''} for you.`,
      ``,
      `Sign in to Human Powered Health and open the link below to pick a time that works for you.`,
      `Your included assessments are already selected — pricing is covered by ${purchaserName ?? 'the purchaser'}.`,
      ``,
      `Schedule your visit: ${claimUrl}`,
      ``,
      `— Human Powered Health`,
    ].join('\n'),
    claimUrl,
    sentAt: new Date().toISOString(),
  };
}

export const resolvers = {
  Query: {
    sites: () => store.sites(),
    servicesBySite: (_: unknown, args: { siteId: string }) =>
      store.servicesBySite(args.siteId),
    availableSlots: (_: unknown, args: { serviceId: string }) =>
      store.slotsByService(args.serviceId),
    bookingSession: (_: unknown, args: { id: string }) => store.getSession(args.id),
    // Recipient-facing preview. Pricing is stripped at the type resolver level
    // by returning a copy where priceCents is nulled out per FR-7.
    getGiftBookingPreview: (_: unknown, args: { bookingId: string }) => {
      const s = store.getSessionByClaimToken(args.bookingId);
      if (!s) return null;
      return { ...s, __hidePricing: true } as BookingSession & { __hidePricing?: boolean };
    },
  },

  Mutation: {
    startBookingSession: () => store.createSession(),

    makeSelections: (
      _: unknown,
      args: { sessionId: string; input: Partial<BookingSession['selections']> },
    ) => {
      const s = store.updateSelections(args.sessionId, args.input);
      if (!s) throw new Error('Session not found');
      return s;
    },

    // Handles SELF and GIFT_SCHEDULE_NOW (Phase 1A). Slot is required.
    payAndFinalize: (
      _: unknown,
      args: {
        input: {
          sessionId: string;
          cardNonce: string;
          purchaserName: string;
          purchaserEmail: string;
          recipientName?: string | null;
          recipientEmail?: string | null;
        };
      },
    ) => {
      const { sessionId, cardNonce, purchaserName, purchaserEmail, recipientName, recipientEmail } =
        args.input;
      const s = store.getSession(sessionId);
      if (!s) throw new Error('Session not found');
      if (!s.selections.slotId) throw new Error('Slot must be selected');

      const isGift = s.selections.mode === 'GIFT_SCHEDULE_NOW';
      if (isGift) {
        if (!recipientName || !recipientEmail)
          throw new Error('Recipient details required for gift bookings');
        if (recipientEmail.toLowerCase() === purchaserEmail.toLowerCase())
          throw new Error('Self-gift blocked: Purchaser cannot also be Recipient');
      }

      store.updateSelections(sessionId, {
        purchaserName,
        purchaserEmail,
        recipientName: isGift ? recipientName ?? null : null,
        recipientEmail: isGift ? recipientEmail ?? null : null,
        isGiftBooking: isGift,
      });
      store.setPaymentIntent(sessionId, `pi_${cardNonce.slice(0, 8)}`);
      store.setStatus(sessionId, 'CONFIRMED');
      store.setConfirmationCode(sessionId, `HPH-${globalThis.crypto.randomUUID().slice(0, 6).toUpperCase()}`);
      return store.getSession(sessionId)!;
    },

    // Handles GIFT_SCHEDULE_LATER (Phase 1B). No slot. Uses PR #1766 semantics.
    finalizeGiftBooking: (
      _: unknown,
      args: {
        input: {
          sessionId: string;
          cardNonce: string;
          purchaserName: string;
          purchaserEmail: string;
          recipientName?: string | null;
          recipientEmail?: string | null;
        };
      },
    ) => {
      const { sessionId, cardNonce, purchaserName, purchaserEmail, recipientName, recipientEmail } =
        args.input;
      const s = store.getSession(sessionId);
      if (!s) throw new Error('Session not found');
      if (!recipientName || !recipientEmail) throw new Error('Recipient details required');
      if (recipientEmail.toLowerCase() === purchaserEmail.toLowerCase())
        throw new Error('Self-gift blocked: Purchaser cannot also be Recipient');

      store.updateSelections(sessionId, {
        purchaserName,
        purchaserEmail,
        recipientName,
        recipientEmail,
        isGiftBooking: true,
        mode: 'GIFT_SCHEDULE_LATER',
        slotId: null,
      });
      store.setPaymentIntent(sessionId, `pi_${cardNonce.slice(0, 8)}`);
      store.issueClaimToken(sessionId);
      store.setStatus(sessionId, 'PAID_AWAITING_CLAIM');
      const preview = buildEmailPreview(store.getSession(sessionId)!);
      store.attachEmailPreview(sessionId, preview);
      return store.getSession(sessionId)!;
    },

    claimGiftBooking: (
      _: unknown,
      args: { input: { bookingId: string; recipientEmail: string } },
    ) => {
      const s = store.getSessionByClaimToken(args.input.bookingId);
      if (!s) throw new Error('Invalid gift booking');
      if (s.status !== 'PAID_AWAITING_CLAIM' && s.status !== 'CLAIMED_AWAITING_SCHEDULE')
        throw new Error(`Cannot claim in status ${s.status}`);
      // Self-gift loophole guard per spec §10 (resolved decision).
      if (
        s.selections.purchaserEmail &&
        s.selections.purchaserEmail.toLowerCase() === args.input.recipientEmail.toLowerCase()
      )
        throw new Error('Self-gift blocked: Purchaser cannot claim their own gift');
      store.updateSelections(s.id, { recipientEmail: args.input.recipientEmail });
      store.setStatus(s.id, 'CLAIMED_AWAITING_SCHEDULE');
      return store.getSession(s.id)!;
    },

    scheduleClaimedBooking: (_: unknown, args: { bookingId: string; slotId: string }) => {
      const s = store.getSessionByClaimToken(args.bookingId);
      if (!s) throw new Error('Invalid gift booking');
      if (s.status !== 'CLAIMED_AWAITING_SCHEDULE')
        throw new Error(`Cannot schedule in status ${s.status}`);
      const slot = store.slotById(args.slotId);
      if (!slot) throw new Error('Slot not found');
      if (slot.serviceId !== s.selections.serviceId)
        throw new Error('Slot does not match this booking service');
      store.updateSelections(s.id, { slotId: args.slotId });
      store.setStatus(s.id, 'CONFIRMED');
      store.setConfirmationCode(s.id, `HPH-${globalThis.crypto.randomUUID().slice(0, 6).toUpperCase()}`);
      return store.getSession(s.id)!;
    },
  },

  BookingSession: {
    site: (parent: BookingSession) =>
      parent.selections.siteId ? store.siteById(parent.selections.siteId) : null,
    service: (parent: BookingSession) =>
      parent.selections.serviceId ? store.serviceById(parent.selections.serviceId) : null,
    slot: (parent: BookingSession) =>
      parent.selections.slotId ? store.slotById(parent.selections.slotId) : null,
    // FR-7: pricing hidden on recipient preview responses.
    priceCents: (parent: BookingSession & { __hidePricing?: boolean }) =>
      parent.__hidePricing ? null : priceForSession(parent),
  },

  Site: {
    services: (parent: { id: string }) => store.servicesBySite(parent.id),
  },
};
