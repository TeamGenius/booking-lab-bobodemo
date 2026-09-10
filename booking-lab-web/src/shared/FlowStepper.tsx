import { Group, Stepper as MStepper } from '@mantine/core';

type Props = {
  active: number;
  isGift: boolean;
};

export function FlowStepper({ active, isGift }: Props) {
  return (
    <Group justify="center" py="md">
      <MStepper
        active={active}
        color="orange"
        size="sm"
        allowNextStepsSelect={false}
        style={{ minWidth: 620, maxWidth: 780, width: '100%' }}
      >
        <MStepper.Step label="Service" description="Site + service" />
        {!isGift && <MStepper.Step label="Schedule" description="Pick a time" />}
        <MStepper.Step label="Review" description="Details + payment" />
        <MStepper.Step label="Confirmation" description="Done" />
      </MStepper>
    </Group>
  );
}
