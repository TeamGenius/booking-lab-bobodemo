import { Box, Group, Text } from '@mantine/core';
import type { ReactNode } from 'react';

type Props = { children: ReactNode };

export function SectionTitle({ children }: Props) {
  return (
    <Group gap="md" align="center" my="lg" wrap="nowrap">
      <Box style={{ flex: 1, borderTop: '1px dashed #d5d3da' }} />
      <Text c="dimmed" size="sm" fw={500} style={{ letterSpacing: 0.3 }}>
        {children}
      </Text>
      <Box style={{ flex: 1, borderTop: '1px dashed #d5d3da' }} />
    </Group>
  );
}
