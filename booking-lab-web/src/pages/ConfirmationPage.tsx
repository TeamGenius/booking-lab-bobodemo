import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Container,
  CopyButton,
  Divider,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconCheck,
  IconCircleCheck,
  IconClipboardCopy,
  IconExternalLink,
  IconGift,
  IconMail,
  IconMailForward,
  IconRefresh,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'urql';
import { BOOKING_SESSION_QUERY } from '../client/gql';
import { InfoTooltip } from '../shared/InfoTooltip';
import { RequirementRef } from '../shared/RequirementRef';
import { SectionTitle } from '../shared/SectionTitle';
import { SelectionSummary } from '../shared/SelectionSummary';
import { useSessionContext } from '../shared/SessionContext';

type Session = {
  id: string;
  status: string;
  confirmationCode: string | null;
  claimToken: string | null;
  selections: {
    isGiftBooking: boolean;
    mode: 'SELF' | 'GIFT_SCHEDULE_NOW' | 'GIFT_SCHEDULE_LATER';
    recipientName: string | null;
    recipientEmail: string | null;
    purchaserName: string | null;
  };
  site: { name: string; addressLine: string; city: string } | null;
  service: { name: string; priceCents: number; durationMinutes: number } | null;
  slot: { startsAt: string; employeeName: string } | null;
  emailPreview: {
    to: string;
    toName: string;
    fromName: string;
    subject: string;
    body: string;
    claimUrl: string;
    sentAt: string;
  } | null;
};

export function ConfirmationPage() {
  const navigate = useNavigate();
  const { sessionId, setSessionId } = useSessionContext();

  const [sessionResult] = useQuery<{ bookingSession: Session | null }>({
    query: BOOKING_SESSION_QUERY,
    variables: { id: sessionId ?? '' },
    pause: !sessionId,
    requestPolicy: 'network-only',
  });
  const session = sessionResult.data?.bookingSession ?? null;

  if (sessionResult.fetching || !session || !session.service || !session.site) {
    return (
      <Container size="md" py="xl">
        <Group justify="center" mih={300}>
          <Loader color="purple" />
        </Group>
      </Container>
    );
  }

  const isGift = session.selections.isGiftBooking;
  const mode = session.selections.mode;
  const isScheduleLater = mode === 'GIFT_SCHEDULE_LATER';
  const isScheduleNow = mode === 'GIFT_SCHEDULE_NOW';

  function handleStartOver() {
    setSessionId(null);
    ['booking-lab.selection.siteId', 'booking-lab.selection.serviceId'].forEach((k) =>
      window.localStorage.removeItem(k),
    );
    navigate('/');
  }

  return (
    <Container size="lg" py="lg">
      <SelectionSummary
        service={session.service}
        site={session.site}
        slot={isScheduleLater ? null : session.slot}
        discountCents={isGift ? 0 : 5100}
        hideSlotRow={isScheduleLater}
      />

      <SectionTitle>
        {isScheduleLater
          ? 'Gift sent · Recipient will schedule'
          : isScheduleNow
            ? 'Booked for your Recipient'
            : 'Booking confirmed'}
      </SectionTitle>

      <Group align="flex-start" gap="lg" wrap="wrap">
        <Stack style={{ flex: 1, minWidth: 340 }} gap="md">
          <Card withBorder radius="md" p="lg">
            <Group gap="sm" mb="md">
              <ThemeIcon color={isGift ? 'purple' : 'orange'} radius="xl" size="xl">
                <IconCheck size={22} stroke={3} />
              </ThemeIcon>
              <Box>
                <Title order={3}>
                  {isScheduleLater
                    ? 'Your gift is on its way!'
                    : isScheduleNow
                      ? 'Their appointment is booked.'
                      : "You're booked."}
                </Title>
                <Text size="sm" c="dimmed">
                  {isScheduleLater
                    ? `We've emailed ${session.selections.recipientName ?? 'the Recipient'} a link to sign in and pick a time.`
                    : isScheduleNow
                      ? `${session.selections.recipientName ?? 'The Recipient'} will get an email with the appointment details.`
                      : `We've emailed a confirmation to ${session.selections.purchaserName ?? 'you'}.`}
                </Text>
              </Box>
            </Group>
            {session.confirmationCode && (
              <Group justify="space-between" mb="sm">
                <Text size="sm" c="dimmed">
                  Confirmation code
                </Text>
                <Badge variant="light" color="gray" size="lg">
                  {session.confirmationCode}
                </Badge>
              </Group>
            )}
            {isScheduleLater ? (
              <Alert
                color="purple"
                variant="light"
                icon={<IconMailForward size={16} />}
              >
                They sign in, see the booking (no pricing shown), and pick their own time.
                You don't need to do anything else.
              </Alert>
            ) : isScheduleNow ? (
              <Alert
                color="purple"
                variant="light"
                icon={<IconMailForward size={16} />}
              >
                Phase 1A: you booked the slot on their behalf. Their identity is stored on
                the Booking; you remain the Payment Owner <RequirementRef code="FR-9" />.
              </Alert>
            ) : (
              <Alert color="orange" variant="light" icon={<IconCircleCheck size={16} />}>
                See you soon at{' '}
                <b>
                  {session.slot &&
                    new Date(session.slot.startsAt).toLocaleString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                </b>
                .
              </Alert>
            )}
          </Card>

          <Paper withBorder radius="md" p="md" bg="white">
            <Group>
              <Button
                variant="light"
                color="gray"
                leftSection={<IconRefresh size={16} />}
                onClick={handleStartOver}
              >
                Start another booking
              </Button>
            </Group>
          </Paper>
        </Stack>

        {isScheduleLater && session.emailPreview && (
          <Stack style={{ flex: 1, minWidth: 360 }} gap="md">
            <Group gap={6} align="center">
              <IconMail size={18} color="var(--mantine-color-purple-8)" />
              <Text fw={700}>Email preview</Text>
              <InfoTooltip label="Purchaser confirmation + shareable claim link (LP-2175, LP-2176). In production the link is delivered by SendGrid; Booking Lab renders the exact message inline so you can see what the Recipient receives. Standard appointment surveys (FR-8) are routed to the Recipient's visit.userId, not the Purchaser. PRD §6 FR-8 · Spec §7.2 LP-2175/2176." />
            </Group>
            <Card withBorder radius="md" p={0} bg="white" style={{ overflow: 'hidden' }}>
              <Box
                p="md"
                style={{
                  background: 'var(--mantine-color-gray-0)',
                  borderBottom: '1px solid var(--mantine-color-gray-2)',
                }}
              >
                <Group justify="space-between" mb={4}>
                  <Text size="xs" c="dimmed">
                    To
                  </Text>
                  <Text size="xs" fw={500}>
                    {session.emailPreview.toName} &lt;{session.emailPreview.to}&gt;
                  </Text>
                </Group>
                <Group justify="space-between" mb={4}>
                  <Text size="xs" c="dimmed">
                    From
                  </Text>
                  <Text size="xs" fw={500}>
                    {session.emailPreview.fromName} via Human Powered Health
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">
                    Subject
                  </Text>
                  <Text size="xs" fw={500}>
                    {session.emailPreview.subject}
                  </Text>
                </Group>
              </Box>
              <ScrollArea h={220}>
                <Box p="md">
                  <Text
                    size="sm"
                    style={{ whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, monospace' }}
                  >
                    {session.emailPreview.body}
                  </Text>
                </Box>
              </ScrollArea>
              <Divider />
              <Box p="md">
                <Group gap="xs" mb="xs">
                  <IconGift size={14} color="var(--mantine-color-purple-8)" />
                  <Text size="xs" c="dimmed">
                    Claim URL = BookingId GUID · Recipient must be signed in
                  </Text>
                </Group>
                <Group gap="xs" wrap="nowrap">
                  <Anchor
                    href={session.emailPreview.claimUrl}
                    target="_blank"
                    size="sm"
                    style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {session.emailPreview.claimUrl}
                  </Anchor>
                  <CopyButton value={session.emailPreview.claimUrl}>
                    {({ copied, copy }) => (
                      <Button
                        size="xs"
                        variant="light"
                        color={copied ? 'green' : 'gray'}
                        onClick={copy}
                        leftSection={
                          copied ? <IconCircleCheck size={14} /> : <IconClipboardCopy size={14} />
                        }
                      >
                        {copied ? 'Copied' : 'Copy'}
                      </Button>
                    )}
                  </CopyButton>
                </Group>
                <Button
                  fullWidth
                  mt="sm"
                  color="purple"
                  variant="filled"
                  rightSection={<IconExternalLink size={14} />}
                  component="a"
                  href={session.emailPreview.claimUrl}
                  target="_blank"
                >
                  Open recipient view
                </Button>
              </Box>
            </Card>
          </Stack>
        )}
      </Group>
    </Container>
  );
}
