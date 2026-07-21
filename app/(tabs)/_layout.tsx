import { Tabs } from 'expo-router';

import { MoTabBar } from '@/components/ui/MoTabBar';
import { useColors } from '@/context/ThemeContext';

export default function TabLayout() {
  const c = useColors();
  return (
    <Tabs
      tabBar={(props) => <MoTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: c.bg },
      }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="converts" />
      <Tabs.Screen name="suivi" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
