import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Colors} from '../design/colors';
import {Radius} from '../design/spacing';
import {Typography} from '../design/typography';
import {Icon, IconName} from './Icon';

interface Props {
  icon: IconName;
  tint: string;
  label: string;
  value: string;
  unit?: string;
  valueColor?: string;
  caption?: string;
  progress?: number;
  onPress?: () => void;
}

export const MetricTile = ({
  icon,
  tint,
  label,
  value,
  unit,
  valueColor = Colors.textPrimary,
  caption,
  progress,
  onPress,
}: Props) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}
    style={({pressed}) => [styles.tile, pressed && styles.pressed]}>
    <View style={styles.top}>
      <View style={[styles.iconWrap, {backgroundColor: `${tint}24`}]}>
        <Icon name={icon} size={16} color={tint} />
      </View>
      <Icon name="chevronRight" size={16} color={Colors.textTertiary} />
    </View>

    <View style={styles.valueRow}>
      <Text
        style={[styles.value, {color: valueColor}]}
        numberOfLines={1}
        adjustsFontSizeToFit>
        {value}
      </Text>
      {!!unit && <Text style={styles.unit}>{unit}</Text>}
    </View>

    <Text style={styles.label} numberOfLines={1}>
      {label}
    </Text>

    {progress !== undefined ? (
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.max(0, Math.min(100, progress))}%`,
              backgroundColor: valueColor,
            },
          ]}
        />
      </View>
    ) : (
      !!caption && (
        <Text style={styles.caption} numberOfLines={1}>
          {caption}
        </Text>
      )
    )}
  </Pressable>
);

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderStrong,
    padding: 16,
    minHeight: 136,
  },
  pressed: {
    backgroundColor: Colors.surfaceElevated,
    transform: [{scale: 0.98}],
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    ...Typography.metric,
  },
  unit: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginLeft: 3,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  caption: {
    color: Colors.textTertiary,
    fontSize: 12,
    marginTop: 8,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceHighlight,
    marginTop: 10,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
});
