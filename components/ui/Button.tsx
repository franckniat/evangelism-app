import { useMemo } from 'react';
import { Feather } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { fonts, radius, type AppColors } from '@/constants/theme';
import { useColors } from '@/context/ThemeContext';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

type Props = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: FeatherName;
  iconRight?: FeatherName;
  block?: boolean;
  disabled?: boolean;
  loading?: boolean;
  height?: number;
  align?: 'center' | 'flex-start';
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  iconRight,
  block,
  disabled,
  loading,
  height,
  align = 'center',
  style,
}: Props) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const fg = variant === 'primary' ? c.onAccent : variant === 'ghost' ? c.accent : c.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        block && styles.block,
        { justifyContent: align },
        height != null && { height, paddingVertical: 0 },
        (disabled || loading) && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={[styles.content, { justifyContent: iconRight ? 'flex-start' : align }]}>
          {icon && <Feather name={icon} size={17} color={fg} />}
          <Text style={[styles.label, { color: fg }]}>{title}</Text>
          {iconRight && <View style={styles.spacer} />}
          {iconRight && <Feather name={iconRight} size={17} color={fg} />}
        </View>
      )}
    </Pressable>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    content: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    spacer: { flex: 1 },
    primary: { backgroundColor: c.accent },
    secondary: { borderColor: c.divider },
    ghost: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: radius.md },
    block: { width: '100%' },
    disabled: { opacity: 0.45 },
    pressed: { opacity: 0.85 },
    label: { fontFamily: fonts.heading, fontSize: 14 },
  });
