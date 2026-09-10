import {
  ActionIcon,
  Alert,
  Box,
  Card,
  Center,
  Collapse,
  Divider,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconArrowNarrowLeft,
  IconArrowNarrowRight,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { BRAND_MIDNIGHT_BLUE, BRAND_ORANGE, BRAND_PURPLE } from "../theme";

export type TimeSelectSlot = { id: string; startsAt: string };

type Props = {
  slots: TimeSelectSlot[];
  loading?: boolean;
  selectedSlotId: string | null;
  onSelect: (slotId: string) => void;
  /** Rendered as the centered divider heading. */
  label?: string;
  /** Drives the "Estimated Visit Duration" sub-label. */
  durationMinutes?: number | null;
  /** When set, renders the fasting cut-off alert. */
  fastingCutoffTime?: string | null;
  /** IANA zone of the site; when it differs from the viewer, a secondary time is shown. */
  siteTimeZone?: string;
};

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function fmtWeekRange(range: Date[]) {
  const first = range[0];
  const last = range[range.length - 1];
  if (!first || !last) return "";
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${first.toLocaleDateString(undefined, opts)} - ${last.toLocaleDateString(undefined, opts)}`;
}

function fmtDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function TimeSelect({
  slots,
  loading = false,
  selectedSlotId,
  onSelect,
  label = "Date and Time",
  durationMinutes,
  fastingCutoffTime,
  siteTimeZone,
}: Props) {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const [dayOverride, setDayOverride] = useState<Date | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, TimeSelectSlot[]>();
    slots.forEach((slot) => {
      const key = dayKey(new Date(slot.startsAt));
      const arr = map.get(key) ?? [];
      arr.push(slot);
      map.set(key, arr);
    });
    map.forEach((arr) =>
      arr.sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      ),
    );
    return map;
  }, [slots]);

  // Default to the first day that actually has availability.
  const firstAvailableDay = useMemo(() => {
    if (slots.length === 0) return null;
    const earliest = slots.reduce((min, s) =>
      new Date(s.startsAt).getTime() < new Date(min.startsAt).getTime()
        ? s
        : min,
    );
    return startOfDay(new Date(earliest.startsAt));
  }, [slots]);

  const [today] = useState(() => startOfDay(new Date()));
  const baseDay = firstAvailableDay ?? today;
  const selectedDay = dayOverride ?? baseDay;
  const weekStart = addDays(baseDay, weekOffset * 7);

  const week = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const daySlots = slotsByDay.get(dayKey(selectedDay)) ?? [];
  const atFirstWeek = startOfDay(weekStart).getTime() <= today.getTime();
  const viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const showSecondary =
    Boolean(siteTimeZone) && siteTimeZone !== viewerTimeZone;

  return (
    <Stack gap="md">
      <Box>
        <Box py="xl">
          <Divider
            labelPosition="center"
            label={label}
            styles={{
              label: {
                fontSize: isMobile ? "1.1rem" : "1.5rem",
                fontWeight: 700,
                color: BRAND_MIDNIGHT_BLUE,
              },
            }}
          />
          {durationMinutes ? (
            <Title order={isMobile ? 6 : 5} fw="normal" ta="center" mt="xs">
              Estimated Visit Duration: {fmtDuration(durationMinutes)}
            </Title>
          ) : null}
        </Box>
      </Box>

      {fastingCutoffTime ? (
        <Center>
          <Alert
            variant="outline"
            icon={<IconAlertCircle size={18} />}
            pr={40}
            title={`Assessments requiring fasting must be booked before ${fastingCutoffTime}`}
            styles={{ title: { color: "var(--mantine-color-gray-6)" } }}
          />
        </Center>
      ) : null}

      <Stack align="center" justify="center">
        <Group>
          <ActionIcon
            size="lg"
            radius="xl"
            variant="transparent"
            color="gray.6"
            opacity={atFirstWeek ? 0 : 1}
            disabled={atFirstWeek}
            aria-label="Previous week"
            onClick={() => setWeekOffset((o) => o - 1)}
          >
            <IconArrowNarrowLeft size={36} />
          </ActionIcon>
          <Title order={4}>{fmtWeekRange(week)}</Title>
          <ActionIcon
            size="lg"
            radius="xl"
            variant="transparent"
            color="gray.6"
            aria-label="Next week"
            onClick={() => setWeekOffset((o) => o + 1)}
          >
            <IconArrowNarrowRight size={36} />
          </ActionIcon>
        </Group>

        <Group gap="xs">
          {week.map((d) => {
            const key = dayKey(d);
            const isSelected = key === dayKey(selectedDay);
            const hasAvailability = slotsByDay.has(key);
            return (
              <Stack key={key} gap={2} align="center">
                <Text size="xs">
                  {d.toLocaleDateString(undefined, { weekday: "short" })}
                </Text>
                <ActionIcon
                  variant="default"
                  radius="xl"
                  size={isMobile ? "lg" : "xl"}
                  bg={isSelected ? BRAND_PURPLE : undefined}
                  disabled={!hasAvailability && !loading}
                  data-tour-date={key}
                  aria-label={d.toLocaleDateString()}
                  onClick={() => setDayOverride(d)}
                >
                  <Text size="sm" c={isSelected ? "#ffffff" : undefined}>
                    {d.getDate()}
                  </Text>
                </ActionIcon>
              </Stack>
            );
          })}
        </Group>

        <Stack align="center" w="100%">
          {loading ? (
            <Box>
              <Title order={4} pb="md" ta="center">
                Searching Available Times ...
              </Title>
              <Center mt="xl">
                <Loader color={BRAND_ORANGE} />
              </Center>
            </Box>
          ) : (
            <Title order={4} pb="md" ta="center">
              Available Times
            </Title>
          )}

          <Collapse in={!loading} w="100%">
            {daySlots.length === 0 ? (
              <Center pb="md">
                <Text c="dimmed" size="sm">
                  No available times for this day.
                </Text>
              </Center>
            ) : (
              <SimpleGrid
                cols={{ base: 2, md: 3 }}
                px="md"
                pb="md"
                display="flex"
                style={{
                  overflow: "visible",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
                data-tour="slot-grid"
              >
                {daySlots.map((slot) => (
                  <TimeSelectSlotCard
                    key={slot.id}
                    slot={slot}
                    selected={selectedSlotId === slot.id}
                    secondaryTimeZone={showSecondary ? siteTimeZone : undefined}
                    onClick={() => onSelect(slot.id)}
                  />
                ))}
              </SimpleGrid>
            )}
          </Collapse>
        </Stack>
      </Stack>
    </Stack>
  );
}

function TimeSelectSlotCard({
  slot,
  selected,
  secondaryTimeZone,
  onClick,
}: {
  slot: TimeSelectSlot;
  selected: boolean;
  secondaryTimeZone?: string;
  onClick: () => void;
}) {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [hovered, setHovered] = useState(false);
  const startsAt = new Date(slot.startsAt);
  const primary = startsAt.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const secondary = secondaryTimeZone
    ? startsAt.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        timeZone: secondaryTimeZone,
        timeZoneName: "short",
      })
    : null;

  const boxShadow = selected
    ? `0px 0px 6px ${BRAND_PURPLE}`
    : hovered
      ? `0px 0px 20px ${BRAND_MIDNIGHT_BLUE}`
      : `0px 0px 0px ${BRAND_PURPLE}`;

  return (
    <Card
      radius="md"
      p={0}
      data-tour-slot={slot.id}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        cursor: "pointer",
        boxShadow,
        transform:
          hovered && !selected && !reduceMotion ? "scale(1.01)" : undefined,
        transition: "box-shadow 0.15s ease-in-out, transform 0.15s ease-in-out",
      }}
    >
      <Card radius="md" withBorder={!selected} py="xs">
        <Box w={225} maw="100%">
          <Center>
            <Text size="sm" fw={600}>
              {primary}
            </Text>
            {secondary ? (
              <Text size="sm" ml="xs" c="dimmed">
                ({secondary})
              </Text>
            ) : null}
          </Center>
        </Box>
      </Card>
    </Card>
  );
}
