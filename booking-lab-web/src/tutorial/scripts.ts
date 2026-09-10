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

const PURCHASER = {
  name: 'Jamie Chen',
  email: 'jamie.chen@example.com',
};
const RECIPIENT = {
  name: 'Alex Rivera',
  email: 'alex.rivera@example.com',
};

const goServices = async (ctx: TutorialCtx) => {
  ctx.reset();
  ctx.navigate('/booking', { replace: true });
};

export const SELF_WITH_SCHEDULING: TutorialScript = {
  id: 'self-with-scheduling',
  title: 'BOBO · buy for self',
  subtitle: 'Athlete picks a service, schedules, pays.',
  steps: [
    {
      id: 'reset',
      caption: 'Reset the lab and land on Services.',
      run: goServices,
      waitMs: 400,
    },
    {
      id: 'pick-service',
      caption: 'Pick a site + service.',
      detail: 'Commits siteId + serviceId to the session via makeSelections.',
      target: '[data-tour="service-grid"]',
      run: async (ctx) => {
        await ctx.chooseServiceAndSite();
      },
      waitMs: 600,
    },
    {
      id: 'go-schedule',
      caption: 'Advance to the schedule step.',
      run: async (ctx) => ctx.navigate('/booking/schedule'),
      waitMs: 400,
    },
    {
      id: 'pick-slot',
      caption: 'Pick the first available slot.',
      target: '[data-tour="slot-grid"]',
      run: async (ctx) => {
        await ctx.pickFirstSlot();
      },
      waitMs: 700,
    },
    {
      id: 'go-review',
      caption: 'Move to Review.',
      run: async (ctx) => ctx.navigate('/booking/review'),
      waitMs: 400,
    },
    {
      id: 'pay',
      caption: 'Pay & finalize (SELF).',
      detail: 'PayAndFinalize creates a Visit + Invoice, sets status to CONFIRMED.',
      run: async (ctx) => {
        await ctx.setMode('SELF');
        await ctx.payAndFinalize({
          purchaserName: PURCHASER.name,
          purchaserEmail: PURCHASER.email,
        });
      },
      waitMs: 700,
    },
    {
      id: 'confirm',
      caption: 'Confirmation page.',
      run: async (ctx) => ctx.navigate('/booking/confirmation'),
      waitMs: 400,
    },
  ],
};

export const SELF_NO_SCHEDULING: TutorialScript = {
  id: 'self-no-scheduling',
  title: 'BOBO · buy without scheduling',
  subtitle: 'Athlete buys a slot-less product (skips the calendar step).',
  steps: [
    {
      id: 'reset',
      caption: 'Reset the lab.',
      run: goServices,
      waitMs: 400,
    },
    {
      id: 'pick-service',
      caption: 'Pick a service.',
      detail:
        'In the real API, Service.RequiresScheduling = false would skip the slot step.',
      run: async (ctx) => {
        await ctx.chooseServiceAndSite();
      },
      waitMs: 500,
    },
    {
      id: 'skip-to-review',
      caption: 'Skip the schedule step (product is slot-less).',
      run: async (ctx) => ctx.navigate('/booking/review'),
      waitMs: 400,
    },
    {
      id: 'pay',
      caption: 'Pay & finalize without a slot.',
      detail:
        'Mock schema requires a slot for SELF — for the demo we fall back to picking one automatically. Real API would branch on RequiresScheduling.',
      run: async (ctx) => {
        await ctx.pickFirstSlot();
        await ctx.setMode('SELF');
        await ctx.payAndFinalize({
          purchaserName: PURCHASER.name,
          purchaserEmail: PURCHASER.email,
        });
      },
      waitMs: 700,
    },
    {
      id: 'confirm',
      caption: 'Confirmation.',
      run: async (ctx) => ctx.navigate('/booking/confirmation'),
      waitMs: 400,
    },
  ],
};

export const GIFT_WITH_SCHEDULING: TutorialScript = {
  id: 'gift-with-scheduling',
  title: 'Gift · Phase 1A — schedule now',
  subtitle: 'Purchaser picks a service + slot for the recipient, then pays.',
  steps: [
    {
      id: 'reset',
      caption: 'Reset the lab.',
      run: goServices,
      waitMs: 400,
    },
    {
      id: 'pick-service',
      caption: 'Purchaser picks a service.',
      run: async (ctx) => {
        await ctx.chooseServiceAndSite();
      },
      waitMs: 500,
    },
    {
      id: 'pick-slot',
      caption: 'Purchaser picks a slot on the recipient\'s behalf.',
      run: async (ctx) => {
        await ctx.pickFirstSlot();
        ctx.navigate('/booking/schedule');
      },
      waitMs: 700,
    },
    {
      id: 'go-review',
      caption: 'Advance to Review.',
      run: async (ctx) => ctx.navigate('/booking/review'),
      waitMs: 400,
    },
    {
      id: 'pay',
      caption: 'Pay as gift + schedule-now.',
      detail: 'PayAndFinalize with mode=GIFT_SCHEDULE_NOW → Booking + Visit + Gift row.',
      run: async (ctx) => {
        await ctx.setMode('GIFT_SCHEDULE_NOW');
        await ctx.payAndFinalize({
          purchaserName: PURCHASER.name,
          purchaserEmail: PURCHASER.email,
          recipientName: RECIPIENT.name,
          recipientEmail: RECIPIENT.email,
        });
      },
      waitMs: 700,
    },
    {
      id: 'confirm',
      caption: 'Confirmation — recipient will get a heads-up email.',
      run: async (ctx) => ctx.navigate('/booking/confirmation'),
      waitMs: 400,
    },
  ],
};

export const GIFT_NO_SCHEDULING: TutorialScript = {
  id: 'gift-no-scheduling',
  title: 'Gift · Phase 1B — recipient picks time',
  subtitle: 'Purchaser pays for a slot-less gift; recipient later claims + schedules.',
  steps: [
    {
      id: 'reset',
      caption: 'Reset the lab.',
      run: goServices,
      waitMs: 400,
    },
    {
      id: 'pick-service',
      caption: 'Purchaser picks a service.',
      run: async (ctx) => {
        await ctx.chooseServiceAndSite();
      },
      waitMs: 500,
    },
    {
      id: 'go-review',
      caption: 'Skip scheduling — go straight to Review.',
      run: async (ctx) => ctx.navigate('/booking/review'),
      waitMs: 400,
    },
    {
      id: 'finalize-gift',
      caption: 'FinalizeGiftBooking — issues a claim token, sends email.',
      detail:
        'Creates Booking (no Visit), Gift + GiftClaim rows. Claim URL becomes /gift/<token>.',
      run: async (ctx, memo) => {
        await ctx.setMode('GIFT_SCHEDULE_LATER');
        const res = await ctx.finalizeGift({
          purchaserName: PURCHASER.name,
          purchaserEmail: PURCHASER.email,
          recipientName: RECIPIENT.name,
          recipientEmail: RECIPIENT.email,
        });
        memo.claimToken = res.claimToken;
      },
      waitMs: 800,
    },
    {
      id: 'confirmation',
      caption: 'Purchaser confirmation — awaiting claim.',
      run: async (ctx) => ctx.navigate('/booking/confirmation'),
      waitMs: 500,
    },
    {
      id: 'open-claim',
      caption: 'Switch to the recipient — open the claim link.',
      run: async (ctx, memo) => {
        const token = memo.claimToken as string | null;
        if (!token) throw new Error('No claim token');
        ctx.navigate(`/gift/${token}`);
      },
      waitMs: 600,
    },
    {
      id: 'claim',
      caption: 'Recipient claims the gift.',
      run: async (ctx, memo) => {
        const token = memo.claimToken as string | null;
        if (!token) throw new Error('No claim token');
        await ctx.claimGift(token, RECIPIENT.email);
      },
      waitMs: 500,
    },
    {
      id: 'go-claim-schedule',
      caption: 'Recipient picks a time.',
      run: async (ctx, memo) => {
        const token = memo.claimToken as string | null;
        if (!token) throw new Error('No claim token');
        ctx.navigate(`/gift/${token}/schedule`);
      },
      waitMs: 400,
    },
    {
      id: 'schedule-claim',
      caption: 'ScheduleClaimedBooking → CONFIRMED.',
      run: async (ctx, memo) => {
        const token = memo.claimToken as string | null;
        if (!token) throw new Error('No claim token');
        await ctx.scheduleClaimed(token);
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
