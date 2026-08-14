import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { fonts, radius } from '@/constants/theme';
import { useColors } from '@/context/ThemeContext';

export function Avatar({
  initials,
  uri,
  size = 40,
  bg,
  fg,
  fontSize,
}: {
  initials: string;
  uri?: string | null;
  size?: number;
  bg?: string;
  fg?: string;
  fontSize?: number;
}) {
  const c = useColors();
  const dim = { width: size, height: size, borderRadius: radius.md };
  if (uri) {
    return <Image source={{ uri }} style={dim} contentFit="cover" />;
  }
  return (
    <View style={[styles.box, dim, { backgroundColor: bg ?? c.avatarBg }]}>
      <Text style={[styles.txt, { color: fg ?? c.avatarFg, fontSize: fontSize ?? size * 0.36 }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  txt: { fontFamily: fonts.heading },
});
