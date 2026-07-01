import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { addExercise } from '../../lib/database';

export default function NewExerciseScreen() {
  const {
    sessionId, city,
    machineId, machineType, machineImagePath, machineConfidence, muscleGroup,
    weightKg, weightImagePath, weightConfidence,
    defaultSets, defaultReps,
  } = useLocalSearchParams<{
    sessionId: string; city?: string;
    machineId?: string; machineType?: string; machineImagePath?: string;
    machineConfidence?: string; muscleGroup?: string;
    weightKg?: string; weightImagePath?: string; weightConfidence?: string;
    defaultSets?: string; defaultReps?: string;
  }>();

  const [sets, setSets]     = useState(Number(defaultSets) || 3);
  const [reps, setReps]     = useState(Number(defaultReps) || 10);
  const [saving, setSaving] = useState(false);

  function save() {
    if (!machineType || !weightKg) return;
    setSaving(true);
    addExercise({
      session_id:         Number(sessionId),
      machine_id:         machineId ? Number(machineId) : null,
      machine_type:       machineType,
      machine_confidence: machineConfidence ? Number(machineConfidence) : null,
      machine_image_path: machineImagePath ?? null,
      muscle_group:       muscleGroup ?? null,
      weight_kg:          Number(weightKg),
      weight_confidence:  weightConfidence ? Number(weightConfidence) : null,
      weight_image_path:  weightImagePath ?? null,
      sets,
      reps,
      notes: null,
    });
    router.back();
  }

  const hasMachine = !!machineType;
  const hasWeight  = !!weightKg;
  const canSave    = hasMachine && hasWeight;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>Ny övning</Text>
      </View>

      {/* Maskin */}
      <Text style={s.sectionLabel}>MASKIN</Text>
      {!hasMachine ? (
        <View style={s.choiceRow}>
          <TouchableOpacity
            style={s.choiceBtn}
            onPress={() => router.push({ pathname: '/exercise/select-machine', params: { sessionId, city: city ?? '' } })}
          >
            <Text style={s.choiceIcon}>📋</Text>
            <Text style={s.choiceBtnText}>Välj från register</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.choiceBtn, s.choiceBtnAccent]}
            onPress={() => router.push({ pathname: '/exercise/scan-machine', params: { sessionId, city: city ?? '' } })}
          >
            <Text style={s.choiceIcon}>📷</Text>
            <Text style={[s.choiceBtnText, { color: '#fff' }]}>Skanna ny maskin</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[s.cameraCard, s.captured]}
          onPress={() => router.push({ pathname: '/exercise/select-machine', params: { sessionId, city: city ?? '' } })}
        >
          <View style={s.aiResult}>
            <Text style={{ fontSize: 28 }}>🏋️</Text>
            <View>
              <Text style={[s.aiLabel, { color: '#1ecfa4' }]}>
                {machineId ? 'FRÅN REGISTER' : 'AI-IDENTIFIERING'}
              </Text>
              <Text style={s.aiValue}>{machineType}</Text>
              {muscleGroup ? <Text style={s.aiConf}>{muscleGroup} · Tryck för att ändra</Text>
                           : <Text style={s.aiConf}>Tryck för att ändra</Text>}
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Vikt */}
      <Text style={s.sectionLabel}>VIKT</Text>
      <TouchableOpacity
        style={[s.cameraCard, hasWeight ? s.capturedGold : null]}
        onPress={() => router.push({
          pathname: '/exercise/scan-weight',
          params: {
            sessionId, city: city ?? '',
            machineId: machineId ?? '', machineType: machineType ?? '',
            machineImagePath: machineImagePath ?? '', machineConfidence: machineConfidence ?? '',
            muscleGroup: muscleGroup ?? '',
          },
        })}
      >
        {hasWeight ? (
          <View style={s.aiResult}>
            <Text style={{ fontSize: 28 }}>⚖️</Text>
            <View>
              <Text style={[s.aiLabel, { color: '#f5c842' }]}>AI-AVLÄSNING</Text>
              <Text style={s.aiValue}>{weightKg} kg</Text>
              <Text style={s.aiConf}>{weightConfidence}% · Tryck för att ändra</Text>
            </View>
          </View>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>⚖️</Text>
            <Text style={s.cameraText}>Ta foto på vikten</Text>
            <Text style={s.cameraHint}>AI läser av viktinställningen automatiskt</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Sets & Reps */}
      <Text style={s.sectionLabel}>SETS & REPS</Text>
      <View style={s.setsRow}>
        <View style={s.inputBlock}>
          <Text style={s.inputLabel}>Sets</Text>
          <View style={s.inputRow}>
            <TouchableOpacity style={s.stepBtn} onPress={() => setSets(Math.max(1, sets - 1))}><Text style={s.stepText}>−</Text></TouchableOpacity>
            <Text style={s.inputVal}>{sets}</Text>
            <TouchableOpacity style={s.stepBtn} onPress={() => setSets(sets + 1)}><Text style={s.stepText}>+</Text></TouchableOpacity>
          </View>
        </View>
        <View style={s.inputBlock}>
          <Text style={s.inputLabel}>Reps</Text>
          <View style={s.inputRow}>
            <TouchableOpacity style={s.stepBtn} onPress={() => setReps(Math.max(1, reps - 1))}><Text style={s.stepText}>−</Text></TouchableOpacity>
            <Text style={s.inputVal}>{reps}</Text>
            <TouchableOpacity style={s.stepBtn} onPress={() => setReps(reps + 1)}><Text style={s.stepText}>+</Text></TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity style={[s.saveBtn, !canSave && s.saveBtnDisabled]} onPress={save} disabled={!canSave || saving}>
        <Text style={s.saveBtnText}>{saving ? 'Sparar...' : '✓ Spara övning'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0b0d13' },
  header:          { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 24, paddingTop: 60 },
  backBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1c2030', alignItems: 'center', justifyContent: 'center' },
  backText:        { color: '#dde3f0', fontSize: 17 },
  title:           { fontSize: 22, fontWeight: '700', color: '#dde3f0', letterSpacing: -0.4 },
  sectionLabel:    { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#7a85a0', paddingHorizontal: 16, marginBottom: 10 },
  choiceRow:       { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 20 },
  choiceBtn:       { flex: 1, backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 16, alignItems: 'center', gap: 8 },
  choiceBtnAccent: { backgroundColor: '#f04a18', borderColor: '#f04a18' },
  choiceIcon:      { fontSize: 24 },
  choiceBtnText:   { fontSize: 13, fontWeight: '700', color: '#dde3f0', textAlign: 'center' },
  cameraCard:      { marginHorizontal: 16, marginBottom: 20, backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderStyle: 'dashed', borderRadius: 14, padding: 28, alignItems: 'center' },
  captured:        { borderStyle: 'solid', borderColor: '#1ecfa4', backgroundColor: '#0d2520', padding: 16, alignItems: 'flex-start' },
  capturedGold:    { borderStyle: 'solid', borderColor: '#f5c842', backgroundColor: '#2a2208', padding: 16, alignItems: 'flex-start' },
  aiResult:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiLabel:         { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  aiValue:         { fontSize: 17, fontWeight: '800', color: '#dde3f0' },
  aiConf:          { fontSize: 11, color: '#7a85a0', marginTop: 1 },
  cameraText:      { fontSize: 14, fontWeight: '600', color: '#dde3f0', marginBottom: 4 },
  cameraHint:      { fontSize: 12, color: '#7a85a0' },
  setsRow:         { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 20 },
  inputBlock:      { flex: 1 },
  inputLabel:      { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: '#7a85a0', marginBottom: 8 },
  inputRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 14 },
  inputVal:        { fontSize: 20, fontWeight: '800', color: '#dde3f0' },
  stepBtn:         { width: 28, height: 28, backgroundColor: '#242840', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stepText:        { color: '#dde3f0', fontSize: 16 },
  saveBtn:         { margin: 16, backgroundColor: '#f04a18', borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: '#3c2010' },
  saveBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
});
