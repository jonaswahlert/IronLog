import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

type Exercise = {
  id: string;
  machine_type: string;
  weight_kg: number;
  sets: number;
  reps: number;
};

type Session = {
  id: string;
  date: string;
  gym_name: string | null;
  started_at: string;
  exercises: Exercise[];
};

export default function SessionScreen() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    loadTodaySession();
  }, []);

  async function loadTodaySession() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('sessions')
      .select('*, exercises(*)')
      .eq('date', today)
      .maybeSingle();
    setSession(data);
  }

  async function startSession() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('sessions')
      .insert({ date: today, started_at: new Date().toISOString() })
      .select()
      .single();
    if (data) setSession({ ...data, exercises: [] });
  }

  const exercises: Exercise[] = session?.exercises ?? [];
  const totalSets = exercises.reduce((s, e) => s + (e.sets ?? 0), 0);
  const elapsed = session
    ? Math.floor((Date.now() - new Date(session.started_at).getTime()) / 60000)
    : 0;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={s.header}>
        <View style={s.chip}>
          <Text style={s.chipDot}>●</Text>
          <Text style={s.chipText}>
            {new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'short' })}
          </Text>
        </View>
        <Text style={s.title}>Träningspass</Text>
        {session && <Text style={s.sub}>Startade {new Date(session.started_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</Text>}
      </View>

      {session && (
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={[s.statVal, { color: '#f04a18' }]}>{exercises.length}</Text>
            <Text style={s.statLbl}>ÖVNINGAR</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statVal}>{totalSets}</Text>
            <Text style={s.statLbl}>SET TOTALT</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statVal, { color: '#1ecfa4' }]}>{elapsed}m</Text>
            <Text style={s.statLbl}>TID</Text>
          </View>
        </View>
      )}

      {exercises.length > 0 && (
        <>
          <Text style={s.sectionLabel}>GENOMFÖRDA ÖVNINGAR</Text>
          {exercises.map(ex => (
            <View key={ex.id} style={s.exCard}>
              <View style={s.exThumb}>
                <Text style={{ fontSize: 22 }}>🏋️</Text>
                <View style={s.aiBadge}><Text style={s.aiBadgeText}>AI</Text></View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.exName}>{ex.machine_type ?? 'Okänd maskin'}</Text>
                <Text style={s.exMeta}>{ex.sets} set · {ex.reps} reps</Text>
              </View>
              <View style={s.weightBadge}>
                <Text style={s.weightText}>{ex.weight_kg} kg</Text>
              </View>
            </View>
          ))}
        </>
      )}

      {!session ? (
        <TouchableOpacity style={s.addBtn} onPress={startSession}>
          <Text style={s.addBtnText}>Starta träningspass</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={s.addBtn} onPress={() => router.push({ pathname: '/exercise/new', params: { sessionId: session.id } })}>
          <Text style={s.addBtnText}>+ Lägg till övning</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0b0d13' },
  header:       { padding: 24, paddingTop: 60 },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 16 },
  chipDot:      { color: '#1ecfa4', fontSize: 10 },
  chipText:     { color: '#7a85a0', fontSize: 12, fontWeight: '600' },
  title:        { fontSize: 28, fontWeight: '800', color: '#dde3f0', letterSpacing: -0.6 },
  sub:          { fontSize: 13, color: '#7a85a0', marginTop: 4 },
  statsRow:     { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 28 },
  statCard:     { flex: 1, backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 14, padding: 14, alignItems: 'center' },
  statVal:      { fontSize: 22, fontWeight: '800', color: '#dde3f0' },
  statLbl:      { fontSize: 10, color: '#7a85a0', fontWeight: '600', letterSpacing: 0.6, marginTop: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#7a85a0', paddingHorizontal: 24, marginBottom: 12 },
  exCard:       { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 10 },
  exThumb:      { width: 52, height: 52, borderRadius: 10, backgroundColor: '#242840', alignItems: 'center', justifyContent: 'center' },
  aiBadge:      { position: 'absolute', bottom: 2, right: 2, backgroundColor: '#1ecfa4', borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1 },
  aiBadgeText:  { fontSize: 7, fontWeight: '800', color: '#000' },
  exName:       { fontSize: 15, fontWeight: '700', color: '#dde3f0', marginBottom: 4 },
  exMeta:       { fontSize: 12, color: '#7a85a0' },
  weightBadge:  { backgroundColor: '#2b1510', borderWidth: 1, borderColor: '#f04a18', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  weightText:   { fontSize: 13, fontWeight: '800', color: '#f04a18' },
  addBtn:       { margin: 16, backgroundColor: '#f04a18', borderRadius: 14, padding: 16, alignItems: 'center' },
  addBtnText:   { color: '#fff', fontSize: 16, fontWeight: '700' },
});
