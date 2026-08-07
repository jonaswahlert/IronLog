import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { getAllSessions, getExercisesForSession, deleteSession, getCities, getLastCity, Session } from '../../lib/database';
import { useTranslation } from '../../lib/i18n';
import { LanguageToggle } from '../../components/LanguageToggle';

export default function HistoryScreen() {
  const t = useTranslation();
  const [sessions, setSessions] = useState<(Session & { count: number })[]>([]);
  const [cities, setCities]     = useState<string[]>([]);
  const [activeCity, setActiveCity] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    const all = getAllSessions().map(s => ({
      ...s,
      count: getExercisesForSession(s.id).length,
    }));
    setSessions(all);
    const cs = getCities();
    setCities(cs);
    const last = getLastCity();
    setActiveCity(prev => prev ?? (last && cs.includes(last) ? last : null));
  }, []));

  function handleDelete(id: number) {
    Alert.alert(t('confirm_delete'), t('cannot_undo'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'), style: 'destructive',
        onPress: () => {
          deleteSession(id);
          setSessions(prev => prev.filter(s => s.id !== id));
        },
      },
    ]);
  }

  const filtered = activeCity ? sessions.filter(s => s.city === activeCity) : sessions;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={s.headerRow}>
        <Text style={s.title}>{t('history_title')}</Text>
        <LanguageToggle />
      </View>

      {cities.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          <TouchableOpacity style={[s.chip, !activeCity && s.chipActive]} onPress={() => setActiveCity(null)}>
            <Text style={[s.chipText, !activeCity && s.chipTextActive]}>{t('all_cities')}</Text>
          </TouchableOpacity>
          {cities.map(c => (
            <TouchableOpacity key={c} style={[s.chip, activeCity === c && s.chipActive]} onPress={() => setActiveCity(c)}>
              <Text style={[s.chipText, activeCity === c && s.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {filtered.length === 0 && <Text style={s.empty}>{t('no_sessions')}</Text>}

      {filtered.map(session => (
        <TouchableOpacity
          key={session.id}
          style={s.card}
          onPress={() => router.push({ pathname: '/session/[id]', params: { id: String(session.id) } })}
        >
          <View style={s.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.date}>
                {new Date(session.date).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
              <Text style={s.count}>{session.count} {t('exercises_word')}</Text>
              {(session.city || session.gym) && (
                <Text style={s.gym}>
                  {[session.city, session.gym].filter(Boolean).join('  ·  ')}
                </Text>
              )}
            </View>
            <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(session.id)}>
              <Text style={s.deleteText}>✕</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0b0d13' },
  headerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8 },
  title:          { fontSize: 28, fontWeight: '800', color: '#dde3f0', letterSpacing: -0.6 },
  chipRow:        { marginBottom: 14 },
  chip:           { backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 7 },
  chipActive:     { backgroundColor: '#f04a18', borderColor: '#f04a18' },
  chipText:       { fontSize: 13, fontWeight: '600', color: '#7a85a0' },
  chipTextActive: { color: '#fff' },
  empty:          { fontSize: 14, color: '#7a85a0', paddingHorizontal: 24, paddingTop: 16 },
  card:           { backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 14, padding: 16, marginHorizontal: 16, marginBottom: 10 },
  cardTop:        { flexDirection: 'row', alignItems: 'flex-start' },
  date:           { fontSize: 15, fontWeight: '700', color: '#dde3f0', marginBottom: 4, textTransform: 'capitalize' },
  count:          { fontSize: 13, color: '#7a85a0' },
  gym:            { fontSize: 12, color: '#f04a18', marginTop: 2 },
  deleteBtn:      { width: 28, height: 28, borderRadius: 14, backgroundColor: '#2a1010', alignItems: 'center', justifyContent: 'center' },
  deleteText:     { color: '#f04a18', fontSize: 12, fontWeight: '700' },
});
