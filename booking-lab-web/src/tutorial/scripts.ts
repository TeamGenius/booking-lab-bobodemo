import type { TutorialCtx } from './useTutorialCtx';

export type TutorialStep = {
  id: string;
  caption: string;
  detail?: string;
  target?: string;
  run?: (ctx: TutorialCtx, memo: Record<string, unknown>) => Promise<void>;
  waitMs?: number;
};

export type TutorialScript = {
  id: string;
  title: string;
  subtitle: string;
  steps: TutorialStep[];
};

const PURCHASER = { name: 'Jamie Chen', email: 'jamie.chen@example.com' };
const RECIPIENT = { name: 'Alex Rivera', email: 'alex.rivera@example.com' };

// Reset + return to services landing, then wait for the page to render + a
// session id to exist. Every script starts here to guarantee a clean slate.
const goServices = async (ctx: TutorialCtx) => {
  await ctx.reset();
  await ctx.waitForSelector('[data-tour-site-card]:not([data-tour-site-card=""])');
};

export const SELF_WITH_SCHEDULING: TutorialScript = {
  id: 'self-with-scheduling',
  title: 'Standard booking · schedule now',
  subtitle: 'Athlete picks a site + service + slot, then pays.',
  steps: [
    {
      id: 'reset',
      caption: 'Fresh lab session on the Services page.',
      detail:
        'The tutorial clears the previous demo booking and creates a new session so every choice you see belongs to this walkthrough.',
      run: goServices,
      waitMs: 300,
    },
    {
      id: 'pick-site-service',
      caption: 'Pick a site and a service.',
      detail:
        'The athlete chooses where the appointment will happen and which assessment they want. These selections determine availability, duration, and price.',
      target: '[data-tour="service-grid"], [data-tour-site-card]',
      run: (ctx) => ctx.pickSiteAndServiceViaUI(),
      waitMs: 400,
    },
    {
      id: 'continue-to-schedule',
      caption: 'Click Continue → Schedule.',
      detail:
        'With the service selected, the booking moves to its calendar so the athlete can choose an available appointment.',
      target: '[data-tour="primary-action"]',
      run: (ctx) => ctx.clickPrimaryAction(),
      waitMs: 400,
    },
    {
      id: 'pick-slot',
      caption: 'Pick the first available slot.',
      detail:
        'The selected date and time are reserved in the booking session and carried into the review page.',
      target: '[data-tour="slot-grid"]',
      run: (ctx) => ctx.pickFirstSlotViaUI(),
      waitMs: 400,
    },
    {
      id: 'continue-to-review',
      caption: 'Continue → Review.',
      detail:
        'The review page brings the location, service, appointment, and price together before payment.',
      target: '[data-tour="primary-action"]',
      run: (ctx) => ctx.clickPrimaryAction(),
      waitMs: 400,
    },
    {
      id: 'pay',
      caption: 'Pay & finalize as SELF.',
      detail:
        'The athlete is both purchaser and attendee. Finalizing creates the booking, visit, and invoice, then shows the confirmation.',
      run: async (ctx) => {
        await ctx.setMode('SELF');
        await ctx.payAndFinalize({
          purchaserName: PURCHASER.name,
          purchaserEmail: PURCHASER.email,
        });
        ctx.navigate('/booking/confirmation');
      },
      waitMs: 700,
    },
  ],
};

// The mock schema still requires a slot for SELF, so we pick one silently
// and label the step honestly. The real API would branch on
// Service.RequiresScheduling and skip both the Schedule page and the slot.
export const SELF_NO_SCHEDULING: TutorialScript = {
  id: 'self-no-scheduling',
  title: 'Standard booking · no scheduling',
  subtitle: 'Slot-less product — real API would skip the calendar step.',
  steps: [
    {
      id: 'reset',
      caption: 'Fresh lab session on Services.',
      detail:
        'A clean session makes this walkthrough independent from any booking you tried previously.',
      run: goServices,
      waitMs: 300,
    },
    {
      id: 'pick-site-service',
      caption: 'Pick a site and a service.',
      detail:
        'This example represents a product that does not require the purchaser to choose an appointment. In the real API, Service.RequiresScheduling = false skips the calendar.',
      target: '[data-tour="service-grid"], [data-tour-site-card]',
      run: (ctx) => ctx.pickSiteAndServiceViaUI(),
      waitMs: 400,
    },
    {
      id: 'continue-to-schedule',
      caption: 'Continue (mock still shows the calendar).',
      detail:
        'The lab mock currently requires a slot internally. The production flow would move directly to Review for this service type.',
      target: '[data-tour="primary-action"]',
      run: (ctx) => ctx.clickPrimaryAction(),
      waitMs: 400,
    },
    {
      id: 'auto-slot',
      caption: 'Silently pick a slot to satisfy the mock, then jump to Review.',
      detail:
        'This is a demo-only compatibility step. Customers would not see or make this appointment choice in the real no-scheduling flow.',
      run: async (ctx) => {
        await ctx.pickFirstSlotViaUI();
        await ctx.clickPrimaryAction();
      },
      waitMs: 500,
    },
    {
      id: 'pay',
      caption: 'Pay & finalize (no slot-picking step in the real flow).',
      detail:
        'Payment completes the self-purchase and creates the corresponding booking records without asking the customer to manage a calendar.',
      run: async (ctx) => {
        await ctx.setMode('SELF');
        await ctx.payAndFinalize({
          purchaserName: PURCHASER.name,
          purchaserEmail: PURCHASER.email,
        });
        ctx.navigate('/booking/confirmation');
      },
      waitMs: 700,
    },
  ],
};

export const GIFT_WITH_SCHEDULING: TutorialScript = {
  id: 'gift-with-scheduling',
  title: 'Gift · Phase 1A — schedule now',
  subtitle: 'Purchaser picks the slot on the recipient\'s behalf.',
  steps: [
    {
      id: 'reset',
      caption: 'Fresh lab session on Services.',
      detail:
        'The tutorial starts a clean gift purchase so purchaser and recipient information can be tracked separately.',
      run: goServices,
      waitMs: 300,
    },
    {
      id: 'pick-site-service',
      caption: 'Purchaser picks a site + service.',
      detail:
        'The purchaser chooses what to give and where the recipient will attend. The recipient cannot change this included assessment later.',
      target: '[data-tour="service-grid"], [data-tour-site-card]',
      run: (ctx) => ctx.pickSiteAndServiceViaUI(),
      waitMs: 400,
    },
    {
      id: 'continue-to-schedule',
      caption: 'Continue → Schedule.',
      detail:
        'Phase 1A lets the purchaser arrange the appointment now instead of asking the recipient to schedule after receiving the gift.',
      target: '[data-tour="primary-action"]',
      run: (ctx) => ctx.clickPrimaryAction(),
      waitMs: 400,
    },
    {
      id: 'pick-slot',
      caption: 'Purchaser picks a slot for the recipient.',
      detail:
        'The purchaser chooses an available appointment on the recipient’s behalf. That time becomes part of the gifted booking.',
      target: '[data-tour="slot-grid"]',
      run: (ctx) => ctx.pickFirstSlotViaUI(),
      waitMs: 400,
    },
    {
      id: 'continue-to-review',
      caption: 'Continue → Review.',
      detail:
        'The purchaser reviews the gift, recipient, location, appointment, and payment amount before finalizing.',
      target: '[data-tour="primary-action"]',
      run: (ctx) => ctx.clickPrimaryAction(),
      waitMs: 400,
    },
    {
      id: 'pay-gift-now',
      caption: 'Pay as gift + schedule-now.',
      detail:
        'Payment creates the Booking, Gift, and Visit together. The recipient owns the appointment while the purchaser remains the payment owner.',
      run: async (ctx) => {
        await ctx.setMode('GIFT_SCHEDULE_NOW');
        await ctx.payAndFinalize({
          purchaserName: PURCHASER.name,
          purchaserEmail: PURCHASER.email,
          recipientName: RECIPIENT.name,
          recipientEmail: RECIPIENT.email,
        });
        ctx.navigate('/booking/confirmation');
      },
      waitMs: 700,
    },
  ],
};

export const GIFT_NO_SCHEDULING: TutorialScript = {
  id: 'gift-no-scheduling',
  title: 'Gift · Phase 1B — recipient schedules',
  subtitle: 'Purchaser buys a claim link, recipient picks their own time.',
  steps: [
    {
      id: 'reset',
      caption: 'Fresh lab session on Services.',
      detail:
        'The tutorial clears prior data and begins a new Phase 1B gift purchase with no appointment selected.',
      run: goServices,
      waitMs: 300,
    },
    {
      id: 'pick-site-service',
      caption: 'Purchaser picks a site + service.',
      detail:
        'The purchaser defines the gift and location. The recipient will receive the same assessment with pricing hidden.',
      target: '[data-tour="service-grid"], [data-tour-site-card]',
      run: (ctx) => ctx.pickSiteAndServiceViaUI(),
      waitMs: 400,
    },
    {
      id: 'continue-to-review',
      caption: 'Skip the calendar — go straight to Review.',
      detail:
        'No appointment is chosen during purchase. This protects the recipient’s schedule and lets them select a convenient time later.',
      run: async (ctx) => {
        ctx.navigate('/booking/review');
      },
      waitMs: 400,
    },
    {
      id: 'finalize-gift',
      caption: 'Finalize the gift; server returns a claim token.',
      detail:
        'Payment is recorded without creating a Visit. The server creates a secure claim token that connects the future recipient to this prepaid gift.',
      run: async (ctx, memo) => {
        await ctx.setMode('GIFT_SCHEDULE_LATER');
        const res = await ctx.finalizeGift({
          purchaserName: PURCHASER.name,
          purchaserEmail: PURCHASER.email,
          recipientName: RECIPIENT.name,
          recipientEmail: RECIPIENT.email,
        });
        if (!res.claimToken) throw new Error('No claimToken returned');
        memo.claimToken = res.claimToken;
      },
      waitMs: 500,
    },
    {
      id: 'purchaser-confirmation',
      caption: 'Purchaser confirmation page.',
      detail:
        'The purchaser sees that payment succeeded and receives the claim link that will be sent to the recipient.',
      run: async (ctx) => ctx.navigate('/booking/confirmation'),
      waitMs: 600,
    },
    {
      id: 'switch-to-recipient',
      caption: 'Recipient opens the claim link.',
      detail:
        'The walkthrough now changes perspective through the same URL a real email would deliver. The recipient sees the gift and location, but never what the purchaser paid.',
      run: async (ctx, memo) => {
        const token = memo.claimToken as string;
        ctx.navigate(`/gift/${token}`);
      },
      waitMs: 500,
    },
    {
      id: 'recipient-claim',
      caption: 'Recipient claims the gift + schedules.',
      detail:
        'After identity is confirmed, the recipient claims ownership and chooses an available slot. The prepaid ledger is reused, so there is no second charge.',
      run: async (ctx, memo) => {
        const token = memo.claimToken as string;
        await ctx.claimGift(token, RECIPIENT.email);
        await ctx.scheduleClaimed(token);
        await new Promise((resolve) => window.setTimeout(resolve, 0));
        ctx.navigate(`/gift/${token}/schedule`);
      },
      waitMs: 700,
    },
  ],
};

export const ALL_SCRIPTS: TutorialScript[] = [
  SELF_WITH_SCHEDULING,
  SELF_NO_SCHEDULING,
  GIFT_WITH_SCHEDULING,
  GIFT_NO_SCHEDULING,
];
