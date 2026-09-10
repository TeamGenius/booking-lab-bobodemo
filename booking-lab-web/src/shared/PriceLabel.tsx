import { Text } from '@mantine/core';

type Props = {
  cents: number | null | undefined;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fw?: number;
};

export function PriceLabel({ cents, size = 'md', fw = 700 }: Props) {
  if (cents == null) return <Text size={size}>—</Text>;
  return (
    <Text size={size} fw={fw}>
      ${(cents / 100).toFixed(2)}
    </Text>
  );
}
