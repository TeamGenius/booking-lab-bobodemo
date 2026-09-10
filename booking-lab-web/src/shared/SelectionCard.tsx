import { Card, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  description?: string;
  rightSlot?: ReactNode;
  selected: boolean;
  onClick: () => void;
};

export function SelectionCard({ title, description, rightSlot, selected, onClick }: Props) {
  return (
    <Card
      withBorder
      radius="md"
      padding="md"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        borderColor: selected ? 'var(--mantine-color-orange-6)' : undefined,
        borderWidth: selected ? 2 : 1,
        boxShadow: selected ? '0 0 0 2px var(--mantine-color-orange-1)' : undefined,
        transition: 'border-color 120ms, box-shadow 120ms',
      }}
    >
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Stack gap={4} style={{ flex: 1 }}>
          <Group gap="xs">
            {selected && (
              <ThemeIcon color="orange" radius="xl" size="sm">
                <IconCheck size={12} stroke={3} />
              </ThemeIcon>
            )}
            <Text fw={600}>{title}</Text>
          </Group>
          {description && (
            <Text size="sm" c="dimmed" lh={1.4}>
              {description}
            </Text>
          )}
        </Stack>
        {rightSlot}
      </Group>
    </Card>
  );
}
