import React, {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export const PulseDot = ({
  color,
  active = true,
  size = 8,
}: {
  color: string;
  active?: boolean;
  size?: number;
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (active) {
      progress.value = 0;
      progress.value = withRepeat(withTiming(1, {duration: 1400}), -1, false);
    } else {
      cancelAnimation(progress);
      progress.value = 0;
    }
  }, [active, progress]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: active ? 0.55 * (1 - progress.value) : 0,
    transform: [{scale: 1 + progress.value * 1.6}],
  }));

  const dot = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
  };

  return (
    <View style={[styles.wrap, {width: size, height: size}]}>
      <Animated.View style={[StyleSheet.absoluteFill, dot, ringStyle]} />
      <View style={dot} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
