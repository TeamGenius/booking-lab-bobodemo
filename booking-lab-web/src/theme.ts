import type { MantineColorsTuple } from '@mantine/core';
import { createTheme } from '@mantine/core';

export const BRAND_PURPLE = '#400186';
export const BRAND_MIDNIGHT_BLUE = '#201547';
export const BRAND_ORANGE = '#FF6900';
export const BRAND_VIOLET = '#87037B';
export const BRAND_YELLOW = '#FFB600';
export const BACKGROUND_GRAY = '#f5f5f5';

const orange: MantineColorsTuple = [
  '#fff1e2',
  '#ffe2cc',
  '#ffc59b',
  '#ffa464',
  '#fe8837',
  '#fe771a',
  BRAND_ORANGE,
  '#e45c00',
  '#cb5200',
  '#b14400',
];

const purple: MantineColorsTuple = [
  '#f4ebff',
  '#e5d1fb',
  '#c99ef8',
  '#ad69f7',
  '#943cf6',
  '#8523f5',
  '#7e17f6',
  '#6c0edb',
  '#6008c4',
  BRAND_PURPLE,
];

const midnightBlue: MantineColorsTuple = [
  '#f1eefb',
  '#ded9f1',
  '#b9afe5',
  '#9482da',
  '#745dd1',
  '#5f45cc',
  '#5639ca',
  '#462cb3',
  '#3e27a0',
  BRAND_MIDNIGHT_BLUE,
];

export const theme = createTheme({
  primaryColor: 'purple',
  fontFamily:
    '"Gellix", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  headings: {
    fontFamily:
      '"Gellix", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWeight: '600',
  },
  colors: {
    orange,
    purple,
    midnightBlue,
  },
  defaultGradient: { from: BRAND_PURPLE, to: BRAND_VIOLET, deg: 20 },
  defaultRadius: 'md',
});
