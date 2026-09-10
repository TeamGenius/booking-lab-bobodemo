import type { FlowStepId } from '../shared/FlowStateContext';

const REPO = 'https://github.com/TeamGenius/HPH.Core.API/blob/master';
const ADMIN_REPO = 'https://github.com/TeamGenius/HPH.Admin.Web/blob/master';
const HOOKS_REPO = 'https://github.com/TeamGenius/HPH.WebHookListeners/blob/master';

export type BackendChange = {
  file: string;
  symbol?: string;
  url: string;
  change: string;
  reason?: string;
};

export type Migration = {
  table: string;
  columns?: string[];
  notes?: string;
};

export type WebhookChange = {
  project: string;
  handler: string;
  note: string;
  url?: string;
};

export type AdminChange = {
  file: string;
  url: string;
  change: string;
};

export type StepDelta = {
  title: string;
  summary: string;
  coreApi: BackendChange[];
  migrations: Migration[];
  webhooks: WebhookChange[];
  admin: AdminChange[];
  notes?: string[];
};

const commonBooking: BackendChange[] = [
  {
    file: 'src/HPH.Core.API.GraphQL/Entities/Bookings/Mutations/BookingMutations.cs',
    symbol: 'BookingMutations.AddBooking',
    url: `${REPO}/src/HPH.Core.API.GraphQL/Entities/Bookings/Mutations/BookingMutations.cs`,
    change:
      'Add path that accepts a BOBO input (isGiftBooking, mode) — currently mutation assumes SELF.',
    reason:
      'BOBO flow needs to persist Gift + GiftClaim rows atomically with the parent Booking.',
  },
  {
    file: 'src/HPH.Core.API.GraphQL/Entities/Bookings/Types/BookingType.cs',
    symbol: 'BookingType',
    url: `${REPO}/src/HPH.Core.API.GraphQL/Entities/Bookings/Types/BookingType.cs`,
    change:
      'Expose derived fields the admin UI needs: giftClaim, purchaser, recipient.',
  },
];

export const DELTAS: Partial<Record<FlowStepId, StepDelta>> = {
  landing: {
    title: 'Landing — no state yet',
    summary:
      'Nothing hits the API until the athlete picks a service. Session starts client-side only.',
    coreApi: [],
    migrations: [],
    webhooks: [],
    admin: [],
  },

  services: {
    title: 'Athlete chose a service',
    summary:
      'Session opens on the server and the chosen service is committed. Prices resolved from the Service table.',
    coreApi: [
      {
        file: 'src/HPH.Core.API.GraphQL/Entities/Bookings/Mutations/BookingSessionMutations.cs',
        symbol: 'StartBookingSession',
        url: `${REPO}/src/HPH.Core.API.GraphQL/Entities/Bookings/Mutations/BookingSessionMutations.cs`,
        change:
          'New mutation — allocates a draft Booking row with status=DRAFT, ties it to the JWT user if present.',
        reason: 'Prod today has no session concept; BOBO needs one to stash selections before pay.',
      },
      {
        file: 'src/HPH.Core.API.GraphQL/Entities/Sites/Queries/SiteQueries.cs',
        symbol: 'GetSites',
        url: `${REPO}/src/HPH.Core.API.GraphQL/Entities/Sites/Queries/SiteQueries.cs`,
        change: 'Reuse — no changes. Sites & their Services are already paged.',
      },
      {
        file: 'src/HPH.Core.API.Repo/Models/Service.cs',
        symbol: 'Service',
        url: `${REPO}/src/HPH.Core.API.Repo/Models/Service.cs`,
        change:
          'Add `RequiresScheduling` bool so the "no-schedule" BOBO track can skip the slot step deterministically.',
      },
    ],
    migrations: [
      {
        table: 'BookingSession',
        columns: ['Id', 'UserId?', 'SiteId?', 'ServiceId?', 'SlotId?', 'Mode', 'CreatedDate'],
        notes:
          'New table, or add IsSession flag to existing Booking. ADR needed — prefer separate table so IAuditable and Booking constraints stay tight.',
      },
      {
        table: 'Service',
        columns: ['+ RequiresScheduling bit NOT NULL DEFAULT 1'],
      },
    ],
    webhooks: [],
    admin: [
      {
        file: 'src/admin/pages/Bookings/BookingsList.tsx',
        url: `${ADMIN_REPO}/src/admin/pages/Bookings/BookingsList.tsx`,
        change:
          'Show DRAFT sessions in a separate tab so staff can spot abandoned funnels.',
      },
    ],
  },

  schedule: {
    title: 'Athlete picked a slot',
    summary:
      'Available slots resolved via the scheduling solver. Chosen slot locks provisionally on the session.',
    coreApi: [
      {
        file: 'src/HPH.Core.API.GraphQL/Entities/Visits/Queries/VisitQueries.cs',
        symbol: 'GetAvailableSlots',
        url: `${REPO}/src/HPH.Core.API.GraphQL/Entities/Visits/Queries/VisitQueries.cs`,
        change:
          'Reuse existing solver. BOBO calls it with the session\'s siteId + serviceId.',
      },
      {
        file: 'src/HPH.Core.API.Repo.Scheduler/SchedulingAvailabilityService.cs',
        symbol: 'SchedulingAvailabilityService',
        url: `${REPO}/src/HPH.Core.API.Repo.Scheduler/SchedulingAvailabilityService.cs`,
        change: 'No change — reused as-is.',
      },
      {
        file: 'src/HPH.Core.API.GraphQL/Entities/Bookings/Mutations/BookingSessionMutations.cs',
        symbol: 'MakeSelections',
        url: `${REPO}/src/HPH.Core.API.GraphQL/Entities/Bookings/Mutations/BookingSessionMutations.cs`,
        change: 'New — patches session.slotId, revalidates against solver, holds a soft-lock.',
      },
    ],
    migrations: [
      {
        table: 'BookingSession',
        columns: ['SlotHoldExpiresAt datetime2 NULL'],
        notes: 'Soft-lock TTL — release the slot back to the solver if the session goes idle.',
      },
    ],
    webhooks: [],
    admin: [
      {
        file: 'src/admin/pages/Bookings/BookingDetail.tsx',
        url: `${ADMIN_REPO}/src/admin/pages/Bookings/BookingDetail.tsx`,
        change: 'Surface slot hold status so staff know when a session is close to expiring.',
      },
    ],
  },

  review: {
    title: 'Athlete on review — purchaser + gift decision',
    summary:
      'The single review step decides whether this becomes a SELF Booking, GIFT_SCHEDULE_NOW, or GIFT_SCHEDULE_LATER. Payment authorises here.',
    coreApi: [
      ...commonBooking,
      {
        file: 'src/HPH.Core.API.GraphQL/Entities/Gifts/Mutations/GiftMutations.cs',
        symbol: 'PayAndFinalize / FinalizeGiftBooking',
        url: `${REPO}/src/HPH.Core.API.GraphQL/Entities/Bookings/Mutations`,
        change:
          'New file. Two branches: SELF/GIFT_SCHEDULE_NOW → PayAndFinalize creates Booking + Visit + Invoice. GIFT_SCHEDULE_LATER → FinalizeGiftBooking creates Booking (no Visit yet) + GiftClaim with token.',
      },
      {
        file: 'src/HPH.Core.API.Repo/Models/Gift.cs',
        symbol: 'Gift + GiftClaim',
        url: `${REPO}/src/HPH.Core.API.Repo/Models`,
        change:
          'New models: Gift (BookingId, PurchaserUserId, RecipientEmail, PriceCents, Status) and GiftClaim (Id, GiftId, Token, ExpiresAt, RedeemedAt, RedeemedByUserId).',
      },
      {
        file: 'src/HPH.Core.API.Repo.SendGrid/EmailService.cs',
        symbol: 'GiftBookingClaimEmail template',
        url: `${REPO}/src/HPH.Core.API.Repo.SendGrid`,
        change:
          'New SendGrid template + queue trigger for "you\'ve received a gift" email with claim URL.',
      },
      {
        file: 'src/HPH.Core.API.Repo.Square/PaymentService.cs',
        symbol: 'AuthoriseAndCapture',
        url: `${REPO}/src/HPH.Core.API.Repo.Square/PaymentService.cs`,
        change: 'Reused — gift bookings capture immediately even without a Visit row.',
      },
    ],
    migrations: [
      {
        table: 'Gift',
        columns: [
          'Id uniqueidentifier',
          'BookingId FK',
          'PurchaserUserId FK NULL',
          'RecipientEmail nvarchar(320)',
          'PriceCents int',
          'Status nvarchar(24)',
          'CreatedDate / UpdatedDate / CreatedBy / UpdatedBy (IAuditable)',
        ],
      },
      {
        table: 'GiftClaim',
        columns: [
          'Id uniqueidentifier',
          'GiftId FK',
          'Token nvarchar(64) UNIQUE',
          'ExpiresAt datetime2',
          'RedeemedAt datetime2 NULL',
          'RedeemedByUserId FK NULL',
        ],
        notes:
          'Token is opaque (base64url), enforced UNIQUE. IX_GiftClaim_Token for the recipient lookup path.',
      },
      {
        table: 'Booking',
        columns: ["+ Kind nvarchar(16) NOT NULL DEFAULT 'SELF'"],
        notes: 'Discriminator for SELF | GIFT_NOW | GIFT_LATER.',
      },
    ],
    webhooks: [
      {
        project: 'HPH.WebHookListeners',
        handler: 'HPH.WebhookListeners.Functions/Square/PaymentCompletedFunction.cs',
        url: `${HOOKS_REPO}/HPH.WebhookListeners.Functions`,
        note:
          'Existing Square webhook needs to know about Gift so it can transition Gift.Status = PAID and enqueue the SendGrid claim email.',
      },
    ],
    admin: [
      {
        file: 'src/admin/pages/Gifts/GiftsList.tsx',
        url: `${ADMIN_REPO}/src`,
        change: 'New page — outstanding gifts, claim status, resend claim email.',
      },
    ],
  },

  confirmation: {
    title: 'Confirmation — post-finalize',
    summary:
      'Emails queued, Visit row exists (unless SCHEDULE_LATER), staff-side notifications fire.',
    coreApi: [
      {
        file: 'src/HPH.Core.API.Functions/QueueConsumers/OrderConfirmationFunction.cs',
        symbol: 'OrderConfirmationFunction',
        url: `${REPO}/src/HPH.Core.API.Functions`,
        change:
          'Reused for SELF. New GiftClaimIssuedFunction for GIFT_SCHEDULE_LATER — sends different template, no calendar attachment yet.',
      },
      {
        file: 'src/HPH.Core.API.GraphQL/Services/VisitService.cs',
        symbol: 'ScheduleVisit',
        url: `${REPO}/src/HPH.Core.API.GraphQL/Services`,
        change:
          'Split into ScheduleVisitFromBooking(bookingId) vs ScheduleClaimedGift(claimToken, slotId) so the recipient flow can call it without touching Booking-level auth.',
      },
    ],
    migrations: [],
    webhooks: [
      {
        project: 'HPH.WebHookListeners',
        handler: 'HubSpot sync',
        url: `${HOOKS_REPO}/HPH.HubSpot.Repo`,
        note:
          'Push Gift.Purchaser into HubSpot as a Customer even if the Recipient never claims — protects revenue attribution.',
      },
    ],
    admin: [
      {
        file: 'src/admin/pages/Bookings/BookingDetail.tsx',
        url: `${ADMIN_REPO}/src`,
        change:
          'Show "Gift Claim" badge + claim link when Kind ≠ SELF. Allow admin to resend claim email.',
      },
    ],
  },

  'gift-claim-landing': {
    title: 'Recipient opened the claim link',
    summary:
      'Anonymous request identified only by claim token. Server resolves booking preview without exposing price.',
    coreApi: [
      {
        file: 'src/HPH.Core.API.GraphQL/Entities/Gifts/Queries/GiftQueries.cs',
        symbol: 'GetGiftBookingPreview',
        url: `${REPO}/src/HPH.Core.API.GraphQL/Entities/Gifts`,
        change:
          'New — resolves by token, strips priceCents (FR-7), returns site + service + optional slot.',
      },
      {
        file: 'src/HPH.Core.API.GraphQL/Security/GiftTokenScheme.cs',
        url: `${REPO}/src/HPH.Core.API.GraphQL/Security`,
        change:
          'New auth scheme so an anonymous browser can call gift queries with just a token, no JWT.',
      },
    ],
    migrations: [],
    webhooks: [],
    admin: [],
  },

  'gift-claim-schedule': {
    title: 'Recipient picking a slot',
    summary:
      'Recipient claims the gift + picks a slot in one shot. Booking transitions PENDING_CLAIM → CONFIRMED.',
    coreApi: [
      {
        file: 'src/HPH.Core.API.GraphQL/Entities/Gifts/Mutations/GiftMutations.cs',
        symbol: 'ClaimGiftBooking + ScheduleClaimedBooking',
        url: `${REPO}/src/HPH.Core.API.GraphQL/Entities/Gifts`,
        change:
          'ClaimGiftBooking sets GiftClaim.RedeemedAt + RedeemedByUserId. ScheduleClaimedBooking calls the same solver as the SELF flow but bypasses the purchaser-only auth check.',
      },
      {
        file: 'src/HPH.Core.API.Repo/Repos/GiftClaimRepo.cs',
        url: `${REPO}/src/HPH.Core.API.Repo/Repos`,
        change:
          'New repo. GetByToken uses the UNIQUE index; RedeemAsync is a single UPDATE ... WHERE RedeemedAt IS NULL to guard against double-claim.',
      },
    ],
    migrations: [],
    webhooks: [
      {
        project: 'HPH.WebHookListeners',
        handler: 'GiftClaimedFunction (new)',
        url: `${HOOKS_REPO}/HPH.WebhookListeners.Functions`,
        note:
          'Emits Slack notification to physiologists that a previously-outstanding gift got claimed.',
      },
    ],
    admin: [
      {
        file: 'src/admin/pages/Gifts/GiftsList.tsx',
        url: `${ADMIN_REPO}/src`,
        change: 'Live-refresh the outstanding-gifts count once a claim lands.',
      },
    ],
  },
};

export function getDelta(stepId: FlowStepId): StepDelta {
  return (
    DELTAS[stepId] ?? {
      title: 'No mapping yet',
      summary: 'This step is not yet mapped to HPH.Core.API changes.',
      coreApi: [],
      migrations: [],
      webhooks: [],
      admin: [],
    }
  );
}
