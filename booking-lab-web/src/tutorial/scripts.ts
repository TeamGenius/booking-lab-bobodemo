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
  title: 'BOBO · buy for self',
  subtitle: 'Athlete picks a site + service + slot, then pays.',
  steps: [
    {
      id: 'reset',
      caption: 'Fresh lab session on the Services page.',
      run: goServices,
      waitMs: 300,
    },
    {
      id: 'pick-site-service',
      caption: 'Pick a site and a service.',
      detail: 'Clicks the first location card, then the first service card.',
      target: '[data-tour="service-grid"], [data-tour-site-card]',
      run: (ctx) => ctx.pickSiteAndServiceViaUI(),
      waitMs: 400,
    },
    {
      id: 'continue-to-schedule',
      caption: 'Click Continue → Schedule.',
      target: '[data-tour="primary-action"]',
      run: (ctx) => ctx.clickPrimaryAction(),
      waitMs: 400,
    },
    {
      id: 'pick-slot',
      caption: 'Pick the first available slot.',
      target: '[data-tour="slot-grid"]',
      run: (ctx) => ctx.pickFirstSlotViaUI(),
      waitMs: 400,
    },
    {
      id: 'continue-to-review',
      caption: 'Continue → Review.',
      target: '[data-tour="primary-action"]',
      run: (ctx) => ctx.clickPrimaryAction(),
      waitMs: 400,
    },
    {
      id: 'pay',
      caption: 'Pay & finalize as SELF.',
      detail: 'PayAndFinalize commits the booking + invoice server-side.',
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
  title: 'BOBO · buy without scheduling',
  subtitle: 'Slot-less product — real API would skip the calendar step.',
  steps: [
    {
      id: 'reset',
      caption: 'Fresh lab session on Services.',
      run: goServices,
      waitMs: 300,
    },
    {
      id: 'pick-site-service',
      caption: 'Pick a site and a service.',
      detail:
        'Real API: Service.RequiresScheduling = false would skip the next step.',
      target: '[data-tour="service-grid"], [data-tour-site-card]',
      run: (ctx) => ctx.pickSiteAndServiceViaUI(),
      waitMs: 400,
    },
    {
      id: 'continue-to-schedule',
      caption: 'Continue (mock still shows the calendar).',
      target: '[data-tour="primary-action"]',
      run: (ctx) => ctx.clickPrimaryAction(),
      waitMs: 400,
    },
    {
      id: 'auto-slot',
      caption: 'Silently pick a slot to satisfy the mock, then jump to Review.',
      run: async (ctx) => {
        await ctx.pickFirstSlotViaUI();
        await ctx.clickPrimaryAction();
      },
      waitMs: 500,
    },
    {
      id: 'pay',
      caption: 'Pay & finalize (no slot-picking step in the real flow).',
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
      run: goServices,
      waitMs: 300,
    },
    {
      id: 'pick-site-service',
      caption: 'Purchaser picks a site + service.',
      target: '[data-tour="service-grid"], [data-tour-site-card]',
      run: (ctx) => ctx.pickSiteAndServiceViaUI(),
      waitMs: 400,
    },
    {
      id: 'continue-to-schedule',
      caption: 'Continue → Schedule.',
      target: '[data-tour="primary-action"]',
      run: (ctx) => ctx.clickPrimaryAction(),
      waitMs: 400,
    },
    {
      id: 'pick-slot',
      caption: 'Purchaser picks a slot for the recipient.',
      target: '[data-tour="slot-grid"]',
      run: (ctx) => ctx.pickFirstSlotViaUI(),
      waitMs: 400,
    },
    {
      id: 'continue-to-review',
      caption: 'Continue → Review.',
      target: '[data-tour="primary-action"]',
      run: (ctx) => ctx.clickPrimaryAction(),
      waitMs: 400,
    },
    {
      id: 'pay-gift-now',
      caption: 'Pay as gift + schedule-now.',
      detail: 'PayAndFinalize with mode=GIFT_SCHEDULE_NOW writes Booking + Gift + Visit.',
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
      run: goServices,
      waitMs: 300,
    },
    {
      id: 'pick-site-service',
      caption: 'Purchaser picks a site + service.',
      target: '[data-tour="service-grid"], [data-tour-site-card]',
      run: (ctx) => ctx.pickSiteAndServiceViaUI(),
      waitMs: 400,
    },
    {
      id: 'continue-to-review',
      caption: 'Skip the calendar — go straight to Review.',
      run: async (ctx) => {
        ctx.navigate('/booking/review');
      },
      waitMs: 400,
    },
    {
      id: 'finalize-gift',
      caption: 'Finalize the gift; server returns a claim token.',
      detail: 'FinalizeGiftBooking: no slot needed, recipient scheduling happens on claim.',
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
      run: async (ctx) => ctx.navigate('/booking/confirmation'),
      waitMs: 600,
    },
    {
      id: 'switch-to-recipient',
      caption: 'Recipient opens the claim link.',
      detail: 'Same URL a real email would deliver.',
      run: async (ctx, memo) => {
        const token = memo.claimToken as string;
        ctx.navigate(`/gift/${token}`);
      },
      waitMs: 500,
    },
    {
      id: 'recipient-claim',
      caption: 'Recipient claims the gift + schedules.',
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
