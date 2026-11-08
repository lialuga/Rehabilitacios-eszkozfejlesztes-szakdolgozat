import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Colors} from '../design/colors';
import {Typography} from '../design/typography';

interface Props {
  overline?: string;
  title: string;
  right?: React.ReactNode;
}

export const ScreenHeader = ({overline, title, right}: Props) => (
  <View style={styles.row}>
    <View style={styles.texts}>
      {!!overline && <Text style={styles.overline}>{overline}</Text>}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </View>
    {right}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginBottom: 20,
  },
  texts: {
    flex: 1,
    marginRight: 12,
  },
  overline: {
    ...Typography.overline,
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  title: {
    ...Typography.h1,
    color: Colors.textPrimary,
  },
});
