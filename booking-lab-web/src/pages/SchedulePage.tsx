import {
  Alert,
  Anchor,
  Box,
  Button,
  Container,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import { IconAlertCircle, IconArrowRight, IconGift } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from 'urql';
import {
  AVAILABLE_SLOTS_QUERY,
  BOOKING_SESSION_QUERY,
  MAKE_SELECTIONS_MUTATION,
} from '../client/gql';
import { useBookingActions } from '../shared/BookingActionsContext';
import { BookingStepper } from '../shared/BookingStepper';
import { SectionTitle } from '../shared/SectionTitle';
import { SelectionSummary } from '../shared/SelectionSummary';
import { useSessionContext } from '../shared/SessionContext';

type Slot = { id: string; serviceId: string; startsAt: string; employeeName: string };

type Session = {
  id: string;
  selections: { siteId: string | null; serviceId: string | null; slotId: string | null };
  site: { name: string; addressLine: string; city: string } | null;
  service: { name: string; priceCents: number; durationMinutes: number } | null;
  slot: Slot | null;
};

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
function fmtRangeLabel(range: Date[]) {
  const first = range[0];
  const last = range[range.length - 1];
  if (!first || !last) return '';
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${first.toLocaleDateString(undefined, opts)} - ${last.toLocaleDateString(undefined, opts)}`;
}

export function SchedulePage() {
  const navigate = useNavigate();
  const { sessionId, setSessionId } = useSessionContext();
  const { setAction } = useBookingActions();

  const [sessionResult] = useQuery<{ bookingSession: Session | null }>({
    query: BOOKING_SESSION_QUERY,
    variables: { id: sessionId ?? '' },
    pause: !sessionId,
  });
  const session = sessionResult.data?.bookingSession ?? null;
  const serviceId = session?.selections.serviceId ?? null;

  const [slotsResult] = useQuery<{ availableSlots: Slot[] }>({
    query: AVAILABLE_SLOTS_QUERY,
    variables: { serviceId: serviceId ?? '' },
    pause: !serviceId,
  });

  const [, makeSelections] = useMutation(MAKE_SELECTIONS_MUTATION);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(
    session?.selections.slotId ?? null,
  );
  const [weekStart, setWeekStart] = useState<Date>(() => startOfDay(new Date()));

  const week = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const [selectedDay, setSelectedDay] = useState<Date>(week[0]!);

  const slotsForSelectedDay = useMemo(() => {
    const slots = slotsResult.data?.availableSlots ?? [];
    const dayStart = startOfDay(selectedDay).getTime();
    const dayEnd = addDays(startOfDay(selectedDay), 1).getTime();
    return slots
      .filter((s) => {
        const t = new Date(s.startsAt).getTime();
        return t >= dayStart && t < dayEnd;
      })
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [slotsResult.data, selectedDay]);

  async function handleContinue() {
    if (!sessionId || !selectedSlotId) return;
    await makeSelections({ sessionId, input: { slotId: selectedSlotId } });
    navigate('/booking/review');
  }
// Recover from stale sessionId when the server-side session is gone (e.g. tsx restart).
  const sessionMissing =
    !sessionResult.fetching && !sessionResult.error && sessionId && !session;
  useEffect(() => {
    if (sessionMissing) {
      setSessionId(null);
      navigate('/booking', { replace: true });
    }
  }, [sessionMissing, setSessionId, navigate]);

  // Register the sidebar's primary action.
  useEffect(() => {
    setAction({
      label: 'Continue',
      onClick: handleContinue,
      disabled: !selectedSlotId,
      helper: selectedSlotId
        ? 'Locks the slot and moves to Review.'
        : 'Pick a time to continue — or click “Skip” to let the recipient pick.',
    });
    return () => setAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlotId, sessionId]);

  if (sessionResult.fetching || sessionMissing) {
    return (
      <Container size="md" py="xl">
        <Group justify="center" mih={300}>
          <Loader color="purple" />
        </Group>
      </Container>
    );
  }

  if (!session || !session.service || !session.site) {
    return (
      <Container size="md" py="xl">
        <Alert color="orange" variant="light" icon={<IconAlertCircle size={16} />}>
          Your session is incomplete. <Anchor onClick={() => navigate('/booking')}>Start over</Anchor>.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="lg" py="lg">
      <SelectionSummary
        service={session.service}
        site={session.site}
        slot={session.slot ?? null}
        discountCents={Math.floor((session.service.priceCents * 5) / 100)}
        onChangeSelection={() => navigate('/booking')}
      />

      <BookingStepper active="date" />

      <SectionTitle>Date and Time</SectionTitle>

      <Group justify="center" mb="md">
        <Text size="sm" c="dimmed">
          <b>Estimated Visit Duration:</b>{' '}
          {session.service.durationMinutes >= 60
            ? `${Math.floor(session.service.durationMinutes / 60)}h${
                session.service.durationMinutes % 60
                  ? ` ${session.service.durationMinutes % 60}m`
                  : ''
              }`
            : `${session.service.durationMinutes}m`}
        </Text>
      </Group>

      <Group justify="center" mb="md">
        <Alert
          color="orange"
          variant="light"
          icon={<IconAlertCircle size={16} />}
          maw={480}
          w="100%"
          radius="md"
          styles={{ message: { textAlign: 'center' } }}
        >
          <Text size="sm">Assessments requiring fasting must be booked before 11:30am</Text>
        </Alert>
      </Group>

      <Group justify="center" gap="sm" mb="xs">
        <Button
          variant="subtle"
          color="gray"
          size="xs"
          onClick={() => setWeekStart(addDays(weekStart, -7))}
        >
          ←
        </Button>
        <Text fw={700} size="sm">
          {fmtRangeLabel(week)}
        </Text>
        <Button
          variant="subtle"
          color="gray"
          size="xs"
          onClick={() => setWeekStart(addDays(weekStart, 7))}
        >
          →
        </Button>
      </Group>

      <Group justify="center" gap={8} mb="lg">
        {week.map((d) => {
          const isSelected = startOfDay(d).getTime() === startOfDay(selectedDay).getTime();
          return (
            <Stack key={d.toISOString()} gap={4} align="center">
              <Text size="xs" c="dimmed">
                {d.toLocaleDateString(undefined, { weekday: 'short' })}
              </Text>
              <Button
                variant={isSelected ? 'filled' : 'default'}
                color={isSelected ? 'purple' : undefined}
                radius="xl"
                size="sm"
                w={40}
                h={40}
                p={0}
                onClick={() => setSelectedDay(d)}
              >
                {d.getDate()}
              </Button>
            </Stack>
          );
        })}
      </Group>

      <Group justify="center" mb="sm">
        <Text fw={700}>Available Times</Text>
      </Group>

      {slotsForSelectedDay.length === 0 ? (
        <Group justify="center">
          <Text c="dimmed" size="sm">
            No available times for this day.
          </Text>
        </Group>
      ) : (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm" data-tour="slot-grid">
          {slotsForSelectedDay.map((slot) => {
            const t = new Date(slot.startsAt);
            const localTime = t.toLocaleTimeString(undefined, {
              hour: 'numeric',
              minute: '2-digit',
            });
            const secondary = t.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              timeZone: 'America/Denver',
            });
            const selected = selectedSlotId === slot.id;
            return (
              <Button
                key={slot.id}
                variant={selected ? 'filled' : 'default'}
                color={selected ? 'purple' : undefined}
                radius="md"
                size="md"
                onClick={() => setSelectedSlotId(slot.id)}
                styles={{ label: { display: 'flex', gap: 6, alignItems: 'baseline' } }}
              >
                <Text component="span" fw={600} size="sm">
                  {localTime}
                </Text>
                <Text component="span" size="xs" c={selected ? 'white' : 'dimmed'}>
                  ({secondary} MST)
                </Text>
              </Button>
            );
          })}
        </SimpleGrid>
      )}

      <Paper mt="xl" p="md" radius="md" withBorder bg="white">
        <Group justify="space-between" align="center" wrap="wrap">
          <Text size="xs" c="dimmed" maw={480}>
            Booking for someone else? Pick a time here for Phase 1A (schedule now on their
            behalf). To let them pick their own time (Phase 1B), send it as a gift and let the
            recipient choose.
          </Text>
          <Group>
            <Button
              variant="light"
              color="purple"
              leftSection={<IconGift size={16} />}
              onClick={() => navigate('/booking/review')}
            >
              Send as gift · they pick time
            </Button>
            <Button
              color="purple"
              onClick={handleContinue}
              disabled={!selectedSlotId}
              rightSection={<IconArrowRight size={16} />}
            >
              Continue
            </Button>
          </Group>
        </Group>
      </Paper>

      <Box mt="lg" />
    </Container>
  );
}

