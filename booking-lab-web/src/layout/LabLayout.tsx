import { AppShell, Box, Group, Text, UnstyledButton } from '@mantine/core';
import { Outlet, useLocation } from 'react-router-dom';
import { useQuery } from 'urql';
import { BOOKING_SESSION_QUERY } from '../client/gql';
import { PanelDock } from '../panels/PanelDock';
import { CustomSelectionSidebar } from '../shared/CustomSelectionSidebar';
import { LabBanner } from '../shared/LabBanner';
import { useSessionContext } from '../shared/SessionContext';
import { BRAND_MIDNIGHT_BLUE } from '../theme';
import { useTutorial } from '../tutorial/TutorialContext';
import { useTutorialCtx } from '../tutorial/useTutorialCtx';

export function LabLayout() {
  const location = useLocation();
  const isRecipient = location.pathname.startsWith('/gift');
  const { sessionId } = useSessionContext();
  const { active, stop } = useTutorial();
  const tutorialCtx = useTutorialCtx();

  const [sessionResult] = useQuery<{
    bookingSession: { selections: { serviceId: string | null } } | null;
  }>({
    query: BOOKING_SESSION_QUERY,
    variables: { id: sessionId ?? '' },
    pause: !sessionId,
  });
  const hasService = !!sessionResult.data?.bookingSession?.selections.serviceId;

  // Match production admin: sidebar only appears on the service picker (/booking)
  // AFTER the customer has committed a service to the session.
  const showAside = location.pathname === '/booking' && hasService;

  const resetLab = async () => {
    if (active) stop();
    await tutorialCtx.reset();
  };

  return (
    <AppShell
      header={{ height: 96 }}
      aside={
        showAside
          ? { width: 340, breakpoint: 'md', collapsed: { mobile: true } }
          : undefined
      }
      padding={0}
      bg="gray.0"
    >
      <AppShell.Header withBorder={false}>
        <LabBanner />
        <Box
          h={60}
          style={{
            background: BRAND_MIDNIGHT_BLUE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <UnstyledButton
            onClick={() => void resetLab()}
            aria-label="Human Powered Health — reset lab and start over"
            style={{ borderRadius: 6 }}
          >
            <Group gap={10} align="center">
              <BrandGlyph />
              <Text c="white" fw={500} fz="lg" style={{ letterSpacing: 0.3 }}>
                Human Powered Health
                <sup style={{ fontSize: 8, marginLeft: 2, opacity: 0.7 }}>™</sup>
              </Text>
            </Group>
          </UnstyledButton>
          <Text
            c="rgba(255,255,255,0.55)"
            size="xs"
            style={{ position: 'absolute', right: 24 }}
          >
            {isRecipient ? 'Recipient view' : 'labs-dev · booking'}
          </Text>
        </Box>
      </AppShell.Header>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
      {showAside && (
        <AppShell.Aside
          withBorder
          style={{ background: 'white' }}
        >
          <CustomSelectionSidebar />
        </AppShell.Aside>
      )}
      <PanelDock />
    </AppShell>
  );
}

function BrandGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 4c6 2 10 6 12 12M20 4c-6 2-10 6-12 12"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
