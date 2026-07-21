import { useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { fonts, radius, shadow, type AppColors } from '@/constants/theme';
import { useColors } from '@/context/ThemeContext';

type Option = { label: string; value: string };

export function Select({
  value,
  options,
  placeholder,
  onChange,
  compact,
}: {
  value: string;
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, compact && styles.triggerCompact]}>
        <Text
          numberOfLines={1}
          style={[
            styles.triggerText,
            compact && styles.triggerTextCompact,
            !selected && styles.placeholder,
          ]}>
          {selected ? selected.label : placeholder ?? '—'}
        </Text>
        <Feather name="chevron-down" size={compact ? 14 : 16} color={c.mutedText} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <ScrollView bounces={false}>
              {options.map((o) => {
                const active = o.value === value;
                return (
                  <Pressable
                    key={o.value}
                    style={styles.item}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}>
                    <Text style={[styles.itemText, active && styles.itemTextActive]}>{o.label}</Text>
                    {active && <Feather name="check" size={17} color={c.accent} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 42,
      paddingHorizontal: 10,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.divider,
      borderRadius: radius.md,
    },
    triggerCompact: { minHeight: 32, paddingVertical: 4, paddingHorizontal: 8 },
    triggerText: { fontFamily: fonts.regular, fontSize: 14, color: c.text, flex: 1 },
    triggerTextCompact: { fontSize: 12 },
    placeholder: { color: c.mutedText },
    backdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', padding: 24 },
    sheet: {
      maxHeight: '70%',
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.divider,
      paddingVertical: 6,
      ...shadow.lg,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 13,
      paddingHorizontal: 16,
    },
    itemText: { fontFamily: fonts.regular, fontSize: 15, color: c.text },
    itemTextActive: { fontFamily: fonts.heading, color: c.accent },
  });
