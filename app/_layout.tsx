import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from '../lib/database';

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0b0d13' } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="exercise/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="exercise/scan-machine" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="exercise/scan-weight" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
    </>
  );
}
