import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getAllSessions, getExercisesForSession, Session } from '../../lib/database';

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<(Session & { count: number })[]>([]);

  useFocusEffect(useCallback(() => {
    const all = getAllSessions().map(s => ({
      ...s,
      count: getExercisesForSession(s.id).length,
    }));
    setSessions(all);
  }, []));

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={s.title}>Historik</Text>
      {sessions.length === 0 && <Text style={s.empty}>Inga träningspass ännu.</Text>}
      {sessions.map(session => (
        <View key={session.id} style={s.card}>
          <Text style={s.date}>
            {new Date(session.date).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          <Text style={s.count}>{session.count} övningar</Text>
          {session.gym_name && <Text style={s.gym}>{session.gym_name}</Text>}
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0d13' },
  title:     { fontSize: 28, fontWeight: '800', color: '#dde3f0', padding: 24, paddingTop: 60, letterSpacing: -0.6 },
  empty:     { fontSize: 14, color: '#7a85a0', paddingHorizontal: 24 },
  card:      { backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 14, padding: 16, marginHorizontal: 16, marginBottom: 10 },
  date:      { fontSize: 15, fontWeight: '700', color: '#dde3f0', marginBottom: 4, textTransform: 'capitalize' },
  count:     { fontSize: 13, color: '#7a85a0' },
  gym:       { fontSize: 12, color: '#f04a18', marginTop: 2 },
});
