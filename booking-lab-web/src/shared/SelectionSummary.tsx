import { Anchor, Badge, Box, Divider, Group, Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconBuilding, IconCalendarEvent, IconLock } from '@tabler/icons-react';
import { PriceLabel } from './PriceLabel';

type Site = { name: string; addressLine: string; city: string };
type Service = { name: string; priceCents: number; durationMinutes: number };
type Slot = { startsAt: string; employeeName: string } | null;

type Props = {
  service: Service;
  site: Site;
  slot?: Slot;
  discountCents?: number;
  onChangeSelection?: () => void;
  hideSlotRow?: boolean;
  hidePricing?: boolean;
};

function durationLabel(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}
function fmtRange(iso: string, mins: number) {
  const start = new Date(iso);
  const end = new Date(start.getTime() + mins * 60_000);
  const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  return `${start.toLocaleTimeString(undefined, opts)} - ${end.toLocaleTimeString(undefined, opts)}`;
}

export function SelectionSummary({
  service,
  site,
  slot,
  discountCents = 0,
  onChangeSelection,
  hideSlotRow = false,
  hidePricing = false,
}: Props) {
  const total = service.priceCents - discountCents;
  return (
    <Paper withBorder radius="md" p="lg" bg="white">
      <Group justify="space-between" align="flex-start" mb="sm">
        <Text fw={700}>Custom Selection</Text>
        {hidePricing && (
          <Badge color="purple" variant="light" leftSection={<IconLock size={12} />}>
            Recipient view — pricing hidden
          </Badge>
        )}
      </Group>
      <Text size="sm" mb={2}>
        {service.name}
      </Text>
      <Text size="sm" c="dimmed" mb="md">
        <b>Estimated Visit Duration:</b> {durationLabel(service.durationMinutes)}
      </Text>

      <Group align="flex-start" gap="xl" wrap="wrap">
        {!hideSlotRow && slot && (
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon variant="light" color="gray" size="lg" radius="sm">
              <IconCalendarEvent size={18} />
            </ThemeIcon>
            <Box>
              <Text size="sm" fw={600}>
                {fmtDay(slot.startsAt)}
              </Text>
              <Text size="xs" c="orange.7">
                {fmtRange(slot.startsAt, service.durationMinutes)}
              </Text>
              <Text size="xs" c="dimmed">
                with {slot.employeeName}
              </Text>
            </Box>
          </Group>
        )}
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon variant="light" color="gray" size="lg" radius="sm">
            <IconBuilding size={18} />
          </ThemeIcon>
          <Box>
            <Text size="sm" fw={600}>
              {site.name}
            </Text>
            <Text size="xs" c="orange.7">
              {site.addressLine}
            </Text>
            <Text size="xs" c="dimmed">
              {site.city}
            </Text>
          </Box>
        </Group>
      </Group>

      {!hidePricing && (
        <>
          <Divider my="md" />
          <Stack gap={4}>
            <Group justify="space-between">
              <Text size="sm">Sub Total</Text>
              <PriceLabel cents={service.priceCents} />
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Discount
              </Text>
              <Text size="sm" c={discountCents > 0 ? 'green' : 'dimmed'}>
                {discountCents > 0 ? `-$${(discountCents / 100).toFixed(2)}` : '$0.00'}
              </Text>
            </Group>
            <Group justify="space-between" mt={4}>
              <Text fw={700}>Total</Text>
              <Text fw={700}>
                <PriceLabel cents={total} />
              </Text>
            </Group>
          </Stack>
        </>
      )}

      {hidePricing && (
        <>
          <Divider my="md" />
          <Group gap={6}>
            <IconLock size={14} color="var(--mantine-color-purple-6)" />
            <Text size="xs" c="dimmed">
              Included and paid by the Purchaser. Assessments are locked (FR-6); pricing is
              never shown to the Recipient (FR-7).
            </Text>
          </Group>
        </>
      )}

      {onChangeSelection && (
        <Group mt="md">
          <Anchor
            component="button"
            size="xs"
            c="dimmed"
            onClick={onChangeSelection}
            underline="hover"
          >
            ← Change Selection
          </Anchor>
        </Group>
      )}
    </Paper>
  );
}
