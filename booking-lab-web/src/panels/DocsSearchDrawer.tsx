import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Code,
  Drawer,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconAlertCircle, IconExternalLink, IconSearch } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useDocsIndex, type DocRecord } from './useDocsIndex';

type Props = { opened: boolean; onClose: () => void };

export function DocsSearchDrawer({ opened, onClose }: Props) {
  const { state, load } = useDocsIndex();
  const [q, setQ] = useState('');

  useEffect(() => {
    if (opened) load();
  }, [opened, load]);

  const results: DocRecord[] = useMemo(() => {
    if (state.status !== 'ready' || !q.trim()) return [];
    return state.index
      .search(q)
      .slice(0, 30)
      .map((hit) => hit as unknown as DocRecord);
  }, [state, q]);

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size={560}
      title={
        <Group gap={8}>
          <IconSearch size={18} />
          <Text fw={700}>Docs & code search</Text>
          {state.status === 'ready' && (
            <Badge color="blue" variant="light" size="sm">
              {state.payload.records.length} chunks
            </Badge>
          )}
        </Group>
      }
    >
      <Stack gap="sm">
        <TextInput
          placeholder="Search HPH.Core.API docs, entities, models…"
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
          disabled={state.status !== 'ready'}
          data-autofocus
        />

        {state.status === 'idle' || state.status === 'loading' ? (
          <Group justify="center" py="lg">
            <Loader color="blue" size="sm" />
            <Text size="sm" c="dimmed">
              Loading index…
            </Text>
          </Group>
        ) : state.status === 'empty' ? (
          <Alert color="orange" icon={<IconAlertCircle size={14} />} variant="light">
            <Text size="xs">{state.reason}</Text>
          </Alert>
        ) : state.status === 'error' ? (
          <Alert color="red" icon={<IconAlertCircle size={14} />} variant="light">
            <Text size="xs">Could not load docs-index.json: {state.error}</Text>
            <Button
              size="compact-xs"
              mt="xs"
              variant="light"
              color="blue"
              onClick={() => load()}
            >
              Retry
            </Button>
          </Alert>
        ) : (
          <>
            {q.trim() && results.length === 0 && (
              <Text size="xs" c="dimmed" ta="center">
                No matches for “{q}”.
              </Text>
            )}
            <ScrollArea.Autosize mah="calc(100vh - 220px)">
              <Stack gap="xs">
                {results.map((r) => (
                  <ResultCard key={r.id} record={r} query={q} />
                ))}
              </Stack>
            </ScrollArea.Autosize>
            {state.payload.truncated && (
              <Text size="xs" c="dimmed">
                Index was truncated at build time — try a more specific query.
              </Text>
            )}
          </>
        )}
      </Stack>
    </Drawer>
  );
}

function ResultCard({ record, query }: { record: DocRecord; query: string }) {
  const snippet = useMemo(() => snippetFor(record.text, query), [record.text, query]);
  const kindColor =
    record.kind === 'doc' ? 'teal' : record.kind === 'code' ? 'purple' : 'gray';
  return (
    <Box
      p="xs"
      style={{
        border: '1px solid var(--mantine-color-gray-3)',
        borderRadius: 6,
      }}
    >
      <Group gap={6} align="baseline">
        <Badge size="xs" variant="light" color="blue">
          {record.repo}
        </Badge>
        <Badge size="xs" variant="light" color={kindColor}>
          {record.kind}
        </Badge>
        <Text fw={700} size="xs" style={{ flex: 1 }}>
          {record.title}
        </Text>
      </Group>
      <Anchor
        href={record.url}
        target="_blank"
        rel="noreferrer"
        size="xs"
        style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}
      >
        <Code>{record.path}</Code>
        <IconExternalLink size={10} />
      </Anchor>
      <Text size="xs" mt={4} style={{ whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
        {snippet}
      </Text>
    </Box>
  );
}

function snippetFor(text: string, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return text.slice(0, 220) + (text.length > 220 ? '…' : '');
  const idx = text.toLowerCase().indexOf(q);
  if (idx < 0) return text.slice(0, 220) + (text.length > 220 ? '…' : '');
  const start = Math.max(0, idx - 80);
  const end = Math.min(text.length, idx + 180);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}
