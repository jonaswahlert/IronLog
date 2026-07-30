import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { addExercise, endSession, getMachineImageByName } from '../../lib/database';
import { ProgramExercise } from '../../lib/claude';

type ExState = { weight: string; sets: string; reps: string; saved: boolean };

// ── Muscle visual helpers ──────────────────────────────────────
const MUSCLE_MAP: { keywords: string[]; color: string; bg: string; icon: string; label: string }[] = [
  { keywords: ['bröst','chest','bänk','bench','press','pec','fly'],          color: '#f04a18', bg: 'rgba(240,74,24,.13)',   icon: '🏋️',  label: 'Bröst' },
  { keywords: ['rygg','back','drag','row','lat','kabel','pulldown','seated'], color: '#1ecfa4', bg: 'rgba(30,207,164,.13)', icon: '🤸',  label: 'Rygg' },
  { keywords: ['ben','leg','knä','squat','lunge','lunges','press','calf'],    color: '#4a8af0', bg: 'rgba(74,138,240,.13)', icon: '🦵',  label: 'Ben' },
  { keywords: ['axel','shoulder','deltoid','ohp','press'],                    color: '#e6c41a', bg: 'rgba(230,196,26,.13)', icon: '💪',  label: 'Axlar' },
  { keywords: ['bicep','curl','arm','tricep','dip','extension'],              color: '#c43de6', bg: 'rgba(196,61,230,.13)', icon: '💪',  label: 'Armar' },
  { keywords: ['mage','core','abs','plank','crunch','twist'],                 color: '#1ecfa4', bg: 'rgba(30,207,164,.13)', icon: '🧘',  label: 'Core' },
  { keywords: ['kondition','cardio','löp','cykel','cross','elliptical'],      color: '#a04af0', bg: 'rgba(160,74,240,.13)', icon: '🏃',  label: 'Kondition' },
  { keywords: ['hamstring','glute','rumpa','deadlift','marklyft','hip'],       color: '#4a8af0', bg: 'rgba(74,138,240,.13)', icon: '🦵',  label: 'Baksida ben' },
];
const DEFAULT_VISUAL = { color: '#7a85a0', bg: 'rgba(120,133,160,.13)', icon: '🏋️', label: 'Övning' };

function getMuscleVisual(exerciseName: string, muscleGroup?: string) {
  const haystack = ((exerciseName ?? '') + ' ' + (muscleGroup ?? '')).toLowerCase();
  return MUSCLE_MAP.find(m => m.keywords.some(kw => haystack.includes(kw))) ?? DEFAULT_VISUAL;
}

// ── Exercise visual card (image or illustration) ───────────────
function ExVisual({ imagePath, exerciseName, muscleGroup }: {
  imagePath: string | null;
  exerciseName: string;
  muscleGroup?: string;
}) {
  const v = getMuscleVisual(exerciseName, muscleGroup);

  if (imagePath) {
    return (
      <View style={iv.wrapper}>
        <Image source={{ uri: imagePath }} style={iv.photo} resizeMode="cover" />
        <View style={[iv.badge, { backgroundColor: v.color }]}>
          <Text style={iv.badgeText}>{v.label}</Text>
        </View>
      </View>
    );
  }

  // Illustrated fallback
  return (
    <View style={[iv.wrapper, iv.illustration, { backgroundColor: v.bg, borderColor: v.color + '44' }]}>
      <Text style={iv.icon}>{v.icon}</Text>
      <View style={[iv.muscleLine, { backgroundColor: v.color }]} />
      <Text style={[iv.muscleLabel, { color: v.color }]}>{v.label.toUpperCase()}</Text>
    </View>
  );
}

const iv = StyleSheet.create({
  wrapper:       { width: 90, height: 90, borderRadius: 14, overflow: 'hidden', flexShrink: 0 },
  photo:         { width: '100%', height: '100%' },
  badge:         { position: 'absolute', bottom: 4, left: 4, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  badgeText:     { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  illustration:  { alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1.5 },
  icon:          { fontSize: 32 },
  muscleLine:    { width: 28, height: 2, borderRadius: 1 },
  muscleLabel:   { fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
});

// ── Main screen ────────────────────────────────────────────────
export default function LiveSessionScreen() {
  const { sessionId, exercises: exJson, dayName, dayType, muscles } =
    useLocalSearchParams<{ sessionId: string; exercises: string; dayName: string; dayType: string; muscles: string }>();

  const [exercises] = useState<ProgramExercise[]>(() => {
    try { return JSON.parse(exJson ?? '[]'); } catch { return []; }
  });
  const sid = parseInt(sessionId ?? '0');

  const [states, setStates] = useState<ExState[]>(() =>
    exercises.map(ex => ({ weight: '', sets: String(ex.sets), reps: String(ex.reps), saved: false }))
  );
  const [images, setImages] = useState<(string | null)[]>([]);

  useEffect(() => {
    setImages(exercises.map(ex => getMachineImageByName(ex.name)));
  }, []);

  function update(i: number, field: keyof ExState, value: string | boolean) {
    setStates(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }

  function saveExercise(i: number) {
    const st = states[i];
    const ex = exercises[i];
    if (!st || !ex) return;
    const muscleLabel = getMuscleVisual(ex.name, muscles).label;
    addExercise({
      session_id:          sid,
      machine_id:          null,
      machine_type:        ex.name,
      machine_confidence:  null,
      machine_image_path:  images[i] ?? null,
      muscle_group:        muscleLabel !== 'Övning' ? muscleLabel : (muscles || null),
      weight_kg:           parseFloat(st.weight) || null,
      weight_confidence:   null,
      weight_image_path:   null,
      sets:                parseInt(st.sets) || null,
      reps:                parseInt(st.reps) || null,
      notes:               null,
    });
    update(i, 'saved', true);
  }

  function finish() {
    endSession(sid);
    router.replace('/(tabs)/');
  }

  const savedCount = states.filter(s => s.saved).length;
  const allDone    = savedCount === exercises.length;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={s.container}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Text style={s.backText}>←</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.dayLabel}>{dayName?.toUpperCase()}</Text>
              <Text style={s.dayType}>{dayType}</Text>
              {muscles ? <Text style={s.muscles}>{muscles}</Text> : null}
            </View>
          </View>
          <View style={s.progressRow}>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: `${exercises.length ? (savedCount / exercises.length) * 100 : 0}%` as any }]} />
            </View>
            <Text style={s.progressText}>{savedCount}/{exercises.length}</Text>
          </View>
        </View>

        {/* Exercise list */}
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {exercises.length === 0 && (
            <View style={{ padding: 32, alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 32 }}>⚠️</Text>
              <Text style={{ color: '#dde3f0', fontSize: 16, fontWeight: '700', textAlign: 'center' }}>Inga övningar laddade</Text>
              <Text style={{ color: '#7a85a0', fontSize: 13, textAlign: 'center' }}>Gå tillbaka och starta passet igen</Text>
            </View>
          )}
          {exercises.map((ex, i) => {
            const st  = states[i] ?? { weight: '', sets: String(ex.sets), reps: String(ex.reps), saved: false };
            const img = images[i] ?? null;
            const v   = getMuscleVisual(ex.name, muscles);

            return (
              <View key={i} style={[s.exCard, st.saved && s.exCardDone]}>
                {/* Top row: visual + name/meta */}
                <View style={s.exTopRow}>
                  <ExVisual imagePath={img} exerciseName={ex.name} muscleGroup={muscles} />
                  <View style={s.exInfo}>
                    <View style={s.exNumRow}>
                      <View style={[s.exNum, st.saved && s.exNumDone]}>
                        <Text style={s.exNumText}>{st.saved ? '✓' : i + 1}</Text>
                      </View>
                      <Text style={[s.exName, st.saved && s.exNameDone]} numberOfLines={2}>{ex.name}</Text>
                    </View>
                    <Text style={s.exTarget}>{ex.sets} set × {ex.reps} reps  ·  {ex.restSec}s vila</Text>
                    <View style={[s.muscleTag, { backgroundColor: v.bg, borderColor: v.color + '55' }]}>
                      <Text style={[s.muscleTagText, { color: v.color }]}>{v.label}</Text>
                    </View>
                  </View>
                </View>

                {!!ex.tip && <Text style={s.tip}>💡 {ex.tip}</Text>}

                {/* Inputs */}
                <View style={s.inputsRow}>
                  <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>VIKT (kg)</Text>
                    <TextInput
                      style={s.input}
                      value={st.weight}
                      onChangeText={v => update(i, 'weight', v)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#3c4560"
                    />
                  </View>
                  <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>SET</Text>
                    <TextInput
                      style={s.input}
                      value={st.sets}
                      onChangeText={v => update(i, 'sets', v)}
                      keyboardType="number-pad"
                      placeholder="3"
                      placeholderTextColor="#3c4560"
                    />
                  </View>
                  <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>REPS</Text>
                    <TextInput
                      style={s.input}
                      value={st.reps}
                      onChangeText={v => update(i, 'reps', v)}
                      keyboardType="number-pad"
                      placeholder="10"
                      placeholderTextColor="#3c4560"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[s.saveBtn, st.saved && s.saveBtnDone]}
                  onPress={() => saveExercise(i)}
                >
                  <Text style={[s.saveBtnText, st.saved && s.saveBtnTextDone]}>
                    {st.saved ? '✓ Sparad — tryck för att uppdatera' : 'Spara övning'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>

        {/* Bottom bar */}
        <View style={s.bottomBar}>
          <TouchableOpacity
            style={[s.finishBtn, allDone && s.finishBtnReady]}
            onPress={finish}
          >
            <Text style={[s.finishText, allDone && s.finishTextReady]}>
              {allDone ? '🏁  Avsluta passet' : `Avsluta passet  (${savedCount}/${exercises.length} klarade)`}
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

const ACCENT = '#f04a18';
const TEAL   = '#1ecfa4';

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0b0d13' },
  header:          { padding: 24, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#22273a' },
  headerTop:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  backBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1c2030', alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 },
  backText:        { color: '#dde3f0', fontSize: 17 },
  dayLabel:        { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: '#7a85a0', marginBottom: 4 },
  dayType:         { fontSize: 22, fontWeight: '800', color: '#dde3f0', letterSpacing: -0.4, marginBottom: 2 },
  muscles:         { fontSize: 13, color: '#7a85a0', marginBottom: 4 },
  progressRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBar:     { flex: 1, height: 4, backgroundColor: '#22273a', borderRadius: 2, overflow: 'hidden' },
  progressFill:    { height: 4, backgroundColor: ACCENT, borderRadius: 2 },
  progressText:    { fontSize: 12, fontWeight: '700', color: ACCENT },
  exCard:          { backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 18, padding: 14, marginHorizontal: 14, marginTop: 12 },
  exCardDone:      { borderColor: TEAL, backgroundColor: 'rgba(30,207,164,.04)' },
  exTopRow:        { flexDirection: 'row', gap: 12, marginBottom: 12 },
  exInfo:          { flex: 1, justifyContent: 'center', gap: 6 },
  exNumRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  exNum:           { width: 22, height: 22, borderRadius: 11, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  exNumDone:       { backgroundColor: TEAL },
  exNumText:       { color: '#fff', fontSize: 10, fontWeight: '800' },
  exName:          { fontSize: 15, fontWeight: '700', color: '#dde3f0', flex: 1, lineHeight: 20 },
  exNameDone:      { color: '#1ecfa4' },
  exTarget:        { fontSize: 12, color: '#7a85a0' },
  muscleTag:       { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  muscleTagText:   { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  tip:             { fontSize: 12, color: 'rgba(30,207,164,.8)', marginBottom: 12, lineHeight: 17 },
  inputsRow:       { flexDirection: 'row', gap: 8, marginBottom: 12 },
  inputGroup:      { flex: 1 },
  inputLabel:      { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: '#7a85a0', marginBottom: 6 },
  input:           { backgroundColor: '#0b0d13', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 10, padding: 10, fontSize: 20, fontWeight: '800', color: '#dde3f0', textAlign: 'center' },
  saveBtn:         { backgroundColor: ACCENT, borderRadius: 12, padding: 13, alignItems: 'center' },
  saveBtnDone:     { backgroundColor: 'rgba(30,207,164,.12)', borderWidth: 1.5, borderColor: TEAL },
  saveBtnText:     { color: '#fff', fontSize: 14, fontWeight: '700' },
  saveBtnTextDone: { color: TEAL },
  bottomBar:       { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 36, backgroundColor: '#0b0d13', borderTopWidth: 1, borderTopColor: '#22273a' },
  finishBtn:       { backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 15, alignItems: 'center' },
  finishBtnReady:  { backgroundColor: ACCENT, borderColor: ACCENT },
  finishText:      { color: '#7a85a0', fontSize: 15, fontWeight: '600' },
  finishTextReady: { color: '#fff' },
});
