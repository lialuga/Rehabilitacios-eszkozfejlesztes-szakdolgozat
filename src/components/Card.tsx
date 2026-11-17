import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {Colors} from '../design/colors';
import {Radius} from '../design/spacing';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

export const Card = ({children, style, padded = true}: Props) => (
  <View style={[styles.card, padded && styles.padded, style]}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderStrong,
    overflow: 'hidden',
  },
  padded: {
    padding: 20,
  },
});
