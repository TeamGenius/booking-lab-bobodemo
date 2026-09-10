import { Box, Group, Text, ThemeIcon } from '@mantine/core';
import {
  IconCalendarEvent,
  IconCheck,
  IconCreditCard,
  IconUser,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';

export type StepState = 'done' | 'active' | 'pending';

type Step = {
  key: string;
  label: string;
  icon: ReactNode;
};

const STEPS: Step[] = [
  { key: 'date', label: 'Date & Time', icon: <IconCalendarEvent size={16} /> },
  { key: 'info', label: 'Your Info', icon: <IconUser size={16} /> },
  { key: 'pay', label: 'Pay & Schedule', icon: <IconCreditCard size={16} /> },
];

type Props = {
  active: 'date' | 'info' | 'pay';
};

export function BookingStepper({ active }: Props) {
  const activeIdx = STEPS.findIndex((s) => s.key === active);
  return (
    <Group gap={0} justify="space-between" wrap="nowrap" py="md">
      {STEPS.map((step, i) => {
        const state: StepState =
          i < activeIdx ? 'done' : i === activeIdx ? 'active' : 'pending';
        return (
          <Group key={step.key} gap={0} style={{ flex: 1 }} wrap="nowrap" align="center">
            <StepBubble step={step} state={state} />
            {i < STEPS.length - 1 && (
              <Box
                style={{
                  flex: 1,
                  height: 2,
                  background:
                    state === 'done'
                      ? 'var(--mantine-color-orange-6)'
                      : 'var(--mantine-color-gray-3)',
                  marginLeft: 8,
                  marginRight: 8,
                }}
              />
            )}
          </Group>
        );
      })}
    </Group>
  );
}

function StepBubble({ step, state }: { step: Step; state: StepState }) {
  const color =
    state === 'done' ? 'orange' : state === 'active' ? 'orange' : 'gray';
  const variant =
    state === 'done' ? 'filled' : state === 'active' ? 'filled' : 'light';
  return (
    <Group gap={8} wrap="nowrap">
      <ThemeIcon color={color} variant={variant} radius="xl" size={28}>
        {state === 'done' ? <IconCheck size={14} stroke={3} /> : step.icon}
      </ThemeIcon>
      <Text
        size="sm"
        fw={state === 'active' ? 600 : 500}
        c={state === 'pending' ? 'dimmed' : undefined}
      >
        {step.label}
      </Text>
    </Group>
  );
}
