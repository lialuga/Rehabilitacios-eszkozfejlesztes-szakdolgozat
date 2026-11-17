import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Svg, {Circle} from 'react-native-svg';
import {Colors} from '../design/colors';

interface Props {
  size: number;
  strokeWidth: number;
  progress: number;
  color?: string;
  label?: string;
  caption?: string;
}

export const CircularProgress: React.FC<Props> = ({
  size,
  strokeWidth,
  progress,
  color = Colors.primary,
  label,
  caption,
}) => {
  const clamped = Math.max(0, Math.min(100, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <View style={{width: size, height: size}}>
      <Svg width={size} height={size}>
        <Circle
          stroke={Colors.surfaceHighlight}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.label, {fontSize: size * 0.26}]}>
          {label ?? `${Math.round(clamped)}`}
        </Text>
        {!!caption && <Text style={styles.caption}>{caption}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: Colors.textPrimary,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
  },
  caption: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: -2,
  },
});
