import {
  Badge,
  Button,
  Card,
  Divider,
  Drawer,
  Group,
  Stack,
  Text,
} from '@mantine/core';
import { IconPlayerPlay, IconPointer, IconRefresh } from '@tabler/icons-react';
import { ALL_SCRIPTS } from '../tutorial/scripts';
import { useTutorial } from '../tutorial/TutorialContext';
import { useTutorialCtx } from '../tutorial/useTutorialCtx';

type Props = { opened: boolean; onClose: () => void };

export function TutorialDrawer({ opened, onClose }: Props) {
  const { start, active, stop } = useTutorial();
  const ctx = useTutorialCtx();

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size={440}
      title={
        <Group gap={8}>
          <IconPlayerPlay size={18} />
          <Text fw={700}>Tutorial</Text>
          {active && (
            <Badge color="purple" variant="light">
              {active.mode}
            </Badge>
          )}
        </Group>
      }
    >
      <Text size="xs" c="dimmed" mb="sm">
        Pick a flow. Auto pauses to explain each step, performs the action, then
        gives you time to review the result. Guided waits for you to select Next.
      </Text>

      <Stack gap="sm">
        {ALL_SCRIPTS.map((s) => (
          <Card key={s.id} withBorder radius="md" p="sm">
            <Text fw={700} size="sm">
              {s.title}
            </Text>
            <Text size="xs" c="dimmed" mb="xs">
              {s.subtitle}
            </Text>
            <Group gap={6}>
              <Button
                size="xs"
                color="purple"
                leftSection={<IconPlayerPlay size={12} />}
                onClick={() => {
                  start(s, 'auto');
                  onClose();
                }}
              >
                Auto
              </Button>
              <Button
                size="xs"
                variant="light"
                color="purple"
                leftSection={<IconPointer size={12} />}
                onClick={() => {
                  start(s, 'guided');
                  onClose();
                }}
              >
                Guided
              </Button>
              <Text size="xs" c="dimmed">
                {s.steps.length} steps
              </Text>
            </Group>
          </Card>
        ))}

        <Divider my="xs" />
        <Group gap="xs">
          <Button
            size="xs"
            variant="subtle"
            color="red"
            leftSection={<IconRefresh size={12} />}
            onClick={() => {
              if (active) stop();
              void ctx.reset();
            }}
          >
            Reset lab
          </Button>
          <Text size="xs" c="dimmed">
            Clears the session and returns to Services.
          </Text>
        </Group>
      </Stack>
    </Drawer>
  );
}
