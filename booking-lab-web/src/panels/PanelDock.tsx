import { ActionIcon, Group, Paper, Tooltip } from '@mantine/core';
import {
  IconBookmark,
  IconBug,
  IconPlayerPlay,
  IconSearch,
} from '@tabler/icons-react';
import { useState } from 'react';
import { BackendDeltaDrawer } from './BackendDeltaDrawer';
import { DocsSearchDrawer } from './DocsSearchDrawer';
import { StaffPeekDrawer } from './StaffPeekDrawer';
import { TutorialDrawer } from './TutorialDrawer';

type PanelKey = 'tutorial' | 'staff' | 'delta' | 'docs' | null;

export function PanelDock() {
  const [open, setOpen] = useState<PanelKey>(null);
  const toggle = (k: PanelKey) => setOpen((cur) => (cur === k ? null : k));

  return (
    <>
      <Paper
        shadow="md"
        radius="xl"
        p={6}
        withBorder
        style={{
          position: 'fixed',
          right: 16,
          bottom: 88,
          zIndex: 400,
          background: 'white',
        }}
      >
        <Group gap={4}>
          <Tooltip label="Tutorial" position="left" withArrow>
            <ActionIcon
              variant={open === 'tutorial' ? 'filled' : 'subtle'}
              color="purple"
              size="lg"
              radius="xl"
              onClick={() => toggle('tutorial')}
              aria-label="Tutorial"
            >
              <IconPlayerPlay size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Staff view" position="left" withArrow>
            <ActionIcon
              variant={open === 'staff' ? 'filled' : 'subtle'}
              color="teal"
              size="lg"
              radius="xl"
              onClick={() => toggle('staff')}
              aria-label="Staff view"
            >
              <IconBookmark size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Backend delta" position="left" withArrow>
            <ActionIcon
              variant={open === 'delta' ? 'filled' : 'subtle'}
              color="orange"
              size="lg"
              radius="xl"
              onClick={() => toggle('delta')}
              aria-label="Backend delta"
            >
              <IconBug size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Search docs & code" position="left" withArrow>
            <ActionIcon
              variant={open === 'docs' ? 'filled' : 'subtle'}
              color="blue"
              size="lg"
              radius="xl"
              onClick={() => toggle('docs')}
              aria-label="Search docs"
            >
              <IconSearch size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Paper>

      <TutorialDrawer opened={open === 'tutorial'} onClose={() => setOpen(null)} />
      <StaffPeekDrawer opened={open === 'staff'} onClose={() => setOpen(null)} />
      <BackendDeltaDrawer opened={open === 'delta'} onClose={() => setOpen(null)} />
      <DocsSearchDrawer opened={open === 'docs'} onClose={() => setOpen(null)} />
    </>
  );
}
