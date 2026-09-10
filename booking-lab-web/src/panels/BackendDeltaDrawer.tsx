import {
  Accordion,
  Anchor,
  Badge,
  Box,
  Code,
  Drawer,
  Group,
  List,
  Stack,
  Text,
} from '@mantine/core';
import { IconBug, IconExternalLink } from '@tabler/icons-react';
import { useFlowState } from '../shared/FlowStateContext';
import { getDelta } from './backendDeltas';

type Props = { opened: boolean; onClose: () => void };

export function BackendDeltaDrawer({ opened, onClose }: Props) {
  const { stepId } = useFlowState();
  const delta = getDelta(stepId);
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size={560}
      title={
        <Group gap={8}>
          <IconBug size={18} />
          <Text fw={700}>Backend delta</Text>
          <Badge color="orange" variant="light" size="sm">
            {stepId}
          </Badge>
        </Group>
      }
    >
      <Stack gap="sm">
        <Box>
          <Text fw={700}>{delta.title}</Text>
          <Text size="sm" c="dimmed">
            {delta.summary}
          </Text>
        </Box>

        <Accordion
          multiple
          defaultValue={['core', 'migrations']}
          variant="separated"
        >
          <Accordion.Item value="core">
            <Accordion.Control>
              <SectionTitle
                label="HPH.Core.API"
                count={delta.coreApi.length}
                color="purple"
              />
            </Accordion.Control>
            <Accordion.Panel>
              {delta.coreApi.length === 0 ? (
                <EmptyLine>No Core.API changes for this step.</EmptyLine>
              ) : (
                <Stack gap="xs">
                  {delta.coreApi.map((c) => (
                    <Box
                      key={c.file + (c.symbol ?? '')}
                      p="xs"
                      style={{
                        border: '1px solid var(--mantine-color-gray-3)',
                        borderRadius: 6,
                      }}
                    >
                      <Group gap={4} align="baseline">
                        {c.symbol && (
                          <Badge size="xs" variant="light" color="purple">
                            {c.symbol}
                          </Badge>
                        )}
                        <Anchor
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                          size="xs"
                          style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}
                        >
                          <Code>{c.file}</Code>
                          <IconExternalLink size={10} />
                        </Anchor>
                      </Group>
                      <Text size="xs" mt={4}>
                        {c.change}
                      </Text>
                      {c.reason && (
                        <Text size="xs" c="dimmed" mt={2}>
                          Why: {c.reason}
                        </Text>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="migrations">
            <Accordion.Control>
              <SectionTitle
                label="EF Migrations"
                count={delta.migrations.length}
                color="teal"
              />
            </Accordion.Control>
            <Accordion.Panel>
              {delta.migrations.length === 0 ? (
                <EmptyLine>No schema changes for this step.</EmptyLine>
              ) : (
                <Stack gap="xs">
                  {delta.migrations.map((m) => (
                    <Box key={m.table}>
                      <Text size="xs" fw={700}>
                        <Code>{m.table}</Code>
                      </Text>
                      {m.columns && (
                        <List size="xs" spacing={2} mt={2}>
                          {m.columns.map((col) => (
                            <List.Item key={col}>
                              <Code>{col}</Code>
                            </List.Item>
                          ))}
                        </List>
                      )}
                      {m.notes && (
                        <Text size="xs" c="dimmed" mt={2}>
                          {m.notes}
                        </Text>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="webhooks">
            <Accordion.Control>
              <SectionTitle
                label="Webhooks / Functions"
                count={delta.webhooks.length}
                color="orange"
              />
            </Accordion.Control>
            <Accordion.Panel>
              {delta.webhooks.length === 0 ? (
                <EmptyLine>No webhook or queue changes.</EmptyLine>
              ) : (
                <Stack gap="xs">
                  {delta.webhooks.map((w) => (
                    <Box key={w.handler}>
                      <Group gap={4}>
                        <Badge size="xs" variant="light" color="orange">
                          {w.project}
                        </Badge>
                        {w.url ? (
                          <Anchor href={w.url} target="_blank" rel="noreferrer" size="xs">
                            <Code>{w.handler}</Code>
                          </Anchor>
                        ) : (
                          <Code>{w.handler}</Code>
                        )}
                      </Group>
                      <Text size="xs" mt={2}>
                        {w.note}
                      </Text>
                    </Box>
                  ))}
                </Stack>
              )}
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="admin">
            <Accordion.Control>
              <SectionTitle
                label="HPH.Admin.Web"
                count={delta.admin.length}
                color="blue"
              />
            </Accordion.Control>
            <Accordion.Panel>
              {delta.admin.length === 0 ? (
                <EmptyLine>No admin UI changes.</EmptyLine>
              ) : (
                <Stack gap="xs">
                  {delta.admin.map((a) => (
                    <Box key={a.file}>
                      <Anchor href={a.url} target="_blank" rel="noreferrer" size="xs">
                        <Code>{a.file}</Code>
                      </Anchor>
                      <Text size="xs" mt={2}>
                        {a.change}
                      </Text>
                    </Box>
                  ))}
                </Stack>
              )}
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>

        <Text size="xs" c="dimmed">
          Deep-links open the current
          <Code ml={4} mr={4}>
            TeamGenius/HPH.Core.API
          </Code>
          master branch. Content is curated per-step and lives in
          <Code ml={4}>panels/backendDeltas.ts</Code>.
        </Text>
      </Stack>
    </Drawer>
  );
}

function SectionTitle({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <Group gap={6}>
      <Text fw={700} size="sm">
        {label}
      </Text>
      <Badge size="xs" variant="light" color={color}>
        {count}
      </Badge>
    </Group>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <Text size="xs" c="dimmed">
      {children}
    </Text>
  );
}
