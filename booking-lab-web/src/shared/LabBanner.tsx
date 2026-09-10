import { Alert, Group, Text } from '@mantine/core';
import { IconFlask } from '@tabler/icons-react';

export function LabBanner() {
  return (
    <Alert
      color="purple"
      variant="light"
      radius={0}
      styles={{
        root: {
          borderBottom: '1px solid var(--mantine-color-gray-3)',
          borderRadius: 0,
        },
      }}
      icon={<IconFlask size={18} />}
      p="xs"
    >
      <Group justify="space-between">
        <Text size="xs" fw={600}>
          Booking Lab · LP-2112 · BOBO = <b>B</b>ooking <b>o</b>n <b>B</b>ehalf <b>o</b>f Others
          — sandbox (no real payments or emails)
        </Text>
        <Text size="xs" c="dimmed">
          Server: <code>localhost:4000/graphql</code>
        </Text>
      </Group>
    </Alert>
  );
}
