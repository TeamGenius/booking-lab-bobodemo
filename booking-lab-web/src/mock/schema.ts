export const typeDefs = /* GraphQL */ `
  """
  A physical Human Powered Health lab where services are performed.
  """
  type Site {
    id: ID!
    name: String!
    city: String!
    addressLine: String!
    services: [Service!]!
  }

  """
  A bookable service (VO2 Max, DXA, etc.). Prices are in cents.
  In production these carry ALLOW / BLOCK / INCLUDED rules relative to gift bundles.
  """
  type Service {
    id: ID!
    name: String!
    description: String!
    priceCents: Int!
    durationMinutes: Int!
    siteId: ID!
  }

  """
  A specific bookable time window with an assigned physiologist.
  """
  type Slot {
    id: ID!
    serviceId: ID!
    startsAt: String!
    employeeName: String!
  }

  enum SessionStatus {
    DRAFT
    AWAITING_PAYMENT
    PAID_AWAITING_CLAIM
    CLAIMED_AWAITING_SCHEDULE
    SCHEDULED
    CONFIRMED
  }

  """
  PRD Step 3: "Who is this for?"
  - SELF: Purchaser = Recipient = Athlete. Standard flow.
  - GIFT_SCHEDULE_NOW (Phase 1A): Purchaser books slot on behalf of Recipient. Visit created immediately.
  - GIFT_SCHEDULE_LATER (Phase 1B): Purchaser pays without slot. Gift Credit created. Recipient claims later.
  """
  enum BookingMode {
    SELF
    GIFT_SCHEDULE_NOW
    GIFT_SCHEDULE_LATER
  }

  """
  The current selections for a booking session. Server is authoritative; changing
  siteId or serviceId clears slotId (cascade). Mode is chosen at PRD Step 3.
  """
  type Selections {
    siteId: ID
    serviceId: ID
    slotId: ID
    isGiftBooking: Boolean!
    mode: BookingMode!
    purchaserName: String
    purchaserEmail: String
    recipientName: String
    recipientEmail: String
  }

  """
  A read-only preview of the email sent to the Recipient when a Phase 1B gift
  booking is finalized. Rendered inline for the demo (no real email is sent).
  """
  type EmailPreview {
    to: String!
    toName: String!
    fromName: String!
    subject: String!
    body: String!
    claimUrl: String!
    sentAt: String!
  }

  """
  Envelope for one booking flow. Analogous to the Option B server-owned
  BookingSession described in the BOBO Technical Implementation Spec — the
  client expresses intent, the server decides what is valid.
  """
  type BookingSession {
    id: ID!
    createdAt: String!
    status: SessionStatus!
    selections: Selections!
    site: Site
    service: Service
    slot: Slot
    """
    Total in cents. Server hides pricing for Recipient views (FR-7).
    """
    priceCents: Int
    """
    The BookingId GUID that IS the recipient's claim URL (per spec, no separate
    single-use token; auth on claimGiftBooking + GUID entropy provides security).
    """
    claimToken: String
    emailPreview: EmailPreview
    confirmationCode: String
  }

  input SelectionsInput {
    siteId: ID
    serviceId: ID
    slotId: ID
    isGiftBooking: Boolean
    mode: BookingMode
    purchaserName: String
    purchaserEmail: String
    recipientName: String
    recipientEmail: String
  }

  input PayAndFinalizeInput {
    sessionId: ID!
    cardNonce: String!
    purchaserName: String!
    purchaserEmail: String!
    recipientName: String
    recipientEmail: String
  }

  input ClaimGiftInput {
    """
    In the demo this is the BookingId. In production the recipient must be
    authenticated and BookingId comes from the URL.
    """
    bookingId: ID!
    """
    Mock recipient identity — in production this comes from the recipient's JWT.
    """
    recipientName: String
    recipientEmail: String!
  }

  type Query {
    sites: [Site!]!
    servicesBySite(siteId: ID!): [Service!]!
    availableSlots(serviceId: ID!): [Slot!]!
    bookingSession(id: ID!): BookingSession

    """
    Recipient-facing preview of a Phase 1B gift booking. Returns modules + site
    + Purchaser display name only. Pricing is hidden per FR-7.
    In production: [Authorize] User scheme; requires authenticated Recipient.
    """
    getGiftBookingPreview(bookingId: ID!): BookingSession
  }

  type Mutation {
    startBookingSession: BookingSession!
    makeSelections(sessionId: ID!, input: SelectionsInput!): BookingSession!

    """
    Standard finalize path. Covers:
      - SELF: Purchaser = Recipient = Athlete
      - GIFT_SCHEDULE_NOW (Phase 1A): Purchaser picks slot on behalf of Recipient
    Payment captured, Visit created immediately.
    """
    payAndFinalize(input: PayAndFinalizeInput!): BookingSession!

    """
    Phase 1B — Purchase Now, Schedule Later.
    Purchaser pays without a slot. Server:
      1. Captures payment against PaymentLedger.BookingId (LP-2167).
      2. Creates a ReceiptSnapshot with SnapshotType.Unscheduled.
      3. Sets booking.isGiftBooking = true, booking.userId stays null.
      4. Returns a claim URL (= BookingId GUID) that the Recipient uses.
    In production: [Authorize] User scheme; identity comes from JWT.
    """
    finalizeGiftBooking(input: PayAndFinalizeInput!): BookingSession!

    """
    Recipient side of BOBO. Sets booking.userId = caller.userId.
    In production: [Authorize] User scheme; identity from JWT.
    Rejects if caller matches Purchaser (self-gift loophole).
    """
    claimGiftBooking(input: ClaimGiftInput!): BookingSession!

    """
    Recipient picks their time after claiming. Calls the normal finalizeBooking
    internally (LP-2178) — backfills PaymentLedger.VisitId onto the pre-existing
    payment record.
    """
    scheduleClaimedBooking(bookingId: ID!, slotId: ID!): BookingSession!
  }
`;
