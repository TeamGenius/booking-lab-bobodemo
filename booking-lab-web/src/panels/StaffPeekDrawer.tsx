import {
  Badge,
  Box,
  Code,
  Divider,
  Drawer,
  Group,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconEye } from '@tabler/icons-react';
import { useFlowState, type FlowSession } from '../shared/FlowStateContext';

type Props = { opened: boolean; onClose: () => void };

export function StaffPeekDrawer({ opened, onClose }: Props) {
  const { session, sessionId, stepId, mode } = useFlowState();

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size={520}
      title={
        <Group gap={8}>
          <IconEye size={18} />
          <Text fw={700}>Staff peek</Text>
          <Badge color="teal" variant="light" size="sm">
            HPH.Admin.Web
          </Badge>
        </Group>
      }
    >
      <Text size="xs" c="dimmed" mb="sm">
        Read-only mirror of what a physiologist or experience coordinator would
        see once the athlete's flow lands in the DB. Synthetic records — no
        server round-trip.
      </Text>

      {!session ? (
        <EmptyState />
      ) : (
        <Stack gap="md">
          <BookingRecord session={session} stepId={stepId} mode={mode} sessionId={sessionId} />
          <ParticipantsRecord session={session} />
          {session.selections.isGiftBooking && <GiftRecord session={session} />}
          <PaymentRecord session={session} />
          <AuditRecord session={session} />
        </Stack>
      )}
    </Drawer>
  );
}

function EmptyState() {
  return (
    <Box p="lg" ta="center">
      <Text size="sm" c="dimmed">
        No session yet. Start a booking to see the staff-side records populate
        live.
      </Text>
    </Box>
  );
}

function shortId(prefix: string, seed: string | null | undefined) {
  const s = (seed ?? '').padEnd(12, '0');
  return `${prefix}_${s.slice(0, 8).toUpperCase()}`;
}

function fmtPrice(cents: number | null | undefined) {
  const v = cents ?? 0;
  return `$${(v / 100).toFixed(2)}`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function BookingRecord({
  session,
  stepId,
  mode,
  sessionId,
}: {
  session: FlowSession;
  stepId: string;
  mode: string;
  sessionId: string | null;
}) {
  const status =
    session.status === 'CONFIRMED'
      ? 'BOOKED'
      : session.status === 'PENDING_CLAIM'
        ? 'AWAITING_CLAIM'
        : session.status === 'CLAIMED'
          ? 'CLAIMED'
          : 'DRAFT';
  return (
    <Box>
      <SectionHeader label="Booking" mapping="Booking (HPH.Core.API)" />
      <Table
        striped
        withRowBorders={false}
        style={{ fontSize: 12 }}
        withColumnBorders={false}
      >
        <Table.Tbody>
          <Row k="Id" v={<Code>{shortId('bk', sessionId)}</Code>} />
          <Row
            k="Status"
            v={
              <Badge
                color={
                  status === 'BOOKED'
                    ? 'teal'
                    : status === 'AWAITING_CLAIM'
                      ? 'orange'
                      : status === 'CLAIMED'
                        ? 'purple'
                        : 'gray'
                }
                variant="light"
                size="sm"
              >
                {status}
              </Badge>
            }
          />
          <Row k="Flow step" v={<Code>{stepId}</Code>} />
          <Row k="Mode" v={<Code>{mode}</Code>} />
          <Row k="Site" v={session.site?.name ?? '—'} />
          <Row k="Service" v={session.service?.name ?? '—'} />
          <Row
            k="Slot"
            v={session.slot ? fmtDate(session.slot.startsAt) : '—'}
          />
          <Row k="Employee" v={session.slot?.employeeName ?? 'unassigned'} />
          <Row k="Confirmation code" v={session.confirmationCode ?? '—'} />
          <Row k="Total" v={fmtPrice(session.priceCents)} />
        </Table.Tbody>
      </Table>
    </Box>
  );
}

function ParticipantsRecord({ session }: { session: FlowSession }) {
  const sel = session.selections;
  const rows: Array<{ role: string; name: string; email: string }> = [];
  if (sel.purchaserName || sel.purchaserEmail) {
    rows.push({
      role: sel.isGiftBooking ? 'Purchaser' : 'Participant',
      name: sel.purchaserName ?? '—',
      email: sel.purchaserEmail ?? '—',
    });
  }
  if (sel.isGiftBooking && (sel.recipientName || sel.recipientEmail)) {
    rows.push({
      role: 'Recipient',
      name: sel.recipientName ?? '—',
      email: sel.recipientEmail ?? '—',
    });
  }
  return (
    <Box>
      <SectionHeader
        label="Participants"
        mapping="User, BookingParticipant (HPH.Core.API)"
      />
      {rows.length === 0 ? (
        <Text size="xs" c="dimmed">
          None captured yet.
        </Text>
      ) : (
        <Table striped style={{ fontSize: 12 }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Role</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Email</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r) => (
              <Table.Tr key={r.role}>
                <Table.Td>
                  <Badge size="xs" variant="light" color="gray">
                    {r.role}
                  </Badge>
                </Table.Td>
                <Table.Td>{r.name}</Table.Td>
                <Table.Td>
                  <Code>{r.email}</Code>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Box>
  );
}

function GiftRecord({ session }: { session: FlowSession }) {
  const sel = session.selections;
  const claimStatus =
    session.status === 'PENDING_CLAIM'
      ? 'ISSUED'
      : session.status === 'CLAIMED' || session.status === 'CONFIRMED'
        ? 'REDEEMED'
        : 'DRAFT';
  return (
    <Box>
      <SectionHeader
        label="Gift + Claim"
        mapping="Gift, GiftClaim (HPH.Core.API — proposed)"
      />
      <Table striped style={{ fontSize: 12 }}>
        <Table.Tbody>
          <Row k="Gift id" v={<Code>{shortId('gift', session.id)}</Code>} />
          <Row k="Buyer" v={sel.purchaserName ?? '—'} />
          <Row k="Recipient" v={sel.recipientName ?? '—'} />
          <Row k="Recipient email" v={<Code>{sel.recipientEmail ?? '—'}</Code>} />
          <Row
            k="Claim token"
            v={
              session.claimToken ? (
                <Tooltip label={session.claimToken} withArrow>
                  <Code>{session.claimToken.slice(0, 12)}…</Code>
                </Tooltip>
              ) : (
                '—'
              )
            }
          />
          <Row
            k="Claim status"
            v={
              <Badge
                color={claimStatus === 'REDEEMED' ? 'purple' : 'orange'}
                variant="light"
                size="sm"
              >
                {claimStatus}
              </Badge>
            }
          />
        </Table.Tbody>
      </Table>
    </Box>
  );
}

function PaymentRecord({ session }: { session: FlowSession }) {
  const price = session.service?.priceCents ?? 0;
  const discount = Math.floor((price * 5) / 100);
  const subtotal = price;
  const total = price - discount;
  return (
    <Box>
      <SectionHeader
        label="Invoice + Payment"
        mapping="Invoice, InvoiceLine, Payment (HPH.Core.API + Square)"
      />
      <Table striped style={{ fontSize: 12 }}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Line</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>Amount</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr>
            <Table.Td>{session.service?.name ?? 'Service'}</Table.Td>
            <Table.Td style={{ textAlign: 'right' }}>{fmtPrice(subtotal)}</Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td>Custom Selection discount (5%)</Table.Td>
            <Table.Td style={{ textAlign: 'right' }}>-{fmtPrice(discount)}</Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td>
              <Text fw={700} size="xs">
                Total
              </Text>
            </Table.Td>
            <Table.Td style={{ textAlign: 'right' }}>
              <Text fw={700} size="xs">
                {fmtPrice(total)}
              </Text>
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
      <Divider my="xs" variant="dashed" />
      <Text size="xs" c="dimmed">
        Payment auth stub — real gateway: Square via
        <Code ml={4}>PayAndFinalize</Code>.
      </Text>
    </Box>
  );
}

function AuditRecord({ session }: { session: FlowSession }) {
  return (
    <Box>
      <SectionHeader label="IAuditable" mapping="Common.IAuditable" />
      <Table striped style={{ fontSize: 12 }}>
        <Table.Tbody>
          <Row k="createdBy" v={<Code>bobo-lab@hph.local</Code>} />
          <Row k="updatedBy" v={<Code>bobo-lab@hph.local</Code>} />
          <Row k="createdDate" v={fmtDate(new Date().toISOString())} />
          <Row k="session.id" v={<Code>{session.id}</Code>} />
        </Table.Tbody>
      </Table>
    </Box>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <Table.Tr>
      <Table.Td style={{ width: 140 }}>
        <Text size="xs" c="dimmed">
          {k}
        </Text>
      </Table.Td>
      <Table.Td>{v}</Table.Td>
    </Table.Tr>
  );
}

function SectionHeader({ label, mapping }: { label: string; mapping: string }) {
  return (
    <Group justify="space-between" align="baseline" mb={4}>
      <Text fw={700} size="sm">
        {label}
      </Text>
      <Text size="xs" c="dimmed">
        {mapping}
      </Text>
    </Group>
  );
}
