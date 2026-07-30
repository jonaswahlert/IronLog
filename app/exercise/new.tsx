import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { addExercise } from '../../lib/database';
import { useTranslation } from '../../lib/i18n';
import { LanguageToggle } from '../../components/LanguageToggle';

export default function NewExerciseScreen() {
  const t = useTranslation();
  const {
    sessionId, city, gym,
    machineId, machineType, machineImagePath, machineConfidence, muscleGroup,
    weightKg, weightImagePath, weightConfidence,
    defaultSets, defaultReps,
  } = useLocalSearchParams<{
    sessionId: string; city?: string; gym?: string;
    machineId?: string; machineType?: string; machineImagePath?: string;
    machineConfidence?: string; muscleGroup?: string;
    weightKg?: string; weightImagePath?: string; weightConfidence?: string;
    defaultSets?: string; defaultReps?: string;
  }>();

  const [machineInput, setMachineInput] = useState(machineType ?? '');
  const [weightInput, setWeightInput]   = useState(weightKg ?? '');
  const [setsInput, setSetsInput]       = useState(String(Number(defaultSets) || 3));
  const [repsInput, setRepsInput]       = useState(String(Number(defaultReps) || 10));
  const [saving, setSaving]             = useState(false);

  const fromRegistry = !!machineId;
  const scannedMachine = !fromRegistry && !!machineType;

  function save() {
    if (!machineInput.trim() || !weightInput.trim()) return;
    setSaving(true);
    addExercise({
      session_id:         Number(sessionId),
      machine_id:         machineId ? Number(machineId) : null,
      machine_type:       machineInput.trim(),
      machine_confidence: machineConfidence ? Number(machineConfidence) : null,
      machine_image_path: machineImagePath ?? null,
      muscle_group:       muscleGroup ?? null,
      weight_kg:          parseFloat(weightInput) || 0,
      weight_confidence:  weightConfidence ? Number(weightConfidence) : null,
      weight_image_path:  weightImagePath ?? null,
      sets:               parseInt(setsInput) || 3,
      reps:               parseInt(repsInput) || 10,
      notes:              null,
    });
    router.replace('/(tabs)/');
  }

  const canSave = machineInput.trim() !== '' && weightInput.trim() !== '';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>{t('new_exercise')}</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/')} style={s.homeBtn}>
          <Text style={s.homeText}>🏠</Text>
        </TouchableOpacity>
        <LanguageToggle />
      </View>

      {/* Machine section */}
      <Text style={s.sectionLabel}>{t('machine')}</Text>
      <View style={s.inputCard}>
        <TextInput
          style={s.bigInput}
          placeholder={t('enter_machine_name')}
          placeholderTextColor="#7a85a0"
          value={machineInput}
          onChangeText={setMachineInput}
        />
        {fromRegistry && <Text style={s.sourceBadge}>📋 {t('from_registry')}</Text>}
        {scannedMachine && <Text style={s.sourceBadge}>📷 {t('ai_identification')}</Text>}
      </View>
      <View style={s.choiceRow}>
        <TouchableOpacity
          style={s.choiceBtn}
          onPress={() => router.push({ pathname: '/exercise/select-machine', params: { sessionId, city: city ?? '', gym: gym ?? '' } })}
        >
          <Text style={s.choiceIcon}>📋</Text>
          <Text style={s.choiceBtnText}>{t('select_from_list')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.choiceBtn, s.choiceBtnAccent]}
          onPress={() => router.push({ pathname: '/exercise/scan-machine', params: { sessionId, city: city ?? '', gym: gym ?? '' } })}
        >
          <Text style={s.choiceIcon}>📷</Text>
          <Text style={[s.choiceBtnText, { color: '#fff' }]}>{t('scan_new_machine')}</Text>
        </TouchableOpacity>
      </View>

      {/* Weight section */}
      <Text style={s.sectionLabel}>{t('weight')} (kg)</Text>
      <View style={s.inputCard}>
        <TextInput
          style={s.bigInput}
          placeholder="0"
          placeholderTextColor="#7a85a0"
          value={weightInput}
          onChangeText={setWeightInput}
          keyboardType="decimal-pad"
        />
        {weightConfidence && <Text style={s.sourceBadge}>📷 AI · {weightConfidence}%</Text>}
      </View>
      <TouchableOpacity
        style={s.cameraBtn}
        onPress={() => router.push({
          pathname: '/exercise/scan-weight',
          params: {
            sessionId, city: city ?? '', gym: gym ?? '',
            machineId: machineId ?? '', machineType: machineInput,
            machineImagePath: machineImagePath ?? '', machineConfidence: machineConfidence ?? '',
            muscleGroup: muscleGroup ?? '',
          },
        })}
      >
        <Text style={s.cameraBtnText}>📷 {t('take_weight_photo')}</Text>
      </TouchableOpacity>

      {/* Sets & Reps */}
      <Text style={s.sectionLabel}>SETS & REPS</Text>
      <View style={s.setsRow}>
        <View style={s.inputBlock}>
          <Text style={s.inputLabel}>SETS</Text>
          <View style={s.stepRow}>
            <TouchableOpacity style={s.stepBtn} onPress={() => setSetsInput(String(Math.max(1, parseInt(setsInput || '1') - 1)))}>
              <Text style={s.stepText}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={s.stepInput}
              value={setsInput}
              onChangeText={setSetsInput}
              keyboardType="number-pad"
              textAlign="center"
            />
            <TouchableOpacity style={s.stepBtn} onPress={() => setSetsInput(String(parseInt(setsInput || '0') + 1))}>
              <Text style={s.stepText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={s.inputBlock}>
          <Text style={s.inputLabel}>REPS</Text>
          <View style={s.stepRow}>
            <TouchableOpacity style={s.stepBtn} onPress={() => setRepsInput(String(Math.max(1, parseInt(repsInput || '1') - 1)))}>
              <Text style={s.stepText}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={s.stepInput}
              value={repsInput}
              onChangeText={setRepsInput}
              keyboardType="number-pad"
              textAlign="center"
            />
            <TouchableOpacity style={s.stepBtn} onPress={() => setRepsInput(String(parseInt(repsInput || '0') + 1))}>
              <Text style={s.stepText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity style={[s.saveBtn, !canSave && s.saveBtnDisabled]} onPress={save} disabled={!canSave || saving}>
        <Text style={s.saveBtnText}>{saving ? t('saving') : t('save_exercise')}</Text>
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0b0d13' },
  header:          { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 24, paddingTop: 60 },
  backBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1c2030', alignItems: 'center', justifyContent: 'center' },
  backText:        { color: '#dde3f0', fontSize: 17 },
  homeBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1c2030', alignItems: 'center', justifyContent: 'center' },
  homeText:        { fontSize: 18 },
  title:           { fontSize: 20, fontWeight: '700', color: '#dde3f0', letterSpacing: -0.4, flex: 1 },
  sectionLabel:    { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#7a85a0', paddingHorizontal: 16, marginBottom: 8, marginTop: 4 },
  inputCard:       { marginHorizontal: 16, marginBottom: 10, backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 16 },
  bigInput:        { fontSize: 18, fontWeight: '600', color: '#dde3f0' },
  sourceBadge:     { fontSize: 11, color: '#1ecfa4', marginTop: 6, fontWeight: '600' },
  choiceRow:       { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 20 },
  choiceBtn:       { flex: 1, backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 14, alignItems: 'center', gap: 6 },
  choiceBtnAccent: { backgroundColor: '#f04a18', borderColor: '#f04a18' },
  choiceIcon:      { fontSize: 22 },
  choiceBtnText:   { fontSize: 12, fontWeight: '700', color: '#dde3f0', textAlign: 'center' },
  cameraBtn:       { marginHorizontal: 16, marginBottom: 20, backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderStyle: 'dashed', borderRadius: 14, padding: 14, alignItems: 'center' },
  cameraBtnText:   { fontSize: 14, fontWeight: '600', color: '#7a85a0' },
  setsRow:         { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 20 },
  inputBlock:      { flex: 1 },
  inputLabel:      { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: '#7a85a0', marginBottom: 8 },
  stepRow:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, overflow: 'hidden' },
  stepBtn:         { width: 44, height: 52, backgroundColor: '#242840', alignItems: 'center', justifyContent: 'center' },
  stepText:        { color: '#dde3f0', fontSize: 20 },
  stepInput:       { flex: 1, fontSize: 20, fontWeight: '800', color: '#dde3f0', height: 52 },
  saveBtn:         { margin: 16, backgroundColor: '#f04a18', borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: '#3c2010' },
  saveBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
});
