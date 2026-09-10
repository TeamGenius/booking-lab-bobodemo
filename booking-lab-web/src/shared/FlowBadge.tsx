import { Badge, Group } from '@mantine/core';
import { IconGift, IconUser } from '@tabler/icons-react';
import { InfoTooltip } from './InfoTooltip';

type Mode = 'SELF' | 'GIFT_SCHEDULE_NOW' | 'GIFT_SCHEDULE_LATER' | 'RECIPIENT';

type Props = { mode: Mode };

const LABELS: Record<Mode, { label: string; color: string; icon: React.ReactNode; help: string }> = {
  SELF: {
    label: 'Self-serve',
    color: 'orange',
    icon: <IconUser size={14} />,
    help: 'Purchaser = Recipient = Athlete. Standard booking flow.',
  },
  GIFT_SCHEDULE_NOW: {
    label: 'BOBO · Gift · schedule now',
    color: 'purple',
    icon: <IconGift size={14} />,
    help: 'Purchaser picks the appointment on behalf of the Recipient. Visit is created immediately. Uses finalizeBooking with isGiftBooking=true.',
  },
  GIFT_SCHEDULE_LATER: {
    label: 'BOBO · Gift · schedule later',
    color: 'purple',
    icon: <IconGift size={14} />,
    help: 'Purchaser pays without a slot. Gift Credit is created. Recipient signs in later and picks their own time. Uses finalizeGiftBooking + claimGiftBooking.',
  },
  RECIPIENT: {
    label: 'BOBO · Recipient view',
    color: 'purple',
    icon: <IconGift size={14} />,
    help: 'You are viewing the flow as the Recipient. Pricing is hidden (FR-7); included assessments are locked (FR-6).',
  },
};

export function FlowBadge({ mode }: Props) {
  const cfg = LABELS[mode];
  return (
    <Group gap={4} wrap="nowrap">
      <Badge color={cfg.color} variant="light" size="lg" radius="sm" leftSection={cfg.icon}>
        {cfg.label}
      </Badge>
      <InfoTooltip label={cfg.help} />
    </Group>
  );
}
