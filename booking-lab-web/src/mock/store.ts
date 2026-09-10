import type { BookingSession, Selections } from './types';
import { generateSlots, services, sites } from './seed';

const sessions = new Map<string, BookingSession>();
const sessionsByClaimToken = new Map<string, string>();
const slots = generateSlots();

function emptySelections(): Selections {
  return {
    siteId: null,
    serviceId: null,
    slotId: null,
    isGiftBooking: false,
    mode: 'SELF',
    purchaserName: null,
    purchaserEmail: null,
    recipientName: null,
    recipientEmail: null,
  };
}

export const store = {
  sites: () => sites,
  services: () => services,
  slots: () => slots,
  servicesBySite: (siteId: string) =>
    services.filter((s) => s.siteId === siteId),
  slotsByService: (serviceId: string) =>
    slots.filter((s) => s.serviceId === serviceId),
  siteById: (id: string) => sites.find((s) => s.id === id) ?? null,
  serviceById: (id: string) => services.find((s) => s.id === id) ?? null,
  slotById: (id: string) => slots.find((s) => s.id === id) ?? null,

  createSession(): BookingSession {
    const session: BookingSession = {
      id: globalThis.crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      selections: emptySelections(),
      status: 'DRAFT',
      paymentIntentId: null,
      claimToken: null,
      emailPreview: null,
      confirmationCode: null,
    };
    sessions.set(session.id, session);
    return session;
  },

  getSession(id: string): BookingSession | null {
    return sessions.get(id) ?? null;
  },

  updateSelections(id: string, patch: Partial<Selections>): BookingSession | null {
    const s = sessions.get(id);
    if (!s) return null;
    s.selections = { ...s.selections, ...patch };
    // Reset slot if site or service changes
    if (patch.siteId !== undefined || patch.serviceId !== undefined) {
      s.selections.slotId = null;
    }
    return s;
  },

  setStatus(id: string, status: BookingSession['status']): BookingSession | null {
    const s = sessions.get(id);
    if (!s) return null;
    s.status = status;
    return s;
  },

  setPaymentIntent(id: string, intent: string): BookingSession | null {
    const s = sessions.get(id);
    if (!s) return null;
    s.paymentIntentId = intent;
    return s;
  },

  issueClaimToken(id: string): BookingSession | null {
    const s = sessions.get(id);
    if (!s) return null;
    // Spec: the BookingId GUID IS the claim URL. Use session.id directly.
    s.claimToken = s.id;
    sessionsByClaimToken.set(s.id, s.id);
    return s;
  },

  attachEmailPreview(id: string, email: BookingSession['emailPreview']): BookingSession | null {
    const s = sessions.get(id);
    if (!s) return null;
    s.emailPreview = email;
    return s;
  },

  setConfirmationCode(id: string, code: string): BookingSession | null {
    const s = sessions.get(id);
    if (!s) return null;
    s.confirmationCode = code;
    return s;
  },

  getSessionByClaimToken(token: string): BookingSession | null {
    const id = sessionsByClaimToken.get(token);
    if (!id) return null;
    return sessions.get(id) ?? null;
  },
};
