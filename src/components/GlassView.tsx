import React from 'react';
import {
  Platform,
  StyleProp,
  View,
  ViewStyle,
  requireNativeComponent,
} from 'react-native';

interface NativeProps {
  style?: StyleProp<ViewStyle>;
  pointerEvents?: 'none' | 'auto' | 'box-none' | 'box-only';
  glassStyle?: 'regular' | 'clear';
  cornerRadius?: number;
  isInteractive?: boolean;
  tintColorHex?: string;
}

const NativeLiquidGlassView =
  Platform.OS === 'ios'
    ? requireNativeComponent<NativeProps>('LiquidGlassView')
    : null;

const hexToRgba = (hex = '141A26CC') => {
  const h = hex.replace('#', '');
  const channel = (i: number) => parseInt(h.slice(i, i + 2), 16);
  const alpha = h.length === 8 ? channel(6) / 255 : 1;
  return `rgba(${channel(0)},${channel(2)},${channel(4)},${alpha.toFixed(3)})`;
};

export const GlassView = (props: NativeProps) =>
  NativeLiquidGlassView ? (
    <NativeLiquidGlassView
      pointerEvents="none"
      isInteractive={false}
      {...props}
    />
  ) : (
    <View
      pointerEvents="none"
      style={[
        props.style,
        {
          backgroundColor: hexToRgba(props.tintColorHex),
          borderRadius: props.cornerRadius,
        },
      ]}
    />
  );
