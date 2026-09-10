import type { Service, Site, Slot } from './types';

export const sites: Site[] = [
  {
    id: 'site-mpls',
    name: 'Human Powered Health — Minneapolis',
    city: 'Minneapolis, MN',
    addressLine: '2311 University Ave SE',
  },
  {
    id: 'site-den',
    name: 'Human Powered Health — Denver',
    city: 'Denver, CO',
    addressLine: '1435 Wynkoop St',
  },
];

export const services: Service[] = [
  {
    id: 'svc-vo2',
    siteId: 'site-mpls',
    name: 'VO2 Max Test',
    description:
      'A gold-standard measurement of your aerobic capacity — the single best predictor of endurance performance.',
    priceCents: 25000,
    durationMinutes: 60,
  },
  {
    id: 'svc-dxa',
    siteId: 'site-mpls',
    name: 'DXA Body Composition',
    description:
      'Whole-body scan for lean mass, fat mass and bone density — the reference method used in clinical research.',
    priceCents: 18500,
    durationMinutes: 30,
  },
  {
    id: 'svc-rmr',
    siteId: 'site-mpls',
    name: 'Resting Metabolic Rate',
    description:
      'How many calories your body burns at rest. Foundation of any evidence-based nutrition plan.',
    priceCents: 14500,
    durationMinutes: 45,
  },
  {
    id: 'svc-vo2-den',
    siteId: 'site-den',
    name: 'VO2 Max Test',
    description:
      'A gold-standard measurement of your aerobic capacity — the single best predictor of endurance performance.',
    priceCents: 25000,
    durationMinutes: 60,
  },
  {
    id: 'svc-lactate-den',
    siteId: 'site-den',
    name: 'Lactate Threshold Test',
    description:
      'Pinpoints the exact intensity where fatigue starts to accumulate. Dial in your training zones.',
    priceCents: 22000,
    durationMinutes: 75,
  },
];

// Generates a week of 8am-4pm hourly slots per service per site.
export function generateSlots(daysAhead = 10): Slot[] {
  const slots: Slot[] = [];
  const now = new Date();
  const employees = ['Dr. Sarah Kim', 'Dr. Marcus Reyes', 'Coach Anna Patel'];

  services.forEach((svc) => {
    for (let d = 1; d <= daysAhead; d++) {
      const day = new Date(now);
      day.setDate(day.getDate() + d);
      // Skip weekends for realism
      const dow = day.getDay();
      if (dow === 0 || dow === 6) continue;
      for (let h = 8; h < 16; h++) {
        const start = new Date(day);
        start.setHours(h, 0, 0, 0);
        slots.push({
          id: `slot-${svc.id}-${start.toISOString()}`,
          serviceId: svc.id,
          startsAt: start.toISOString(),
          employeeName: employees[(h + d) % employees.length]!,
        });
      }
    }
  });

  return slots;
}
