export type Site = {
  id: string;
  name: string;
  city: string;
  addressLine: string;
};

export type Service = {
  id: string;
  siteId: string;
  name: string;
  description: string;
  priceCents: number;
  durationMinutes: number;
};

export type Slot = {
  id: string;
  serviceId: string;
  startsAt: string; // ISO
  employeeName: string;
};

// PRD Step 3: "Who is this for?" — resolved into one of three server-visible modes.
// GIFT_SCHEDULE_NOW = Phase 1A; GIFT_SCHEDULE_LATER = Phase 1B; SELF = normal flow.
export type BookingMode = 'SELF' | 'GIFT_SCHEDULE_NOW' | 'GIFT_SCHEDULE_LATER';

export type Selections = {
  siteId: string | null;
  serviceId: string | null;
  slotId: string | null;
  isGiftBooking: boolean;
  mode: BookingMode;
  purchaserName: string | null;
  purchaserEmail: string | null;
  recipientName: string | null;
  recipientEmail: string | null;
};

export type BookingSession = {
  id: string;
  createdAt: string;
  selections: Selections;
  status:
    | 'DRAFT'
    | 'AWAITING_PAYMENT'
    | 'PAID_AWAITING_CLAIM'
    | 'CLAIMED_AWAITING_SCHEDULE'
    | 'SCHEDULED'
    | 'CONFIRMED';
  paymentIntentId: string | null;
  // Per spec: the BookingId GUID IS the claim URL — no separate token.
  // Kept as a computed alias for demo clarity.
  claimToken: string | null;
  emailPreview: EmailPreview | null;
  confirmationCode: string | null;
};

export type EmailPreview = {
  to: string;
  toName: string;
  fromName: string;
  subject: string;
  body: string;
  claimUrl: string;
  sentAt: string;
};
