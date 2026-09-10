import { Badge, Tooltip } from '@mantine/core';

const REQUIREMENT_HELP = {
  'LP-2112':
    'Jira epic for Booking on Behalf of Others (BOBO), including gift purchase, claim, and recipient scheduling flows.',
  'FR-6':
    'The recipient can see the included assessments, but cannot remove or change the purchaser-defined bundle.',
  'FR-7':
    'Pricing is hidden throughout the recipient claim and scheduling experience.',
  'FR-8':
    'Post-visit surveys and follow-up communication go to the recipient who attended, not the purchaser.',
  'FR-9':
    'The purchaser remains the payment owner even when the recipient becomes the booking owner and attendee.',
} as const;

type RequirementCode = keyof typeof REQUIREMENT_HELP;

export function RequirementRef({ code }: { code: RequirementCode }) {
  const description = REQUIREMENT_HELP[code];

  return (
    <Tooltip
      label={`${code}: ${description}`}
      multiline
      w={340}
      withArrow
      openDelay={80}
      color="dark"
      transitionProps={{ duration: 120 }}
    >
      <Badge
        component="span"
        color="purple"
        variant="light"
        size="xs"
        radius="sm"
        tabIndex={0}
        aria-label={`${code}: ${description}`}
        style={{ cursor: 'help', verticalAlign: 'middle' }}
      >
        {code}
      </Badge>
    </Tooltip>
  );
}