import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Modal } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  getTodaySession, createSession, getExercisesForSession,
  getLastCity, getLastGym, Session, Exercise,
} from '../../lib/database';
import { GYM_CHAINS } from '../../lib/gyms';

export default function SessionScreen() {
  const [session, setSession]             = useState<Session | null>(null);
  const [exercises, setExercises]         = useState<Exercise[]>([]);
  const [showCityModal, setShowCityModal] = useState(false);
  const [city, setCity]                   = useState('');
  const [gym, setGym]                     = useState('');
  const [customGym, setCustomGym]         = useState('');
  const [showCustomGym, setShowCustomGym] = useState(false);

  useFocusEffect(useCallback(() => {
    const s = getTodaySession();
    setSession(s);
    setExercises(s ? getExercisesForSession(s.id) : []);
  }, []));

  function handleStart() {
    const lastCity = getLastCity() ?? '';
    setCity(lastCity);
    setGym(lastCity ? (getLastGym(lastCity) ?? '') : '');
    setCustomGym('');
    setShowCustomGym(false);
    setShowCityModal(true);
  }

  function selectGymChip(name: string) {
    setGym(name);
    setShowCustomGym(false);
    setCustomGym('');
  }

  function selectAnnat() {
    setGym('');
    setShowCustomGym(true);
  }

  function confirmStart() {
    const finalGym = showCustomGym ? customGym.trim() : gym;
    const s = createSession(city.trim() || undefined, finalGym || undefined);
    setSession(s);
    setExercises([]);
    setShowCityModal(false);
    setCity('');
    setGym('');
    setCustomGym('');
    setShowCustomGym(false);
  }

  const totalSets = exercises.reduce((sum, e) => sum + (e.sets ?? 0), 0);
  const elapsed   = session
    ? Math.floor((Date.now() - new Date(session.started_at).getTime()) / 60000)
    : 0;

  const activeGym = showCustomGym ? '' : gym;

  return (
    <>
      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={s.header}>
          <View style={s.chip}>
            <Text style={s.chipDot}>●</Text>
            <Text style={s.chipText}>
              {new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'short' })}
            </Text>
          </View>
          <Text style={s.title}>Träningspass</Text>
          {session && (
            <Text style={s.sub}>
              Startade {new Date(session.started_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
              {session.city ? `  ·  ${session.city}` : ''}
              {session.gym  ? `  ·  ${session.gym}`  : ''}
            </Text>
          )}
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
                  <Text style={s.exName} numberOfLines={1}>{ex.machine_type ?? 'Okänd maskin'}</Text>
                  <Text style={s.exMeta}>{ex.sets} set · {ex.reps} reps{ex.muscle_group ? `  ·  ${ex.muscle_group}` : ''}</Text>
                </View>
                <View style={s.weightBadge}>
                  <Text style={s.weightText}>{ex.weight_kg} kg</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {!session ? (
          <TouchableOpacity style={s.addBtn} onPress={handleStart}>
            <Text style={s.addBtnText}>Starta träningspass</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => router.push({
              pathname: '/exercise/new',
              params: { sessionId: String(session.id), city: session.city ?? '', gym: session.gym ?? '' },
            })}
          >
            <Text style={s.addBtnText}>+ Lägg till övning</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Stadsmodal */}
      <Modal visible={showCityModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Var tränar du idag?</Text>

            <Text style={s.fieldLabel}>STAD</Text>
            <TextInput
              style={s.input}
              placeholder="Stad, t.ex. Stockholm"
              placeholderTextColor="#7a85a0"
              value={city}
              onChangeText={setCity}
              autoFocus
            />

            <Text style={s.fieldLabel}>GYM (VALFRITT)</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
              style={{ marginBottom: 12 }}
            >
              {GYM_CHAINS.map(name => (
                <TouchableOpacity
                  key={name}
                  style={[s.gymChip, activeGym === name && s.gymChipActive]}
                  onPress={() => selectGymChip(name)}
                >
                  <Text style={[s.gymChipText, activeGym === name && s.gymChipTextActive]}>{name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[s.gymChip, showCustomGym && s.gymChipActive]}
                onPress={selectAnnat}
              >
                <Text style={[s.gymChipText, showCustomGym && s.gymChipTextActive]}>Annat gym...</Text>
              </TouchableOpacity>
            </ScrollView>

            {showCustomGym && (
              <TextInput
                style={[s.input, { marginBottom: 16 }]}
                placeholder="Skriv gymnamn"
                placeholderTextColor="#7a85a0"
                value={customGym}
                onChangeText={setCustomGym}
              />
            )}

            <TouchableOpacity style={s.modalBtn} onPress={confirmStart}>
              <Text style={s.modalBtnText}>Starta pass</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalSkip} onPress={() => { setCity(''); setGym(''); setShowCustomGym(false); confirmStart(); }}>
              <Text style={s.modalSkipText}>Hoppa över</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#0b0d13' },
  header:            { padding: 24, paddingTop: 60 },
  chip:              { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 16 },
  chipDot:           { color: '#1ecfa4', fontSize: 10 },
  chipText:          { color: '#7a85a0', fontSize: 12, fontWeight: '600' },
  title:             { fontSize: 28, fontWeight: '800', color: '#dde3f0', letterSpacing: -0.6 },
  sub:               { fontSize: 13, color: '#7a85a0', marginTop: 4 },
  statsRow:          { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 28 },
  statCard:          { flex: 1, backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 14, padding: 14, alignItems: 'center' },
  statVal:           { fontSize: 22, fontWeight: '800', color: '#dde3f0' },
  statLbl:           { fontSize: 10, color: '#7a85a0', fontWeight: '600', letterSpacing: 0.6, marginTop: 2 },
  sectionLabel:      { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#7a85a0', paddingHorizontal: 24, marginBottom: 12 },
  exCard:            { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 10 },
  exThumb:           { width: 52, height: 52, borderRadius: 10, backgroundColor: '#242840', alignItems: 'center', justifyContent: 'center' },
  aiBadge:           { position: 'absolute', bottom: 2, right: 2, backgroundColor: '#1ecfa4', borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1 },
  aiBadgeText:       { fontSize: 7, fontWeight: '800', color: '#000' },
  exName:            { fontSize: 15, fontWeight: '700', color: '#dde3f0', marginBottom: 4 },
  exMeta:            { fontSize: 12, color: '#7a85a0' },
  weightBadge:       { backgroundColor: '#2b1510', borderWidth: 1, borderColor: '#f04a18', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  weightText:        { fontSize: 13, fontWeight: '800', color: '#f04a18' },
  addBtn:            { margin: 16, backgroundColor: '#f04a18', borderRadius: 14, padding: 16, alignItems: 'center' },
  addBtnText:        { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard:         { backgroundColor: '#141720', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 48 },
  modalTitle:        { fontSize: 22, fontWeight: '800', color: '#dde3f0', marginBottom: 20, letterSpacing: -0.4 },
  fieldLabel:        { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: '#7a85a0', marginBottom: 8 },
  input:             { backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 16, fontSize: 17, color: '#dde3f0', marginBottom: 16 },
  gymChip:           { backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8 },
  gymChipActive:     { backgroundColor: '#f04a18', borderColor: '#f04a18' },
  gymChipText:       { fontSize: 13, fontWeight: '600', color: '#7a85a0' },
  gymChipTextActive: { color: '#fff' },
  modalBtn:          { backgroundColor: '#f04a18', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 },
  modalBtnText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalSkip:         { alignItems: 'center', padding: 8 },
  modalSkipText:     { color: '#7a85a0', fontSize: 14 },
});
