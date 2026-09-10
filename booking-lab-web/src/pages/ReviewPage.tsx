import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Collapse,
  Container,
  Divider,
  Group,
  Loader,
  Paper,
  Radio,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconArrowRight,
  IconChevronDown,
  IconChevronUp,
  IconCreditCard,
  IconGift,
  IconLock,
  IconPlus,
  IconUser,
  IconUserCheck,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from 'urql';
import {
  BOOKING_SESSION_QUERY,
  FINALIZE_GIFT_BOOKING_MUTATION,
  MAKE_SELECTIONS_MUTATION,
  PAY_AND_FINALIZE_MUTATION,
} from '../client/gql';
import { BookingStepper } from '../shared/BookingStepper';
import { InfoTooltip } from '../shared/InfoTooltip';
import { SelectionSummary } from '../shared/SelectionSummary';
import { useSessionContext } from '../shared/SessionContext';

type Mode = 'SELF' | 'GIFT_SCHEDULE_NOW' | 'GIFT_SCHEDULE_LATER';

type Session = {
  id: string;
  selections: {
    siteId: string | null;
    serviceId: string | null;
    slotId: string | null;
    isGiftBooking: boolean;
    mode: Mode;
    purchaserName: string | null;
    purchaserEmail: string | null;
    recipientName: string | null;
    recipientEmail: string | null;
  };
  site: { name: string; addressLine: string; city: string } | null;
  service: { name: string; priceCents: number; durationMinutes: number } | null;
  slot: { startsAt: string; employeeName: string } | null;
};

// Mocked purchaser identity to represent the JWT-authenticated caller per the spec.
const PURCHASER_MOCK = {
  name: 'Jamie Chen',
  email: 'jamie.chen@example.com',
};

export function ReviewPage() {
  const navigate = useNavigate();
  const { sessionId } = useSessionContext();

  const [sessionResult, refetchSession] = useQuery<{ bookingSession: Session | null }>({
    query: BOOKING_SESSION_QUERY,
    variables: { id: sessionId ?? '' },
    pause: !sessionId,
  });
  const session = sessionResult.data?.bookingSession ?? null;
  const service = session?.service ?? null;
  const site = session?.site ?? null;

  const [, payAndFinalize] = useMutation(PAY_AND_FINALIZE_MUTATION);
  const [, finalizeGift] = useMutation(FINALIZE_GIFT_BOOKING_MUTATION);
  const [, makeSelections] = useMutation(MAKE_SELECTIONS_MUTATION);

  // PRD Step 3: "Who is this for?" — Me vs Someone else.
  const [forWho, setForWho] = useState<'ME' | 'OTHER'>(
    session?.selections.mode === 'SELF' ? 'ME' : session?.selections.mode ? 'OTHER' : 'ME',
  );
  // If Other: which sub-scenario?
  const [otherMode, setOtherMode] = useState<'GIFT_SCHEDULE_NOW' | 'GIFT_SCHEDULE_LATER'>(
    session?.selections.mode === 'GIFT_SCHEDULE_LATER'
      ? 'GIFT_SCHEDULE_LATER'
      : 'GIFT_SCHEDULE_NOW',
  );
  const mode: Mode = forWho === 'ME' ? 'SELF' : otherMode;

  const [recipientName, setRecipientName] = useState(session?.selections.recipientName ?? '');
  const [recipientEmail, setRecipientEmail] = useState(session?.selections.recipientEmail ?? '');
  const [cardNonce, setCardNonce] = useState('tok_visa_4242');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Production-style payment UI state (mocked — no real card fields).
  const [addCardOpen, setAddCardOpen] = useState(true);
  const [giftCardOpen, setGiftCardOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [heardAbout, setHeardAbout] = useState<string | null>('Yelp / Review Website');
  const [heardAboutMore, setHeardAboutMore] = useState<string | null>('Yelp');

  // Persist mode to server whenever it changes so all screens stay in sync.
  // Phase 1B has no slot — clear any leftover slot from a prior Phase 1A visit.
  useEffect(() => {
    if (!sessionId || !session) return;
    if (session.selections.mode !== mode) {
      const patch: Record<string, unknown> = { mode, isGiftBooking: mode !== 'SELF' };
      if (mode === 'GIFT_SCHEDULE_LATER') patch.slotId = null;
      void makeSelections({ sessionId, input: patch });
    } else if (mode === 'GIFT_SCHEDULE_LATER' && session.selections.slotId) {
      void makeSelections({ sessionId, input: { slotId: null } });
    }
  }, [mode, sessionId, session, makeSelections]);

  const discountCents = mode === 'SELF' ? 5100 : 0;
  const total = useMemo(
    () => (service ? Math.max(service.priceCents - discountCents, 0) : 0),
    [service, discountCents],
  );

  const needsSlot = mode === 'SELF' || mode === 'GIFT_SCHEDULE_NOW';
  const missingSlot = needsSlot && !session?.selections.slotId;

  const isGift = mode !== 'SELF';
  const selfGift =
    isGift &&
    recipientEmail.trim().toLowerCase() === PURCHASER_MOCK.email.toLowerCase();

  const canSubmit = useMemo(() => {
    if (!sessionId || !cardNonce) return false;
    if (missingSlot) return false;
    if (isGift) {
      if (selfGift) return false;
      return !!recipientName && !!recipientEmail;
    }
    return true;
  }, [sessionId, cardNonce, missingSlot, isGift, recipientName, recipientEmail, selfGift]);

  async function handlePay() {
    if (!sessionId) return;
    setSubmitting(true);
    setError(null);
    try {
      const baseInput = {
        sessionId,
        cardNonce,
        purchaserName: PURCHASER_MOCK.name,
        purchaserEmail: PURCHASER_MOCK.email,
      };
      if (mode === 'GIFT_SCHEDULE_LATER') {
        const res = await finalizeGift({
          input: { ...baseInput, recipientName, recipientEmail },
        });
        if (res.error) throw res.error;
      } else {
        const res = await payAndFinalize({
          input: {
            ...baseInput,
            recipientName: isGift ? recipientName : null,
            recipientEmail: isGift ? recipientEmail : null,
          },
        });
        if (res.error) throw res.error;
      }
      await refetchSession({ requestPolicy: 'network-only' });
      navigate('/booking/confirmation');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (sessionResult.fetching || !service || !site) {
    return (
      <Container size="md" py="xl">
        <Group justify="center" mih={300}>
          <Loader color="purple" />
        </Group>
      </Container>
    );
  }

  const slotIso = session?.slot?.startsAt ?? null;
  // Label follows the *mode* first — a leftover slot from a prior Phase 1A choice
  // must not surface a "Schedule <date>" label when we're now in Phase 1B.
  const scheduleLabel =
    mode === 'GIFT_SCHEDULE_LATER'
      ? 'Send Gift · recipient picks time'
      : slotIso
        ? `Schedule ${new Date(slotIso).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })} at ${new Date(slotIso).toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
          })}`
        : mode === 'GIFT_SCHEDULE_NOW'
          ? 'Pay & book for them'
          : 'Schedule';

  const readyToSubmit = canSubmit && termsAccepted;

  const disabledReason = !sessionId
    ? 'Session not ready.'
    : missingSlot
      ? 'Pick a time slot to continue.'
      : isGift && (!recipientName || !recipientEmail)
        ? 'Enter the recipient’s name and email.'
        : selfGift
          ? 'Recipient email must differ from Purchaser (self-gift blocked).'
          : !cardNonce
            ? 'Enter a card nonce.'
            : !termsAccepted
              ? 'Agree to the terms & conditions to continue.'
              : null;

  return (
    <Container size="md" py="lg">
      <SelectionSummary
        service={service}
        site={site}
        slot={needsSlot ? session?.slot ?? null : null}
        discountCents={discountCents}
        onChangeSelection={() => navigate('/booking/schedule')}
        hideSlotRow={!needsSlot}
      />

      <BookingStepper active="pay" />

      {/* Signed-in purchaser (mock JWT) — kept as a compact lab affordance */}
      <Card withBorder radius="md" p="sm" bg="gray.0" mb="md">
        <Group gap="sm" align="center" wrap="nowrap">
          <ThemeIcon color="orange" variant="filled" radius="xl" size="md">
            <IconUserCheck size={14} />
          </ThemeIcon>
          <Box style={{ flex: 1 }}>
            <Text size="sm" fw={600}>
              Signed in as {PURCHASER_MOCK.name}
            </Text>
            <Text size="xs" c="dimmed">
              {PURCHASER_MOCK.email} · identity comes from your JWT in production
            </Text>
          </Box>
          <InfoTooltip label="Both finalizeGiftBooking (Phase 1B) and finalizeBooking with isGiftBooking=true (Phase 1A) require the Purchaser to be signed in. The Purchaser's userId is taken from the JWT — never from a form field — so payment attribution can't be spoofed. Business Rule 3 (attributable & reportable payment). Spec §7.4, §10 Resolved Decision #1." />
        </Group>
      </Card>

      {/* PRD Step 3: Who is this for? */}
      <Card withBorder radius="md" p="lg" mb="md">
        <Group gap={6} mb="xs">
          <Title order={5}>Who is this for?</Title>
          <InfoTooltip label="PRD Step 3 — resolves the booking mode. 'For me' means Athlete = Purchaser = Booking Owner (self-serve). 'For someone else' splits those roles: Purchaser pays, Recipient attends. MVP's only BOBO variant is Gift Booking. Parent/guardian and corporate-sponsored booking are explicit non-goals for this phase. PRD §2 (Goals 1–3), §2 Non-Goals, §7 Business Rules 1–2." />
        </Group>
        <Radio.Group value={forWho} onChange={(v) => setForWho(v as 'ME' | 'OTHER')}>
          <Stack gap="xs" mt="xs">
            <Radio
              value="ME"
              color="purple"
              label={
                <Group gap={6}>
                  <IconUser size={14} />
                  <Text fw={600}>For me</Text>
                  <Text size="xs" c="dimmed">
                    Purchaser = Recipient = Athlete
                  </Text>
                </Group>
              }
            />
            <Radio
              value="OTHER"
              color="purple"
              label={
                <Group gap={6}>
                  <IconGift size={14} />
                  <Text fw={600}>For someone else</Text>
                  <Badge color="purple" variant="light" size="xs">
                    BOBO · Gift Booking
                  </Badge>
                </Group>
              }
            />
          </Stack>
        </Radio.Group>

        {forWho === 'OTHER' && (
          <Box mt="md">
            <Divider mb="md" label="How should they book their appointment?" labelPosition="left" />
            <Radio.Group
              value={otherMode}
              onChange={(v) => setOtherMode(v as 'GIFT_SCHEDULE_NOW' | 'GIFT_SCHEDULE_LATER')}
            >
              <Stack gap="xs">
                <Radio
                  value="GIFT_SCHEDULE_NOW"
                  color="purple"
                  label={
                    <Box>
                      <Text fw={600} size="sm">
                        Also schedule for them now
                      </Text>
                      <Text size="xs" c="dimmed">
                        Phase 1A — you pick the appointment. Uses{' '}
                        <code>finalizeBooking(isGiftBooking: true)</code>.
                      </Text>
                    </Box>
                  }
                />
                <Radio
                  value="GIFT_SCHEDULE_LATER"
                  color="purple"
                  label={
                    <Box>
                      <Text fw={600} size="sm">
                        Let them pick their own time
                      </Text>
                      <Text size="xs" c="dimmed">
                        Phase 1B — no slot chosen now. Uses <code>finalizeGiftBooking</code>.
                      </Text>
                    </Box>
                  }
                />
              </Stack>
            </Radio.Group>

            <Stack gap="sm" mt="md">
              <Group grow>
                <TextInput
                  label="Recipient name"
                  placeholder="Alex Rivera"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.currentTarget.value)}
                />
                <TextInput
                  label="Recipient email"
                  placeholder="alex@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.currentTarget.value)}
                  error={
                    selfGift
                      ? 'Self-gift blocked — Recipient email must differ from Purchaser'
                      : null
                  }
                />
              </Group>
              <Text size="xs" c="dimmed">
                Recipient must sign in with this email to view or schedule the booking. The
                BookingId GUID is the claim URL — no one-time token.
              </Text>
            </Stack>
          </Box>
        )}

        {missingSlot && (
          <Alert color="orange" variant="light" mt="md">
            A time slot is required for this mode.{' '}
            <Anchor onClick={() => navigate('/booking/schedule')}>Pick one</Anchor>.
          </Alert>
        )}
      </Card>

      {/* Payment Method — production-style */}
      <Stack align="center" gap={2} mt="xl" mb="md">
        <Title order={4} c="dark.6">
          Payment Method
        </Title>
        <Text size="xs" c="dimmed">
          You will only be charged after the visit
        </Text>
      </Stack>

      <Card withBorder radius="md" p="lg" mb="md">
        <Text fw={600} mb={4}>
          Your payment methods
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          No saved cards.
        </Text>
        <Divider mb="md" />
        <Group
          justify="space-between"
          style={{ cursor: 'pointer' }}
          onClick={() => setAddCardOpen((o) => !o)}
        >
          <Group gap="sm">
            <ThemeIcon color="teal" variant="light" radius="sm" size="md">
              <IconPlus size={14} />
            </ThemeIcon>
            <Text fw={500}>Add a new card</Text>
          </Group>
          {addCardOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
        </Group>
        <Collapse in={addCardOpen}>
          <Group grow mt="md">
            <TextInput
              placeholder="Card number"
              leftSection={<IconCreditCard size={16} />}
              value={cardNonce}
              onChange={(e) => setCardNonce(e.currentTarget.value)}
            />
            <TextInput placeholder="MM/YY" />
            <TextInput placeholder="CVV" />
          </Group>
          <Button fullWidth color="purple" mt="md" size="md">
            Add Card
          </Button>
          <Text size="xs" c="dimmed" mt={6} ta="center">
            Sandbox: <code>tok_visa_4242</code> succeeds · <code>tok_visa_0002</code> declines
          </Text>
        </Collapse>
      </Card>

      <Card withBorder radius="md" p="lg" mb="md">
        <Group
          justify="space-between"
          style={{ cursor: 'pointer' }}
          onClick={() => setGiftCardOpen((o) => !o)}
        >
          <Group gap="sm">
            <ThemeIcon color="pink" variant="light" radius="sm" size="md">
              <IconGift size={14} />
            </ThemeIcon>
            <Box>
              <Text fw={600}>Add Gift Card</Text>
              <Text size="xs" c="dimmed">
                Use a gift card to apply it to this booking
              </Text>
            </Box>
          </Group>
          {giftCardOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
        </Group>
        <Collapse in={giftCardOpen}>
          <TextInput mt="md" placeholder="Gift card code" />
          <Text size="xs" c="dimmed" mt={6}>
            (Not wired to server in the sandbox.)
          </Text>
        </Collapse>
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mb="md">
        <Select
          label="How Did You Hear About Us"
          data={[
            'Yelp / Review Website',
            'Friend / Referral',
            'Instagram',
            'Google Search',
            'Other',
          ]}
          value={heardAbout}
          onChange={setHeardAbout}
        />
        <Select
          label="Tell Us More"
          data={['Yelp', 'Google Reviews', 'Facebook', 'Podcast', 'Other']}
          value={heardAboutMore}
          onChange={setHeardAboutMore}
        />
      </SimpleGrid>

      <Paper radius="md" p="md" mb="md" bg="blue.0" withBorder>
        <Checkbox
          color="purple"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.currentTarget.checked)}
          label={
            <Text size="xs">
              I have read and agree to the <Anchor size="xs">privacy policy</Anchor>. By checking
              this box, you agree to our <Anchor size="xs">cancellation policy</Anchor> and
              authorize us to store your card and charge it for services rendered, including
              charges after the appointment, and any agreed add-ons. You also agree to text
              communications regarding available appointments, services, products, and other
              functions of Human Powered Health.
            </Text>
          }
        />
      </Paper>

      {error && (
        <Alert color="red" variant="light" mb="md">
          {error}
        </Alert>
      )}

      <Button
        fullWidth
        size="lg"
        color="purple"
        radius="md"
        onClick={handlePay}
        loading={submitting}
        disabled={!readyToSubmit}
        rightSection={<IconArrowRight size={16} />}
      >
        {scheduleLabel} · ${(total / 100).toFixed(2)}
      </Button>
      {disabledReason && (
        <Text size="xs" c="orange.7" ta="center" mt={6}>
          {disabledReason}
        </Text>
      )}

      <Group mt="md">
        <Anchor
          component="button"
          size="sm"
          c="dimmed"
          onClick={() => navigate('/booking/schedule')}
        >
          ← Back
        </Anchor>
        {isGift && (
          <Badge color="purple" variant="light" leftSection={<IconLock size={12} />} ml="auto">
            Recipient never sees pricing
          </Badge>
        )}
      </Group>
    </Container>
  );
}
