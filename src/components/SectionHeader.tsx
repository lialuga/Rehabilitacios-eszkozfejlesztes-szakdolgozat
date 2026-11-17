import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Colors} from '../design/colors';
import {Typography} from '../design/typography';

export const SectionHeader = ({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) => (
  <View style={styles.row}>
    <Text style={styles.title}>{title}</Text>
    {right}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  title: {
    ...Typography.overline,
    color: Colors.textSecondary,
  },
});
