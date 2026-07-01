import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { addExercise } from '../../lib/database';

export default function NewExerciseScreen() {
  const {
    sessionId, machineType, machineImagePath, machineConfidence,
    weightKg, weightImagePath, weightConfidence,
  } = useLocalSearchParams<{
    sessionId: string;
    machineType?: string;
    machineImagePath?: string;
    machineConfidence?: string;
    weightKg?: string;
    weightImagePath?: string;
    weightConfidence?: string;
  }>();

  const [sets, setSets]   = useState(3);
  const [reps, setReps]   = useState(10);
  const [saving, setSaving] = useState(false);

  function save() {
    if (!machineType || !weightKg) return;
    setSaving(true);
    addExercise({
      session_id:         Number(sessionId),
      machine_type:       machineType,
      machine_confidence: machineConfidence ? Number(machineConfidence) : null,
      machine_image_path: machineImagePath ?? null,
      muscle_groups:      null,
      weight_kg:          Number(weightKg),
      weight_confidence:  weightConfidence ? Number(weightConfidence) : null,
      weight_image_path:  weightImagePath ?? null,
      sets,
      reps,
      notes: null,
    });
    router.back();
  }

  const canSave = !!machineType && !!weightKg;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>Ny övning</Text>
      </View>

      <Text style={s.sectionLabel}>FOTOGRAFERA MASKINEN</Text>
      <TouchableOpacity
        style={[s.cameraCard, machineType ? s.captured : null]}
        onPress={() => router.push({ pathname: '/exercise/scan-machine', params: { sessionId } })}
      >
        {machineType ? (
          <View style={s.aiResult}>
            <Text style={{ fontSize: 28 }}>🏋️</Text>
            <View>
              <Text style={[s.aiLabel, { color: '#1ecfa4' }]}>AI-IDENTIFIERING</Text>
              <Text style={s.aiValue}>{machineType}</Text>
              <Text style={s.aiConf}>{machineConfidence}% · Tryck för att ändra</Text>
            </View>
          </View>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>📷</Text>
            <Text style={s.cameraText}>Ta foto på maskinen</Text>
            <Text style={s.cameraHint}>AI identifierar maskintyp automatiskt</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={s.sectionLabel}>FOTOGRAFERA VIKTEN</Text>
      <TouchableOpacity
        style={[s.cameraCard, weightKg ? s.capturedGold : null]}
        onPress={() => router.push({
          pathname: '/exercise/scan-weight',
          params: { sessionId, machineType: machineType ?? '', machineImagePath: machineImagePath ?? '', machineConfidence: machineConfidence ?? '' },
        })}
      >
        {weightKg ? (
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
