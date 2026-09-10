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
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  IconArrowRight,
  IconGift,
  IconInfoCircle,
  IconLock,
  IconUserCircle,
} from '@tabler/icons-react';
import { useState } from 'react';
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

  const [recipientNameOverride, setRecipientNameOverride] = useState<string | null>(null);
  const [recipientEmailOverride, setRecipientEmailOverride] = useState<string | null>(null);
  const recipientName =
    recipientNameOverride ?? claim?.selections.recipientName?.trim() ?? '';
  const recipientEmail =
    recipientEmailOverride ?? claim?.selections.recipientEmail?.trim() ?? '';

  const trimmedName = recipientName.trim();
  const trimmedEmail = recipientEmail.trim();
  const hasValidEmail = /^\S+@\S+\.\S+$/.test(trimmedEmail);
  const formIsValid = trimmedName.length > 0 && hasValidEmail;
  const isSelfGift =
    trimmedEmail.toLowerCase() === PURCHASER_MOCK_EMAIL.toLowerCase();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignInAndClaim() {
    if (!token || !formIsValid || isSelfGift) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await claimGift({
        input: {
          bookingId: token,
          recipientName: trimmedName,
          recipientEmail: trimmedEmail,
        },
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
           This booking could not be loaded. Ask the Purchaser to generate a new link;
           older GUID-only demo links do not contain portable booking data.
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
              <Title order={4}>Your sign-in details</Title>
              <Badge color="green" variant="light" size="xs">
                Demo sign-in
              </Badge>
              <InfoTooltip label="This editable demo form represents the recipient profile returned after authentication. In production, claimGiftBooking is authorized with the User scheme and the recipient userId comes from their JWT, not these fields. The claim also blocks the purchaser from claiming their own gift." />
            </Group>
            <Text size="sm" c="dimmed">
                Demo sign-in details are prefilled. You can correct them before continuing.
            </Text>
            <TextInput
              label="Full name"
              placeholder="Recipient name"
              value={recipientName}
              onChange={(event) => setRecipientNameOverride(event.currentTarget.value)}
              error={recipientName.length > 0 && !trimmedName ? 'Enter your name' : undefined}
              autoComplete="name"
              required
            />
            <TextInput
              label="Email address"
              placeholder="name@example.com"
              type="email"
              value={recipientEmail}
              onChange={(event) => setRecipientEmailOverride(event.currentTarget.value)}
              error={recipientEmail.length > 0 && !hasValidEmail ? 'Enter a valid email address' : undefined}
              autoComplete="email"
              required
            />

            {isSelfGift && (
              <Alert color="red" variant="light" icon={<IconInfoCircle size={16} />}>
                Self-gift is blocked. The Purchaser cannot claim their own gift booking
                (spec §10, resolved decision).
              </Alert>
            )}

            <Group gap={6}>
              <IconLock size={14} color="var(--mantine-color-gray-6)" />
              <Text size="xs" c="dimmed">
                 Production claim key = BookingId GUID (<code>{claim.id.slice(0, 8)}…</code>).
                 This static sandbox also carries non-PII site and service context in the
                 link because it has no shared database.
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
                disabled={!formIsValid || isSelfGift}
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
