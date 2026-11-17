import {TextStyle} from 'react-native';

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

export const Typography = {
  display: {
    fontSize: 56,
    fontWeight: '200' as const,
    letterSpacing: -1.5,
    fontVariant: tabular,
  },
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
  },
  overline: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  metric: {
    fontSize: 26,
    fontWeight: '300' as const,
    fontVariant: tabular,
  },
  tabular,
};
