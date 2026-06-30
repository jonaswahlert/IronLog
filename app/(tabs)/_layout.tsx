import { Tabs } from 'expo-router';
import { Text } from 'react-native';

const ACCENT = '#f04a18';
const MUTED  = '#7a85a0';
const BG     = '#141720';
const BORDER = '#22273a';

export default function TabLayout() {
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
        options={{ title: 'Pass', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏃</Text> }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'Historik', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📊</Text> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profil', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text> }}
      />
    </Tabs>
  );
}
