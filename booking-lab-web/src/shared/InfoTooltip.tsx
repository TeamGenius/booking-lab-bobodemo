import { ActionIcon, Tooltip } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

type Props = {
  label: string;
  color?: string;
};

export function InfoTooltip({ label, color = 'gray' }: Props) {
  return (
    <Tooltip
      label={label}
      multiline
      w={340}
      withArrow
      openDelay={80}
      color="dark"
      transitionProps={{ duration: 120 }}
    >
      <ActionIcon variant="subtle" color={color} size="sm" aria-label="More info">
        <IconInfoCircle size={16} stroke={1.75} />
      </ActionIcon>
    </Tooltip>
  );
}
