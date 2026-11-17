import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Colors} from '../design/colors';
import {Gradients} from '../design/gradients';
import {Radius} from '../design/spacing';
import {Icon, IconName} from './Icon';

type Variant = 'primary' | 'session' | 'secondary' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

const gradientFor: Partial<Record<Variant, string[]>> = {
  primary: Gradients.primary,
  session: Gradients.session,
};

const textColor: Record<Variant, string> = {
  primary: Colors.textPrimary,
  session: '#04211D',
  secondary: Colors.textPrimary,
  ghost: Colors.textSecondary,
  danger: Colors.danger,
};

export const Button = ({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  compact,
  style,
  accessibilityHint,
}: Props) => {
  const gradient = gradientFor[variant];
  const color = textColor[variant];
  const inactive = disabled || loading;

  const content = (
    <View style={[styles.inner, compact && styles.innerCompact]}>
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        !!icon && <Icon name={icon} size={compact ? 16 : 18} color={color} />
      )}
      <Text
        style={[
          styles.label,
          compact && styles.labelCompact,
          {color},
          (loading || !!icon) && styles.labelWithIcon,
        ]}
        numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{disabled: !!inactive, busy: !!loading}}
      hitSlop={6}
      style={({pressed}) => [
        styles.base,
        compact && styles.baseCompact,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      {gradient ? (
        <LinearGradient
          colors={gradient}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.gradient}>
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    minHeight: 52,
    justifyContent: 'center',
  },
  baseCompact: {
    minHeight: 38,
    borderRadius: Radius.md,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  innerCompact: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  labelCompact: {
    fontSize: 14,
  },
  labelWithIcon: {
    marginLeft: 8,
  },
  secondary: {
    backgroundColor: Colors.surfaceHighlight,
  },
  danger: {
    backgroundColor: Colors.dangerSoft,
  },
  pressed: {
    opacity: 0.82,
    transform: [{scale: 0.985}],
  },
  disabled: {
    opacity: 0.4,
  },
});
