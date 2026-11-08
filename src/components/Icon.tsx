import React from 'react';
import Svg, {Circle, Path, Rect} from 'react-native-svg';

export type IconName =
  | 'activity'
  | 'clock'
  | 'sliders'
  | 'bluetooth'
  | 'battery'
  | 'play'
  | 'pause'
  | 'stop'
  | 'chevronRight'
  | 'close'
  | 'trash'
  | 'target'
  | 'zap'
  | 'scale'
  | 'arrowInward'
  | 'arrowOutward'
  | 'footprints'
  | 'cloud'
  | 'timer'
  | 'peak'
  | 'info'
  | 'globe'
  | 'sparkles'
  | 'refresh'
  | 'minus'
  | 'plus'
  | 'check'
  | 'alert';

interface Props {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
  /** 0-100, only used by the battery icon. */
  level?: number;
}

/**
 * 24×24 stroke icons.
 * Sources:
 *  - Feather Icons (MIT), https://github.com/feathericons/feather :
 *    activity, sliders, bluetooth, chevron-right, x (close), trash-2, zap,
 *    arrow-down-left (arrowInward), arrow-up-right (arrowOutward), cloud,
 *    trending-up (peak), globe, refresh-cw, minus, plus, check; clock, target,
 *    info, alert-circle and battery are simplified from the Feather shapes.
 *  - Lucide (ISC), https://lucide.dev/icons/footprints : footprints.
 *  - scale, sparkles, timer: drawn for this app in the same style.
 */
const paths: Partial<Record<IconName, string>> = {
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  sliders:
    'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  bluetooth: 'M6.5 6.5l11 11L12 23V1l5.5 5.5-11 11',
  chevronRight: 'M9 18l6-6-6-6',
  close: 'M18 6L6 18M6 6l12 12',
  trash:
    'M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2',
  zap: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  scale:
    'M12 3v17M7 21h10M4 7h16M7 7l-3 7c0 1.66 1.34 3 3 3s3-1.34 3-3L7 7M17 7l-3 7c0 1.66 1.34 3 3 3s3-1.34 3-3l-3-7',
  arrowInward: 'M17 7L7 17M17 17H7V7',
  arrowOutward: 'M7 17L17 7M7 7h10v10',
  cloud: 'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z',
  footprints:
    'M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0ZM20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0ZM16 17h4M4 13h4',
  peak: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
  globe:
    'M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
  sparkles:
    'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z',
  refresh:
    'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  minus: 'M5 12h14',
  plus: 'M12 5v14M5 12h14',
  check: 'M20 6L9 17l-5-5',
};

export const Icon = ({
  name,
  size = 20,
  color,
  strokeWidth = 1.9,
  level = 100,
}: Props) => {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  const content = (() => {
    switch (name) {
      case 'clock':
        return (
          <>
            <Circle cx={12} cy={12} r={9.5} {...common} />
            <Path d="M12 7v5l3 2" {...common} />
          </>
        );
      case 'timer':
        return (
          <>
            <Circle cx={12} cy={13.5} r={8} {...common} />
            <Path d="M12 9.5v4l2.5 2M9.5 2.5h5" {...common} />
          </>
        );
      case 'target':
        return (
          <>
            <Circle cx={12} cy={12} r={9.5} {...common} />
            <Circle cx={12} cy={12} r={5.5} {...common} />
            <Circle cx={12} cy={12} r={1.5} fill={color} />
          </>
        );
      case 'info':
      case 'alert':
        return (
          <>
            <Circle cx={12} cy={12} r={9.5} {...common} />
            <Path
              d={
                name === 'info' ? 'M12 16v-4.5M12 8h.01' : 'M12 7.5v5M12 16h.01'
              }
              {...common}
            />
          </>
        );
      case 'globe':
        return (
          <>
            <Circle cx={12} cy={12} r={10} {...common} />
            <Path d={paths.globe!} {...common} />
          </>
        );
      case 'battery': {
        const clamped = Math.max(0, Math.min(100, level));
        return (
          <>
            <Rect x={2} y={7} width={18} height={10} rx={2.5} {...common} />
            <Path d="M22.5 11v2" {...common} />
            <Rect
              x={4}
              y={9}
              width={Math.max(1, (14 * clamped) / 100)}
              height={6}
              rx={1}
              fill={color}
            />
          </>
        );
      }
      case 'play':
        return (
          <Path
            d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"
            fill={color}
          />
        );
      case 'pause':
        return (
          <>
            <Rect x={6} y={4} width={4} height={16} rx={1.2} fill={color} />
            <Rect x={14} y={4} width={4} height={16} rx={1.2} fill={color} />
          </>
        );
      case 'stop':
        return <Rect x={5} y={5} width={14} height={14} rx={3} fill={color} />;
      default:
        return <Path d={paths[name] ?? ''} {...common} />;
    }
  })();

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {content}
    </Svg>
  );
};
