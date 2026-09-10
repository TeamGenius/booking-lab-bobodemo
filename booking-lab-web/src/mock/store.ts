import type { BookingSession, Selections } from './types';
import { generateSlots, services, sites } from './seed';
import { decodeDemoClaimPayload } from '../shared/demoClaimPayload';

const STORAGE_KEY = 'booking-lab.sessions.v1';
const sessions = new Map<string, BookingSession>();
const sessionsByClaimToken = new Map<string, string>();
const slots = generateSlots();

function loadPersistedSessions() {
  if (typeof window === 'undefined') return;

  try {
    const persisted = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown;
    if (!Array.isArray(persisted)) return;

    for (const session of persisted) {
      if (!session || typeof session !== 'object' || !('id' in session)) continue;
      const bookingSession = session as BookingSession;
      if (typeof bookingSession.id !== 'string') continue;
      sessions.set(bookingSession.id, bookingSession);
      if (bookingSession.claimToken) {
        sessionsByClaimToken.set(bookingSession.claimToken, bookingSession.id);
      }
    }
  } catch {
    // Ignore malformed or unavailable browser storage and keep the demo usable.
  }
}

function persistSessions() {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...sessions.values()]));
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

function hydrateDemoClaimFromUrl(token: string): BookingSession | null {
  if (typeof window === 'undefined') return null;

  const hashQuery = window.location.hash.split('?')[1] ?? '';
  const payload = decodeDemoClaimPayload(new URLSearchParams(hashQuery).get('demo'), token);
  if (!payload) return null;

  const site = sites.find((candidate) => candidate.id === payload.siteId);
  const service = services.find((candidate) => candidate.id === payload.serviceId);
  if (!site || !service || service.siteId !== site.id) return null;

  const session: BookingSession = {
    id: token,
    createdAt: new Date().toISOString(),
    selections: {
      siteId: site.id,
      serviceId: service.id,
      slotId: null,
      isGiftBooking: true,
      mode: 'GIFT_SCHEDULE_LATER',
      purchaserName: 'Jamie Chen',
      purchaserEmail: 'jamie.chen@example.com',
      recipientName: 'Alex Rivera',
      recipientEmail: 'alex.rivera@example.com',
    },
    status: 'PAID_AWAITING_CLAIM',
    paymentIntentId: null,
    claimToken: token,
    emailPreview: null,
    confirmationCode: null,
  };
  sessions.set(session.id, session);
  sessionsByClaimToken.set(token, session.id);
  persistSessions();
  return session;
}

loadPersistedSessions();

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
    persistSessions();
    return session;
  },

  getSession(id: string): BookingSession | null {
    loadPersistedSessions();
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
    persistSessions();
    return s;
  },

  setStatus(id: string, status: BookingSession['status']): BookingSession | null {
    const s = sessions.get(id);
    if (!s) return null;
    s.status = status;
    persistSessions();
    return s;
  },

  setPaymentIntent(id: string, intent: string): BookingSession | null {
    const s = sessions.get(id);
    if (!s) return null;
    s.paymentIntentId = intent;
    persistSessions();
    return s;
  },

  issueClaimToken(id: string): BookingSession | null {
    const s = sessions.get(id);
    if (!s) return null;
    // Spec: the BookingId GUID IS the claim URL. Use session.id directly.
    s.claimToken = s.id;
    sessionsByClaimToken.set(s.id, s.id);
    persistSessions();
    return s;
  },

  attachEmailPreview(id: string, email: BookingSession['emailPreview']): BookingSession | null {
    const s = sessions.get(id);
    if (!s) return null;
    s.emailPreview = email;
    persistSessions();
    return s;
  },

  setConfirmationCode(id: string, code: string): BookingSession | null {
    const s = sessions.get(id);
    if (!s) return null;
    s.confirmationCode = code;
    persistSessions();
    return s;
  },

  getSessionByClaimToken(token: string): BookingSession | null {
    loadPersistedSessions();
    const id = sessionsByClaimToken.get(token);
    if (!id) return hydrateDemoClaimFromUrl(token);
    return sessions.get(id) ?? null;
  },
};
