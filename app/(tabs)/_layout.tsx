import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useTranslation } from '../../lib/i18n';

const ACCENT = '#f04a18';
const MUTED  = '#7a85a0';
const BG     = '#141720';
const BORDER = '#22273a';

export default function TabLayout() {
  const t = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: MUTED,
        tabBarStyle: { backgroundColor: BG, borderTopColor: BORDER, height: 82, paddingBottom: 16 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tab_session'), tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏃</Text> }}
      />
      <Tabs.Screen
        name="machines"
        options={{ title: t('tab_machines'), tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏋️</Text> }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: t('tab_history'), tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📊</Text> }}
      />
      <Tabs.Screen
        name="program"
        options={{ title: t('tab_program'), tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📋</Text> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tab_profile'), tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text> }}
      />
    </Tabs>
  );
}
