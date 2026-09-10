import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Progress,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowRight,
  IconCircleCheck,
  IconGift,
  IconLock,
  IconTrash,
} from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from 'urql';
import { BOOKING_SESSION_QUERY } from '../client/gql';
import { useBookingActions } from './BookingActionsContext';
import { InfoTooltip } from './InfoTooltip';
import { useSessionContext } from './SessionContext';

type Mode = 'SELF' | 'GIFT_SCHEDULE_NOW' | 'GIFT_SCHEDULE_LATER';

type Session = {
  id: string;
  status: string;
  priceCents: number | null;
  selections: {
    siteId: string | null;
    serviceId: string | null;
    slotId: string | null;
    isGiftBooking: boolean;
    mode: Mode;
  };
  site: { name: string } | null;
  service: { id: string; name: string; priceCents: number; durationMinutes: number } | null;
  slot: { startsAt: string; employeeName: string } | null;
};

type Tier = { pct: number; threshold: number; label: string };

// Fake discount tiers — same visual style as production admin flow.
const TIERS: Tier[] = [
  { pct: 0, threshold: 0, label: '0%' },
  { pct: 5, threshold: 200_00, label: '5%' },
  { pct: 15, threshold: 410_00, label: '15%' },
  { pct: 20, threshold: 960_00, label: '20%' },
  { pct: 50, threshold: 1500_00, label: '50%' },
];

function tierForSubtotal(subtotal: number): Tier {
  let current: Tier = TIERS[0]!;
  for (const t of TIERS) {
    if (subtotal >= t.threshold) current = t;
  }
  return current;
}

function nextTier(subtotal: number): Tier | null {
  for (const t of TIERS) {
    if (subtotal < t.threshold) return t;
  }
  return null;
}

function usd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function CustomSelectionSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId } = useSessionContext();
  const { action } = useBookingActions();

  const [sessionResult] = useQuery<{ bookingSession: Session | null }>({
    query: BOOKING_SESSION_QUERY,
    variables: { id: sessionId ?? '' },
    pause: !sessionId,
  });
  const session = sessionResult.data?.bookingSession ?? null;
  const service = session?.service ?? null;
  const site = session?.site ?? null;
  const mode = session?.selections.mode ?? 'SELF';

  const subtotal = service?.priceCents ?? 0;
  const currentTier = tierForSubtotal(subtotal);
  const upcoming = nextTier(subtotal);
  const discountCents = Math.floor((subtotal * currentTier.pct) / 100);
  const total = subtotal - discountCents;

  const isConfirmation = location.pathname === '/booking/confirmation';
  const isReview = location.pathname === '/booking/review';

  const progressPct = (() => {
    const idx = TIERS.indexOf(currentTier);
    const nextIdx = upcoming ? TIERS.indexOf(upcoming) : TIERS.length - 1;
    if (!upcoming) return 100;
    const currentThreshold = currentTier.threshold;
    const nextThreshold = upcoming.threshold;
    const localPct =
      (subtotal - currentThreshold) / Math.max(1, nextThreshold - currentThreshold);
    const segmentSize = 100 / (TIERS.length - 1);
    return Math.min(100, idx * segmentSize + localPct * segmentSize);
  })();

  return (
    <Box p="md" style={{ height: '100%', overflowY: 'auto' }}>
      <Group justify="space-between" align="center" mb={4}>
        <Text fw={700}>Custom Selection</Text>
        <Text size="xs" c="dimmed">
          🛒
        </Text>
      </Group>
      <Divider mb="md" />

      {/* Mode chip */}
      {mode !== 'SELF' && (
        <Group gap={6} mb="md">
          <ThemeIcon color="purple" variant="light" size="sm" radius="xl">
            <IconGift size={12} />
          </ThemeIcon>
          <Text size="xs" fw={600} c="purple.9">
            BOBO ·{' '}
            {mode === 'GIFT_SCHEDULE_NOW' ? 'Gift · schedule now' : 'Gift · schedule later'}
          </Text>
          <InfoTooltip
            label={
              mode === 'GIFT_SCHEDULE_NOW'
                ? 'Phase 1A — Purchaser picks the appointment on the Recipient\u2019s behalf. Server calls finalizeBooking(isGiftBooking: true); a Visit is created immediately and Recipient just shows up. PRD §5 Scenario B · Spec §4.2, §7.4.'
                : 'Phase 1B (MVP path) — Purchaser pays now, no slot chosen. Server calls finalizeGiftBooking and captures payment against PaymentLedger.BookingId with an Unscheduled snapshot (LP-2167). Recipient signs in and schedules later. PRD §5 Scenario A · Spec §4.2, §7.4.'
            }
          />
        </Group>
      )}

      {/* Selected services */}
      <Text size="xs" fw={600} c="dimmed" ta="center" mb={6}>
        Selected Services
      </Text>
      {!service ? (
        <Box
          p="md"
          mb="md"
          style={{
            border: '1px dashed var(--mantine-color-gray-3)',
            borderRadius: 8,
            textAlign: 'center',
          }}
        >
          <Text size="xs" c="dimmed">
            No services selected yet.
          </Text>
        </Box>
      ) : (
        <Stack gap={4} mb="md">
          <Group justify="space-between" wrap="nowrap">
            <Group gap={6} wrap="nowrap">
              <Anchor
                component="button"
                size="sm"
                c="orange.7"
                underline="always"
                onClick={() => navigate('/booking')}
              >
                {service.name}
              </Anchor>
            </Group>
            <Group gap={6} wrap="nowrap">
              {discountCents > 0 && (
                <Text size="xs" c="dimmed" td="line-through">
                  {usd(subtotal)}
                </Text>
              )}
              <Text size="sm" fw={600}>
                {usd(subtotal - discountCents)}
              </Text>
              {!isConfirmation && (
                <Tooltip label="Remove service">
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    onClick={() => navigate('/booking')}
                    aria-label="Remove"
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
          </Group>
          {site && (
            <Text size="xs" c="dimmed">
              at {site.name}
              {session?.slot &&
                ` · ${new Date(session.slot.startsAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}`}
            </Text>
          )}
        </Stack>
      )}

      {/* Discount tiers */}
      {service && (
        <>
          <Text size="xs" fw={600} c="dimmed" ta="center" mb={6}>
            Discount Tiers
          </Text>
          <Box mb={4}>
            <Group gap={4} align="baseline">
              <Text size="xs" c="dimmed">
                Applied Value
              </Text>
              <InfoTooltip label="Total eligible spend counted toward the next discount tier." />
              <Text size="xs" fw={600} ml="auto">
                {usd(subtotal)}
              </Text>
            </Group>
          </Box>

          <Box
            p="xs"
            mb="sm"
            style={{
              background: 'var(--mantine-color-orange-0)',
              borderRadius: 6,
              border: '1px solid var(--mantine-color-orange-2)',
            }}
          >
            <Text size="xs" c="dark">
              {upcoming ? (
                <>
                  You{"'"}re receiving{' '}
                  <Text span fw={700} c="orange.7">
                    {currentTier.pct}% off
                  </Text>
                  . Add{' '}
                  <Text span fw={700} c="orange.7">
                    {usd(upcoming.threshold - subtotal)}
                  </Text>{' '}
                  in eligible services to unlock{' '}
                  <Text span fw={700} c="orange.7">
                    {upcoming.pct}% off
                  </Text>
                  .
                </>
              ) : (
                <>
                  You{"'"}ve unlocked our top tier — {currentTier.pct}% off.
                </>
              )}
            </Text>
          </Box>

          <Progress
            value={progressPct}
            color="orange"
            size="md"
            radius="xl"
            mb={4}
            styles={{ section: { transition: 'width 300ms ease' } }}
          />
          <Group justify="space-between" px={2} mb="sm">
            {TIERS.map((t) => (
              <Text
                key={t.label}
                size={9}
                fw={t.pct === currentTier.pct ? 700 : 500}
                c={t.pct === currentTier.pct ? 'orange.7' : 'dimmed'}
              >
                {t.label}
              </Text>
            ))}
          </Group>
          <Group justify="space-between" px={2} mb="md">
            {TIERS.map((t) => (
              <Text key={`th-${t.label}`} size={9} c="dimmed">
                {t.threshold === 0 ? '$0' : `$${Math.round(t.threshold / 100)}`}
              </Text>
            ))}
          </Group>

          <Divider mb="sm" label="Summary" labelPosition="center" />

          <Stack gap={4} mb="md">
            <Group justify="space-between">
              <Group gap={4}>
                <Text size="sm">Sub Total</Text>
                <InfoTooltip label="Sum of eligible service prices before discount." />
              </Group>
              <Text size="sm">{usd(subtotal)}</Text>
            </Group>
            <Group justify="space-between">
              <Group gap={4}>
                <Text size="sm" c="dimmed">
                  Discount
                </Text>
                <InfoTooltip label="Automatic discount for the current tier." />
              </Group>
              <Text size="sm" c={discountCents > 0 ? 'green' : 'dimmed'}>
                {discountCents > 0 ? `-${usd(discountCents)}` : '$0.00'}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text fw={700}>Total</Text>
              <Text fw={700}>{usd(total)}</Text>
            </Group>
          </Stack>
        </>
      )}

      {/* Primary action from context */}
      {action && !isReview && !isConfirmation ? (
        <>
          <Button
            fullWidth
            size="md"
            color="purple"
            onClick={() => void action.onClick()}
            disabled={action.disabled}
            loading={action.loading}
            rightSection={<IconArrowRight size={16} />}
          >
            {action.label}
          </Button>
          {action.helper && (
            <Text size="xs" c="dimmed" ta="center" mt={4}>
              {action.helper}
            </Text>
          )}
        </>
      ) : null}

      {isReview && (
        <Badge fullWidth color="purple" variant="light" leftSection={<IconLock size={12} />}>
          Pay button is in Review
        </Badge>
      )}
      {isConfirmation && (
        <Badge
          fullWidth
          color="green"
          variant="light"
          leftSection={<IconCircleCheck size={12} />}
        >
          Booking finalized
        </Badge>
      )}
    </Box>
  );
}
