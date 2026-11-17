import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Colors} from '../design/colors';

interface Props {
  label: string;
  value: string;
  valueColor?: string;
  last?: boolean;
}

export const StatRow = ({
  label,
  value,
  valueColor = Colors.textPrimary,
  last,
}: Props) => (
  <View style={[styles.row, !last && styles.divider]}>
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.value, {color: valueColor}]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderStrong,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 15,
    flex: 1,
    marginRight: 12,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
