import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Container,
  Divider,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconArrowRight,
  IconCheck,
  IconGift,
  IconInfoCircle,
  IconLock,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from 'urql';
import {
  AVAILABLE_SLOTS_QUERY,
  GIFT_PREVIEW_QUERY,
  SCHEDULE_CLAIMED_MUTATION,
} from '../client/gql';
import { FlowBadge } from '../shared/FlowBadge';
import { InfoTooltip } from '../shared/InfoTooltip';
import { RequirementRef } from '../shared/RequirementRef';
import { SelectionCard } from '../shared/SelectionCard';

type Preview = {
  id: string;
  status: string;
  confirmationCode: string | null;
  priceCents: number | null;
  selections: {
    purchaserName: string | null;
    recipientName: string | null;
    slotId: string | null;
  };
  site: { name: string; city: string; addressLine: string } | null;
  service: { id: string; name: string; description: string; durationMinutes: number } | null;
  slot: { id: string; startsAt: string; employeeName: string } | null;
};

type Slot = { id: string; serviceId: string; startsAt: string; employeeName: string };

function fmtDay(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
function fmtSlot(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function GiftSchedulePage() {
  const navigate = useNavigate();
  const { token = '' } = useParams();

  const [claimResult, refetchClaim] = useQuery<{ getGiftBookingPreview: Preview | null }>({
    query: GIFT_PREVIEW_QUERY,
    variables: { bookingId: token },
    pause: !token,
    requestPolicy: 'network-only',
  });
  const claim = claimResult.data?.getGiftBookingPreview ?? null;
  const serviceId = claim?.service?.id ?? null;

  const [slotsResult] = useQuery<{ availableSlots: Slot[] }>({
    query: AVAILABLE_SLOTS_QUERY,
    variables: { serviceId: serviceId ?? '' },
    pause: !serviceId,
  });

  const [, scheduleClaimed] = useMutation(SCHEDULE_CLAIMED_MUTATION);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const groups = new Map<string, Slot[]>();
    (slotsResult.data?.availableSlots ?? []).forEach((slot) => {
      const key = fmtDay(slot.startsAt);
      const arr = groups.get(key) ?? [];
      arr.push(slot);
      groups.set(key, arr);
    });
    return Array.from(groups.entries());
  }, [slotsResult.data]);

  async function handleConfirm() {
    if (!selectedSlotId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await scheduleClaimed({ bookingId: token, slotId: selectedSlotId });
      if (res.error) throw res.error;
      await refetchClaim({ requestPolicy: 'network-only' });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (claimResult.fetching) {
    return (
      <Container size="md" py="xl">
        <Group justify="center" mih={300}>
          <Loader color="purple" />
        </Group>
      </Container>
    );
  }

  if (!claim) {
    return (
      <Container size="sm" py="xl">
        <Alert color="red" variant="light" icon={<IconInfoCircle size={16} />}>
          This booking could not be loaded.
        </Alert>
      </Container>
    );
  }

  if (claim.status === 'PAID_AWAITING_CLAIM') {
    return (
      <Container size="sm" py="xl">
        <Alert color="yellow" variant="light" icon={<IconInfoCircle size={16} />}>
          You need to sign in first.
        </Alert>
        <Button mt="md" onClick={() => navigate(`/gift/${token}`)}>
          Go back
        </Button>
      </Container>
    );
  }

  if (claim.status === 'CONFIRMED' && claim.slot) {
    return (
      <Container size="md" py="lg">
        <Group justify="space-between" mb="md">
          <Group gap="sm">
            <ThemeIcon color="purple" radius="xl" size="lg">
              <IconCheck size={18} stroke={3} />
            </ThemeIcon>
            <Title order={2}>Your appointment is booked!</Title>
          </Group>
          <FlowBadge mode="RECIPIENT" />
        </Group>

        <Card withBorder radius="md" p="lg">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Confirmation code
              </Text>
              <Badge color="gray" variant="light" size="lg">
                {claim.confirmationCode}
              </Badge>
            </Group>
            <Group justify="space-between">
              <Text size="sm">Service</Text>
              <Text size="sm" fw={500}>
                {claim.service?.name} ({claim.service?.durationMinutes} min)
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm">Location</Text>
              <Text size="sm" fw={500}>
                {claim.site?.name}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm">When</Text>
              <Text size="sm" fw={500}>
                {fmtSlot(claim.slot.startsAt)} · {claim.slot.employeeName}
              </Text>
            </Group>
            <Alert color="purple" variant="light" icon={<IconGift size={16} />} mt="xs">
              Included and paid by{' '}
              <b>{claim.selections.purchaserName ?? 'the purchaser'}</b>. You'll get a
              reminder the day before. Post-visit surveys go to you{' '}
              <RequirementRef code="FR-8" />.
            </Alert>
          </Stack>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="lg" py="lg">
      <Paper
        radius="md"
        p="md"
        mb="lg"
        style={{ background: 'var(--mantine-color-purple-0)' }}
      >
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs">
            <IconGift size={20} color="var(--mantine-color-purple-8)" />
            <Text size="sm" c="purple.9">
              <b>{claim.service?.name}</b> — gifted by{' '}
              <b>{claim.selections.purchaserName ?? 'a friend'}</b>
            </Text>
          </Group>
          <Badge color="purple" variant="light" leftSection={<IconLock size={12} />}>
            Recipient view — pricing hidden
          </Badge>
        </Group>
      </Paper>

      <Group justify="space-between" mb="md">
        <Box>
          <Title order={2}>Pick a time that works for you</Title>
          <Group gap={6}>
            <Text c="dimmed" size="sm">
              Your Purchaser doesn't see your schedule.
            </Text>
            <InfoTooltip label="When the Recipient picks a slot, the server calls the normal finalizeBooking. LP-2178 detects the pre-paid PaymentLedger row (matched by BookingId) and backfills VisitId onto it — so accounting stays intact and no second charge occurs. Spec §4.2, §7.2 (LP-2178)." />
          </Group>
        </Box>
        <FlowBadge mode="RECIPIENT" />
      </Group>

      {/* Included assessments — locked per FR-6 */}
      <Card withBorder radius="md" p="md" mb="md" bg="gray.0">
        <Group justify="space-between" mb="xs">
          <Group gap={6}>
            <IconLock size={16} color="var(--mantine-color-purple-6)" />
            <Text fw={600}>Included assessments</Text>
            <InfoTooltip label="FR-6: Included assessments are visible but non-removable in the Recipient flow — the bundle was defined by the Purchaser. FR-7: pricing must not be displayed to the Recipient during redemption. Enforced client-side by isModuleLockedSelector and showPricingSelector. PRD §6 (FR-6, FR-7) · Spec §4.2, §9 (recipient-cache risk)." />
          </Group>
          <Badge color="gray" variant="light">
            Locked
          </Badge>
        </Group>
        <Checkbox
          checked
          disabled
          label={
            <Group gap={6}>
              <Text fw={500}>{claim.service?.name}</Text>
              <Text size="xs" c="dimmed">
                ({claim.service?.durationMinutes} min)
              </Text>
            </Group>
          }
        />
        <Text size="xs" c="dimmed" mt={6}>
          {claim.service?.description}
        </Text>
        <Divider my="sm" />
        <Text size="xs" c="dimmed">
          Included and paid by the Purchaser. Pricing is not shown to Recipients{' '}
          <RequirementRef code="FR-7" />.
        </Text>
      </Card>

      {error && (
        <Alert color="red" variant="light" mb="md">
          {error}
        </Alert>
      )}

      <Stack gap="lg">
        {byDay.map(([day, slots]) => (
          <Box key={day}>
            <Text fw={600} mb="xs">
              {day}
            </Text>
            <Group gap="sm">
              {slots.map((slot) => (
                <SelectionCard
                  key={slot.id}
                  title={fmtTime(slot.startsAt)}
                  description={`with ${slot.employeeName}`}
                  selected={selectedSlotId === slot.id}
                  onClick={() => setSelectedSlotId(slot.id)}
                />
              ))}
            </Group>
          </Box>
        ))}
      </Stack>

      <Paper withBorder radius="md" p="md" mt="lg" bg="white">
        <Group justify="flex-end">
          <Button
            color="purple"
            onClick={handleConfirm}
            disabled={!selectedSlotId || submitting}
            loading={submitting}
            rightSection={<IconArrowRight size={16} />}
          >
            Confirm appointment
          </Button>
        </Group>
      </Paper>
    </Container>
  );
}
