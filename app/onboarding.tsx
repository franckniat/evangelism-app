import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { fonts, radius, type AppColors } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/context/ThemeContext';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

export default function OnboardingScreen() {
  const { t, markIntroSeen } = useApp();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  const slides: { icon: FeatherName; title: string; text: string }[] = [
    { icon: 'map-pin', title: t.onb1_title, text: t.onb1_text },
    { icon: 'calendar', title: t.onb2_title, text: t.onb2_text },
  ];
  const last = page === slides.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / width);
    if (p !== page) setPage(p);
  };

  const goRegister = () => {
    markIntroSeen();
    router.replace('/register');
  };
  const goLogin = () => {
    markIntroSeen();
    router.replace('/login');
  };
  const next = () => {
    if (last) goRegister();
    else scrollRef.current?.scrollTo({ x: width * (page + 1), animated: true });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Feather name="plus" size={16} color={c.onAccent} />
          </View>
          <Text style={styles.brand}>MOISSON</Text>
        </View>
        <Pressable onPress={goLogin} hitSlop={8}>
          <Text style={styles.skip}>{t.onb_skip}</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}>
        {slides.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View style={styles.illus}>
              <Feather name={s.icon} size={64} color={c.accent} />
            </View>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.text}>{s.text}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
        <Button
          title={last ? t.onb_start : t.onb_next}
          iconRight="chevron-right"
          block
          height={48}
          onPress={next}
        />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    brandIcon: {
      width: 30,
      height: 30,
      borderRadius: radius.md,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brand: { fontFamily: fonts.heading, fontSize: 17, letterSpacing: -0.3, color: c.text },
    skip: { fontFamily: fonts.semibold, fontSize: 14, color: c.mutedText },
    slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    illus: {
      width: 140,
      height: 140,
      borderRadius: 999,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 40,
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: 26,
      color: c.text,
      textAlign: 'center',
      marginBottom: 12,
    },
    text: {
      fontFamily: fonts.regular,
      fontSize: 15,
      color: c.mutedText,
      textAlign: 'center',
      lineHeight: 22,
    },
    footer: { paddingHorizontal: 24, paddingBottom: 8, gap: 20 },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 7 },
    dot: { width: 7, height: 7, borderRadius: 999, backgroundColor: c.dotInactive },
    dotActive: { width: 22, backgroundColor: c.accent },
  });
