import { Badge, Button, Group, Paper, Progress, Text } from '@mantine/core';
import { IconPlayerPause, IconPlayerPlay, IconX } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Spotlight } from './Spotlight';
import type { TutorialScript, TutorialStep } from './scripts';
import { useTutorialCtx } from './useTutorialCtx';

export type TutorialMode = 'auto' | 'guided';
type AutoPhase = 'explaining' | 'acting' | 'reviewing';

const AUTO_READING_TIME_MS = 2500;
const AUTO_REVIEW_TIME_MS = 3000;

type Props = {
  script: TutorialScript | null;
  mode: TutorialMode;
  onComplete: () => void;
  onCancel: () => void;
};

export function TutorialRunner({ script, mode, onComplete, onCancel }: Props) {
  const ctx = useTutorialCtx();
  const ctxRef = useRef(ctx);
  const [stepIdx, setStepIdx] = useState(0);
  const [running, setRunning] = useState(true);
  const [autoPhase, setAutoPhase] = useState<AutoPhase>('explaining');
  const [error, setError] = useState<string | null>(null);
  const memoRef = useRef<Record<string, unknown>>({});
  const cancelledRef = useRef(false);
  const executingRef = useRef(false);

  useEffect(() => {
    ctxRef.current = ctx;
  }, [ctx]);

  useEffect(() => {
    if (!script) return;
    setStepIdx(0);
    memoRef.current = {};
    cancelledRef.current = false;
    setError(null);
    setRunning(true);
    setAutoPhase('explaining');
  }, [script]);

  const executeStep = useCallback(
    async (step: TutorialStep) => {
      executingRef.current = true;
      try {
        if (step.run) await step.run(ctxRef.current, memoRef.current);
      } finally {
        executingRef.current = false;
      }
    },
    [],
  );

  useEffect(() => {
    if (!script || !running) return;
    const step = script.steps[stepIdx];
    if (!step) return;
    if (mode !== 'auto') return;

    let cancelled = false;
    (async () => {
      try {
        setAutoPhase('explaining');
        await new Promise((resolve) => window.setTimeout(resolve, AUTO_READING_TIME_MS));
        if (cancelled || cancelledRef.current) return;
        setAutoPhase('acting');
        await executeStep(step);
        if (cancelled || cancelledRef.current) return;
        setAutoPhase('reviewing');
        window.setTimeout(() => {
          if (cancelled || cancelledRef.current) return;
          if (stepIdx + 1 >= script.steps.length) onComplete();
          else setStepIdx(stepIdx + 1);
        }, Math.max(step.waitMs ?? 0, AUTO_REVIEW_TIME_MS));
      } catch (e) {
        setError((e as Error).message);
        setRunning(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [script, stepIdx, running, mode, executeStep, onComplete]);

  const handleNext = useCallback(async () => {
    if (!script) return;
    const step = script.steps[stepIdx];
    if (!step) return;
    try {
      if (!executingRef.current) await executeStep(step);
      if (stepIdx + 1 >= script.steps.length) onComplete();
      else setStepIdx(stepIdx + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [script, stepIdx, executeStep, onComplete]);

  if (!script) return null;
  const step = script.steps[stepIdx];
  if (!step) return null;
  const progress = ((stepIdx + 1) / script.steps.length) * 100;

  return (
    <>
      {step.target && (mode === 'guided' || autoPhase === 'explaining') && (
        <Spotlight target={step.target} />
      )}
      <Paper
        withBorder
        shadow="md"
        radius="md"
        p="sm"
        style={{
          position: 'fixed',
          left: '50%',
          bottom: 24,
          transform: 'translateX(-50%)',
          width: 520,
          maxWidth: 'calc(100vw - 32px)',
          zIndex: 500,
          background: 'white',
        }}
      >
        <Group justify="space-between" mb={4}>
          <Text size="xs" c="dimmed">
            {script.title} · step {stepIdx + 1} / {script.steps.length}
          </Text>
          <Group gap={4}>
            {mode === 'auto' && (
              <Button
                size="compact-xs"
                variant="subtle"
                leftSection={
                  running ? <IconPlayerPause size={12} /> : <IconPlayerPlay size={12} />
                }
                onClick={() => setRunning((v) => !v)}
              >
                {running ? 'Pause' : 'Resume'}
              </Button>
            )}
            <Button
              size="compact-xs"
              variant="subtle"
              color="red"
              leftSection={<IconX size={12} />}
              onClick={() => {
                cancelledRef.current = true;
                onCancel();
              }}
            >
              Stop
            </Button>
          </Group>
        </Group>
        <Progress value={progress} size="xs" color="purple" mb="xs" />
        {mode === 'auto' && (
          <Badge color={autoPhase === 'acting' ? 'orange' : 'purple'} variant="light" size="xs" mb={6}>
            {autoPhase === 'explaining'
              ? 'Read this step'
              : autoPhase === 'acting'
                ? 'Performing the action'
                : 'Review what changed'}
          </Badge>
        )}
        <Text fw={700} size="sm">
          {step.caption}
        </Text>
        {step.detail && (
          <Text size="xs" c="dimmed" mt={2}>
            {step.detail}
          </Text>
        )}
        {error && (
          <Text size="xs" c="red" mt={4}>
            {error}
          </Text>
        )}
        {mode === 'guided' && (
          <Group justify="flex-end" mt="xs">
            <Button size="xs" color="purple" onClick={handleNext}>
              {stepIdx + 1 >= script.steps.length ? 'Finish' : 'Next →'}
            </Button>
          </Group>
        )}
      </Paper>
    </>
  );
}
