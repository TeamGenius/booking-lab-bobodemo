import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Paper,
  Radio,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconArrowRight,
  IconGift,
  IconInfoCircle,
  IconLock,
  IconUserCircle,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from 'urql';
import { CLAIM_GIFT_MUTATION, GIFT_PREVIEW_QUERY } from '../client/gql';
import { FlowBadge } from '../shared/FlowBadge';
import { InfoTooltip } from '../shared/InfoTooltip';
import { RequirementRef } from '../shared/RequirementRef';

type Preview = {
  id: string;
  status: string;
  selections: {
    mode: 'SELF' | 'GIFT_SCHEDULE_NOW' | 'GIFT_SCHEDULE_LATER';
    purchaserName: string | null;
    recipientName: string | null;
    recipientEmail: string | null;
  };
  site: { name: string; city: string } | null;
  service: { name: string; description: string; durationMinutes: number } | null;
};

type Identity = { id: string; name: string; email: string; isActual?: boolean };

// Demo-only stand-ins for other users the recipient could switch between to
// exercise the self-gift guard and non-recipient guard.
const MOCK_IDENTITIES: Identity[] = [
  { id: 'user_alex', name: 'Alex Rivera', email: 'alex@example.com' },
  { id: 'user_taylor', name: 'Taylor Kim', email: 'taylor@example.com' },
  { id: 'user_jamie', name: 'Jamie Chen', email: 'jamie.chen@example.com' },
];

// Purchaser identity from ReviewPage — used to detect self-gift on the client.
const PURCHASER_MOCK_EMAIL = 'jamie.chen@example.com';

export function ClaimLandingPage() {
  const navigate = useNavigate();
  const { token = '' } = useParams();

  const [previewResult] = useQuery<{ getGiftBookingPreview: Preview | null }>({
    query: GIFT_PREVIEW_QUERY,
    variables: { bookingId: token },
    pause: !token,
  });
  const claim = previewResult.data?.getGiftBookingPreview ?? null;

  const [, claimGift] = useMutation(CLAIM_GIFT_MUTATION);

  // Build the identity list: the actual gift recipient (if the purchaser
  // provided one on Review) shows up first and is pre-selected. Extra mock
  // users are appended so you can still demo the guardrails (self-gift block,
  // wrong-recipient block).
  const identities = useMemo<Identity[]>(() => {
    const list: Identity[] = [];
    const actualEmail = claim?.selections.recipientEmail?.trim();
    const actualName = claim?.selections.recipientName?.trim();
    if (actualEmail) {
      list.push({
        id: 'actual_recipient',
        name: actualName || actualEmail,
        email: actualEmail,
        isActual: true,
      });
    }
    for (const m of MOCK_IDENTITIES) {
      if (actualEmail && m.email.toLowerCase() === actualEmail.toLowerCase()) continue;
      list.push(m);
    }
    return list;
  }, [claim?.selections.recipientEmail, claim?.selections.recipientName]);

  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  useEffect(() => {
    if (!selectedRecipientId && identities.length > 0) {
      setSelectedRecipientId(identities[0]!.id);
    }
  }, [identities, selectedRecipientId]);

  const selectedRecipient = useMemo(
    () => identities.find((r) => r.id === selectedRecipientId) ?? identities[0],
    [identities, selectedRecipientId],
  );
  const isSelfGift =
    !!selectedRecipient &&
    selectedRecipient.email.toLowerCase() === PURCHASER_MOCK_EMAIL.toLowerCase();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignInAndClaim() {
    if (!token || !selectedRecipient || isSelfGift) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await claimGift({
        input: { bookingId: token, recipientEmail: selectedRecipient.email },
      });
      if (res.error) throw res.error;
      navigate(`/gift/${token}/schedule`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (previewResult.fetching) {
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
          This booking could not be loaded. Ask the Purchaser to resend the link.
        </Alert>
      </Container>
    );
  }

  const alreadyClaimed = claim.status === 'CLAIMED_AWAITING_SCHEDULE';

  return (
    <Container size="md" py="lg">
      <Paper
        radius="md"
        p="lg"
        mb="lg"
        style={{
          background:
            'linear-gradient(135deg, var(--mantine-color-purple-9), var(--mantine-color-orange-6))',
          color: 'white',
        }}
      >
        <Group gap="md">
          <IconGift size={44} stroke={1.5} />
          <Stack gap={0}>
            <Text size="sm" opacity={0.9}>
              Booking Lab
            </Text>
            <Title order={2} c="white">
              You have a Human Powered Health gift!
            </Title>
            <Text opacity={0.9}>
              <b>{claim.selections.purchaserName ?? 'A friend'}</b> gifted you{' '}
              <b>{claim.service?.name}</b> at <b>{claim.site?.name}</b>.
            </Text>
          </Stack>
        </Group>
      </Paper>

      <Group justify="space-between" mb="md">
        <Title order={3}>Sign in to claim</Title>
        <FlowBadge mode="RECIPIENT" />
      </Group>

      <Group align="flex-start" gap="lg" wrap="wrap">
        <Card withBorder radius="md" p="lg" style={{ flex: 2, minWidth: 340 }}>
          <Stack gap="md">
            <Group gap={6}>
              <IconUserCircle size={18} />
              <Title order={4}>Choose your identity (mock JWT)</Title>
              <InfoTooltip label="claimGiftBooking is [Authorize] on the User scheme — the Recipient's userId is set from their JWT, never from a form. Two guards fire server-side: (1) reject when booking.userId != null (already claimed) and (2) reject when caller matches purchaser (self-gift loophole — Spec §9, §10 Resolved #1/#7). The claim URL is the raw BookingId GUID; security relies on GUID entropy + auth + per-user rate limit on claimGiftBooking. Spec §7.4, §9." />
            </Group>
            <Radio.Group
              value={selectedRecipientId}
              onChange={setSelectedRecipientId}
            >
              <Stack gap="xs">
                {identities.map((r) => (
                  <Radio
                    key={r.id}
                    value={r.id}
                    color="purple"
                    label={
                      <Group gap={8}>
                        <Text fw={600}>{r.name}</Text>
                        <Text size="xs" c="dimmed">
                          {r.email}
                        </Text>
                        {r.isActual && (
                          <Badge color="green" variant="light" size="xs">
                            = Actual recipient
                          </Badge>
                        )}
                        {r.email.toLowerCase() === PURCHASER_MOCK_EMAIL.toLowerCase() && (
                          <Badge color="red" variant="light" size="xs">
                            = Purchaser (self-gift)
                          </Badge>
                        )}
                      </Group>
                    }
                  />
                ))}
              </Stack>
            </Radio.Group>

            {isSelfGift && (
              <Alert color="red" variant="light" icon={<IconInfoCircle size={16} />}>
                Self-gift is blocked. The Purchaser cannot claim their own gift booking
                (spec §10, resolved decision).
              </Alert>
            )}

            <Group gap={6}>
              <IconLock size={14} color="var(--mantine-color-gray-6)" />
              <Text size="xs" c="dimmed">
                Claim URL = BookingId GUID (<code>{claim.id.slice(0, 8)}…</code>). No
                one-time token, no expiration — security comes from auth + GUID
                entropy.
              </Text>
            </Group>

            {error && (
              <Alert color="red" variant="light">
                {error}
              </Alert>
            )}
            <Group justify="flex-end">
              <Button
                color="purple"
                onClick={handleSignInAndClaim}
                loading={submitting}
                disabled={isSelfGift}
                rightSection={<IconArrowRight size={16} />}
              >
                {alreadyClaimed ? 'Continue to schedule' : 'Sign in & claim'}
              </Button>
            </Group>
          </Stack>
        </Card>

        <Card withBorder radius="md" p="lg" style={{ flex: 1, minWidth: 260 }} bg="purple.0">
          <Stack gap="sm">
            <Group gap="xs">
              <IconGift size={20} color="var(--mantine-color-purple-8)" />
              <Text fw={700}>Your gift</Text>
            </Group>
            <Text fw={600}>{claim.service?.name}</Text>
            <Text size="sm" c="dimmed">
              {claim.service?.description}
            </Text>
            <Group gap={5}>
              <Badge color="purple" variant="light" w="max-content" leftSection={<IconLock size={12} />}>
                Included · pricing hidden
              </Badge>
              <RequirementRef code="FR-7" />
            </Group>
            <Box>
              <Text size="xs" c="dimmed">
                Location
              </Text>
              <Text size="sm" fw={500}>
                {claim.site?.name}
              </Text>
              <Text size="sm" c="dimmed">
                {claim.site?.city}
              </Text>
            </Box>
          </Stack>
        </Card>
      </Group>
    </Container>
  );
}
