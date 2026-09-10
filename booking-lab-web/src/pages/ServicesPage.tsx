import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Card,
  Container,
  Group,
  Loader,
  SimpleGrid,
  Text,
  ThemeIcon,
} from '@mantine/core';
import {
  IconBuilding,
  IconCircleCheck,
  IconClock,
  IconPhone,
  IconPlus,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from 'urql';
import {
  MAKE_SELECTIONS_MUTATION,
  SITES_QUERY,
  START_SESSION_MUTATION,
} from '../client/gql';
import { useBookingActions } from '../shared/BookingActionsContext';
import { InfoTooltip } from '../shared/InfoTooltip';
import { PriceLabel } from '../shared/PriceLabel';
import { SectionTitle } from '../shared/SectionTitle';
import { useSessionContext } from '../shared/SessionContext';

type Service = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  durationMinutes: number;
};

type Site = {
  id: string;
  name: string;
  city: string;
  addressLine: string;
  services: Service[];
};

const SITE_KEY = 'booking-lab.selection.siteId';
const SVC_KEY = 'booking-lab.selection.serviceId';

// Deterministic tag mapping for the demo.
const SERVICE_TAGS: Record<string, Array<{ label: string; color: string }>> = {
  'svc-vo2': [{ label: 'BESTSELLER', color: 'orange' }],
  'svc-vo2-den': [{ label: 'BESTSELLER', color: 'orange' }],
  'svc-dxa': [
    { label: 'FASTING REQUIRED', color: 'orange' },
    { label: 'NEW', color: 'red' },
  ],
  'svc-rmr': [
    { label: 'BESTSELLER', color: 'orange' },
    { label: 'FASTING REQUIRED', color: 'orange' },
  ],
  'svc-lactate-den': [],
};

export function ServicesPage() {
  const navigate = useNavigate();
  const { setAction } = useBookingActions();
  const { sessionId, setSessionId } = useSessionContext();
  const [sitesResult] = useQuery<{ sites: Site[] }>({ query: SITES_QUERY });
  const [, startSession] = useMutation(START_SESSION_MUTATION);
  const [, makeSelections] = useMutation(MAKE_SELECTIONS_MUTATION);

  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(
    () => window.localStorage.getItem(SITE_KEY),
  );
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    () => window.localStorage.getItem(SVC_KEY),
  );

  useEffect(() => {
    if (selectedSiteId) window.localStorage.setItem(SITE_KEY, selectedSiteId);
    else window.localStorage.removeItem(SITE_KEY);
  }, [selectedSiteId]);
  useEffect(() => {
    if (selectedServiceId) window.localStorage.setItem(SVC_KEY, selectedServiceId);
    else window.localStorage.removeItem(SVC_KEY);
  }, [selectedServiceId]);

  // Reset Lab (from the tutorial drawer) sets sessionId=null; clear local
  // selection state too so the page returns to the Choose Location view.
  useEffect(() => {
    if (!sessionId) {
      setSelectedSiteId(null);
      setSelectedServiceId(null);
    }
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!sessionId) {
        const res = await startSession({});
        if (!cancelled && res.data?.startBookingSession?.id) {
          setSessionId(res.data.startBookingSession.id);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // Re-run when sessionId flips to null (e.g. tutorial Reset Lab) so the
    // page doesn't stay stuck on the loader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const sites = sitesResult.data?.sites ?? [];
  const site = sites.find((s) => s.id === selectedSiteId);
  const canContinue = !!selectedSiteId && !!selectedServiceId && !!sessionId;

  async function handleContinue() {
    if (!sessionId || !selectedSiteId || !selectedServiceId) return;
    await makeSelections({
      sessionId,
      input: { siteId: selectedSiteId, serviceId: selectedServiceId },
    });
    navigate('/booking/schedule');
  }

  // Commit the service to the session as soon as it's picked, so the Custom
  // Selection sidebar can render its details/discount tiers without needing
  // the user to first click Continue.
  async function handlePickService(svcId: string) {
    setSelectedServiceId(svcId);
    if (sessionId && selectedSiteId) {
      await makeSelections({
        sessionId,
        input: { siteId: selectedSiteId, serviceId: svcId },
      });
    }
  }

  useEffect(() => {
    setAction({
      label: 'Continue',
      onClick: handleContinue,
      disabled: !canContinue,
      helper: !selectedSiteId
        ? 'Pick a location to begin.'
        : !selectedServiceId
          ? 'Choose a service to continue.'
          : 'You can add more services on the next iteration.',
    });
    return () => setAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canContinue, selectedSiteId, selectedServiceId, sessionId]);

  if (sitesResult.fetching || !sessionId) {
    return (
      <Container size="lg" py="xl">
        <Group justify="center" mih={300}>
          <Loader color="purple" />
        </Group>
      </Container>
    );
  }

  // Phase 1: no site chosen yet → location picker
  if (!site) {
    return (
      <Container size="md" py="xl">
        <SectionTitle>Choose Location</SectionTitle>
        <Group justify="center">
          <SimpleGrid
            cols={{ base: 1, sm: 2 }}
            spacing="md"
            style={{ maxWidth: 760, width: '100%' }}
          >
            {sites.map((s) => (
              <LocationCard
                key={s.id}
                site={s}
                selected={false}
                dataTourId={s.id}
                onClick={() => setSelectedSiteId(s.id)}
              />
            ))}
          </SimpleGrid>
        </Group>
      </Container>
    );
  }

  // Phase 2: site chosen → show location summary + service picker
  return (
    <Container size="xl" py="lg">
      <SectionTitle>Location</SectionTitle>
      <Group justify="center" mb="lg">
        <Box style={{ maxWidth: 380, width: '100%' }}>
          <LocationCard
            site={site}
            selected
            trailing={
              <Anchor
                component="button"
                size="xs"
                c="dimmed"
                underline="hover"
                onClick={() => {
                  setSelectedSiteId(null);
                  setSelectedServiceId(null);
                  if (sessionId) {
                    void makeSelections({
                      sessionId,
                      input: { siteId: null, serviceId: null, slotId: null },
                    });
                  }
                }}
              >
                ← Change Site
              </Anchor>
            }
          />
        </Box>
      </Group>

      <SectionTitle>Select a Service</SectionTitle>
      <Group justify="center" mb="sm">
        <Group gap={6}>
          <Text c="dimmed" size="sm">
            Save more when you select more services
          </Text>
          <InfoTooltip label="Custom Selection subtotal is the sum of eligible service prices before discount. Discount tiers unlock automatically as the subtotal grows — see the right sidebar. BOBO leverages existing scheduling & discount rules unchanged; changes to optimization logic are an explicit non-goal for this phase. PRD §2 Non-Goals (Scheduling Optimization) · Spec §9 (BFCM discount alignment)." />
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mb="lg" data-tour="service-grid">
        {site.services.map((svc) => (
          <ServiceCard
            key={svc.id}
            svc={svc}
            selected={selectedServiceId === svc.id}
            dataTourId={svc.id}
            onClick={() => void handlePickService(svc.id)}
          />
        ))}
      </SimpleGrid>
    </Container>
  );
}

function LocationCard({
  site,
  selected,
  onClick,
  trailing,
  dataTourId,
}: {
  site: Site;
  selected: boolean;
  onClick?: () => void;
  trailing?: React.ReactNode;
  dataTourId?: string;
}) {
  return (
    <Card
      withBorder
      radius="md"
      p="md"
      onClick={onClick}
      data-tour-site-card={dataTourId}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        borderColor: selected ? 'var(--mantine-color-orange-6)' : undefined,
        borderWidth: selected ? 2 : 1,
        transition: 'border-color 120ms ease',
      }}
    >
      <Group gap="sm" align="flex-start" wrap="nowrap">
        <ThemeIcon variant="light" color="gray" size="lg" radius="sm">
          <IconBuilding size={18} />
        </ThemeIcon>
        <Box style={{ flex: 1 }}>
          <Group justify="space-between" align="center">
            <Text fw={700}>{site.name}</Text>
            {selected && (
              <ThemeIcon color="orange" radius="xl" size={18}>
                <IconCircleCheck size={14} />
              </ThemeIcon>
            )}
          </Group>
          <Text size="xs" c="dimmed" mt={2}>
            {site.addressLine}
          </Text>
          <Text size="xs" c="dimmed">
            {site.city}
          </Text>
          <Group gap={4} mt={4}>
            <IconPhone size={12} color="var(--mantine-color-gray-6)" />
            <Text size="xs" c="dimmed">
              555-123-4567
            </Text>
          </Group>
          {trailing && <Box mt={6}>{trailing}</Box>}
        </Box>
      </Group>
    </Card>
  );
}

function ServiceCard({
  svc,
  selected,
  onClick,
  dataTourId,
}: {
  svc: Service;
  selected: boolean;
  onClick: () => void;
  dataTourId?: string;
}) {
  const tags = SERVICE_TAGS[svc.id] ?? [];
  return (
    <Card
      withBorder
      radius="md"
      p={0}
      onClick={onClick}
      data-tour-service-card={dataTourId}
      style={{
        cursor: 'pointer',
        borderColor: selected ? 'var(--mantine-color-orange-6)' : undefined,
        borderWidth: selected ? 2 : 1,
        overflow: 'hidden',
        transition: 'border-color 120ms ease',
      }}
    >
      <Group gap={0} wrap="nowrap" align="stretch">
        <Box
          w={110}
          style={{
            background:
              'linear-gradient(135deg, var(--mantine-color-purple-9), var(--mantine-color-orange-6))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 700,
            letterSpacing: 1,
            flexShrink: 0,
          }}
        >
          <Text c="white" fw={700} size="xs" style={{ textTransform: 'uppercase' }}>
            {svc.name.split(' ')[0]}
          </Text>
        </Box>
        <Box p="md" style={{ flex: 1 }}>
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Box style={{ flex: 1 }}>
              <Group gap={6} align="center">
                <Text fw={700}>{svc.name}</Text>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                  }}
                  aria-label="Add"
                >
                  <IconPlus size={14} />
                </ActionIcon>
              </Group>
              <Group gap={4} my={4}>
                {tags.map((t) => (
                  <Badge key={t.label} color={t.color} variant="light" size="xs">
                    {t.label}
                  </Badge>
                ))}
              </Group>
              <Text size="xs" c="dimmed" lineClamp={2}>
                {svc.description}
              </Text>
              <Group gap={4} mt={6}>
                <IconClock size={12} color="var(--mantine-color-gray-6)" />
                <Text size="xs" c="dimmed">
                  {svc.durationMinutes}m
                </Text>
              </Group>
            </Box>
            <Text fw={700} c="dark">
              <PriceLabel cents={svc.priceCents} size="md" />
            </Text>
          </Group>
        </Box>
      </Group>
    </Card>
  );
}
