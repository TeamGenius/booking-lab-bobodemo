import {
  Alert,
  Anchor,
  Box,
  Button,
  Container,
  Group,
  Loader,
  Paper,
  Text,
} from "@mantine/core";
import { IconAlertCircle, IconArrowRight, IconGift } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "urql";
import {
  AVAILABLE_SLOTS_QUERY,
  BOOKING_SESSION_QUERY,
  MAKE_SELECTIONS_MUTATION,
} from "../client/gql";
import { useBookingActions } from "../shared/BookingActionsContext";
import { BookingStepper } from "../shared/BookingStepper";
import { SelectionSummary } from "../shared/SelectionSummary";
import { useSessionContext } from "../shared/SessionContext";
import { TimeSelect } from "../shared/TimeSelect";

type Slot = {
  id: string;
  serviceId: string;
  startsAt: string;
  employeeName: string;
};

type Session = {
  id: string;
  selections: {
    siteId: string | null;
    serviceId: string | null;
    slotId: string | null;
  };
  site: { name: string; addressLine: string; city: string } | null;
  service: { name: string; priceCents: number; durationMinutes: number } | null;
  slot: Slot | null;
};

export function SchedulePage() {
  const navigate = useNavigate();
  const { sessionId, setSessionId } = useSessionContext();
  const { setAction } = useBookingActions();

  const [sessionResult] = useQuery<{ bookingSession: Session | null }>({
    query: BOOKING_SESSION_QUERY,
    variables: { id: sessionId ?? "" },
    pause: !sessionId,
  });
  const session = sessionResult.data?.bookingSession ?? null;
  const serviceId = session?.selections.serviceId ?? null;

  const [slotsResult] = useQuery<{ availableSlots: Slot[] }>({
    query: AVAILABLE_SLOTS_QUERY,
    variables: { serviceId: serviceId ?? "" },
    pause: !serviceId,
  });

  const [, makeSelections] = useMutation(MAKE_SELECTIONS_MUTATION);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(
    session?.selections.slotId ?? null,
  );

  async function handleContinue() {
    if (!sessionId || !selectedSlotId) return;
    await makeSelections({ sessionId, input: { slotId: selectedSlotId } });
    navigate("/booking/review");
  }

  async function handleGiftScheduleLater() {
    if (!sessionId) return;
    await makeSelections({
      sessionId,
      input: { mode: "GIFT_SCHEDULE_LATER", isGiftBooking: true, slotId: null },
    });
    navigate("/booking/review");
  }
  // Recover from stale sessionId when the server-side session is gone (e.g. tsx restart).
  const sessionMissing =
    !sessionResult.fetching && !sessionResult.error && sessionId && !session;
  useEffect(() => {
    if (sessionMissing) {
      setSessionId(null);
      navigate("/booking", { replace: true });
    }
  }, [sessionMissing, setSessionId, navigate]);

  // Register the sidebar's primary action.
  useEffect(() => {
    setAction({
      label: "Continue",
      onClick: handleContinue,
      disabled: !selectedSlotId,
      helper: selectedSlotId
        ? "Locks the slot and moves to Review."
        : "Pick a time to continue — or click “Skip” to let the recipient pick.",
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
        <Alert
          color="orange"
          variant="light"
          icon={<IconAlertCircle size={16} />}
        >
          Your session is incomplete.{" "}
          <Anchor onClick={() => navigate("/booking")}>Start over</Anchor>.
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
        onChangeSelection={() => navigate("/booking")}
      />

      <BookingStepper active="date" />

      <TimeSelect
        slots={slotsResult.data?.availableSlots ?? []}
        loading={slotsResult.fetching}
        selectedSlotId={selectedSlotId}
        onSelect={setSelectedSlotId}
        durationMinutes={session.service.durationMinutes}
        fastingCutoffTime="11:30am"
      />

      <Paper mt="xl" p="md" radius="md" withBorder bg="white">
        <Group justify="space-between" align="center" wrap="wrap">
          <Text size="xs" c="dimmed" maw={480}>
            Booking for someone else? Pick a time here for Phase 1A (schedule
            now on their behalf). To let them pick their own time (Phase 1B),
            send it as a gift and let the recipient choose.
          </Text>
          <Group>
            <Button
              variant="light"
              color="purple"
              leftSection={<IconGift size={16} />}
              onClick={() => void handleGiftScheduleLater()}
            >
              Send as gift · they pick time
            </Button>
            <Button
              color="purple"
              data-tour="primary-action"
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
