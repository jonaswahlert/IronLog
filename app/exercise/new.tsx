import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { addExercise } from '../../lib/database';
import { useTranslation } from '../../lib/i18n';
import { LanguageToggle } from '../../components/LanguageToggle';
import { resolveImagePath } from '../../lib/imagePaths';

export default function NewExerciseScreen() {
  const t = useTranslation();
  const {
    sessionId, city, gym,
    machineId, machineType, machineImagePath, machineConfidence, muscleGroup,
    weightKg, defaultSets, defaultReps,
  } = useLocalSearchParams<{
    sessionId: string; city?: string; gym?: string;
    machineId?: string; machineType?: string; machineImagePath?: string;
    machineConfidence?: string; muscleGroup?: string;
    weightKg?: string; defaultSets?: string; defaultReps?: string;
  }>();

  const isCardio = muscleGroup === 'Cardio';

  const [machineInput, setMachineInput] = useState(machineType ?? '');
  const [weightInput, setWeightInput]   = useState(weightKg ?? '');
  const [setsInput, setSetsInput]       = useState(String(Number(defaultSets) || 3));
  const [repsInput, setRepsInput]       = useState(String(Number(defaultReps) || 10));
  const [saving, setSaving]             = useState(false);

  const [distance, setDistance]   = useState('');
  const [duration, setDuration]   = useState('');
  const [speed, setSpeed]         = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [calories, setCalories]   = useState('');
  const [floors, setFloors]       = useState('');
  const [incline, setIncline]     = useState('');

  const fromRegistry = !!machineId;
  const scannedMachine = !fromRegistry && !!machineType;

  function save() {
    if (!machineInput.trim()) return;
    setSaving(true);
    if (isCardio) {
      addExercise({
        session_id:         Number(sessionId),
        machine_id:         machineId ? Number(machineId) : null,
        machine_type:       machineInput.trim(),
        machine_confidence: machineConfidence ? Number(machineConfidence) : null,
        machine_image_path: machineImagePath ?? null,
        muscle_group:       'Cardio',
        weight_kg:          null,
        weight_confidence:  null,
        weight_image_path:  null,
        sets:               null,
        reps:               null,
        notes:              null,
        distance_km:        distance.trim()  ? parseFloat(distance)  : null,
        duration_min:       duration.trim()  ? parseFloat(duration)  : null,
        avg_speed_kmh:      speed.trim()     ? parseFloat(speed)     : null,
        avg_heart_rate:     heartRate.trim() ? parseInt(heartRate)   : null,
        calories:           calories.trim()  ? parseInt(calories)    : null,
        floors_climbed:     floors.trim()    ? parseInt(floors)      : null,
        incline_pct:        incline.trim()   ? parseFloat(incline)   : null,
      });
    } else {
      if (!weightInput.trim()) { setSaving(false); return; }
      addExercise({
        session_id:         Number(sessionId),
        machine_id:         machineId ? Number(machineId) : null,
        machine_type:       machineInput.trim(),
        machine_confidence: machineConfidence ? Number(machineConfidence) : null,
        machine_image_path: machineImagePath ?? null,
        muscle_group:       muscleGroup ?? null,
        weight_kg:          parseFloat(weightInput) || 0,
        weight_confidence:  null,
        weight_image_path:  null,
        sets:               parseInt(setsInput) || 3,
        reps:               parseInt(repsInput) || 10,
        notes:              null,
      });
    }
    router.replace('/(tabs)/');
  }

  const canSave = machineInput.trim() !== '' && (isCardio || weightInput.trim() !== '');

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
      <View style={[s.inputCard, s.inputCardRow]}>
        {!!machineImagePath && (
          <Image source={{ uri: resolveImagePath(machineImagePath)! }} style={s.machineThumb} />
        )}
        <View style={{ flex: 1 }}>
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

      {isCardio ? (
        <>
          <Text style={s.sectionLabel}>KONDITIONSDATA</Text>
          <View style={s.fieldRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.inputLabel}>DISTANS (KM)</Text>
              <View style={s.inputCard}>
                <TextInput style={s.bigInput} placeholder="—" placeholderTextColor="#7a85a0" value={distance} onChangeText={setDistance} keyboardType="decimal-pad" />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.inputLabel}>TID (MIN)</Text>
              <View style={s.inputCard}>
                <TextInput style={s.bigInput} placeholder="—" placeholderTextColor="#7a85a0" value={duration} onChangeText={setDuration} keyboardType="decimal-pad" />
              </View>
            </View>
          </View>
          <View style={s.fieldRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.inputLabel}>HASTIGHET (KM/H)</Text>
              <View style={s.inputCard}>
                <TextInput style={s.bigInput} placeholder="—" placeholderTextColor="#7a85a0" value={speed} onChangeText={setSpeed} keyboardType="decimal-pad" />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.inputLabel}>PULS (BPM)</Text>
              <View style={s.inputCard}>
                <TextInput style={s.bigInput} placeholder="—" placeholderTextColor="#7a85a0" value={heartRate} onChangeText={setHeartRate} keyboardType="number-pad" />
              </View>
            </View>
          </View>
          <View style={s.fieldRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.inputLabel}>KALORIER</Text>
              <View style={s.inputCard}>
                <TextInput style={s.bigInput} placeholder="—" placeholderTextColor="#7a85a0" value={calories} onChangeText={setCalories} keyboardType="number-pad" />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.inputLabel}>VÅNINGAR/STEG</Text>
              <View style={s.inputCard}>
                <TextInput style={s.bigInput} placeholder="—" placeholderTextColor="#7a85a0" value={floors} onChangeText={setFloors} keyboardType="number-pad" />
              </View>
            </View>
          </View>
          <Text style={s.sectionLabel}>LUTNING/MOTSTÅND (%)</Text>
          <View style={s.inputCard}>
            <TextInput style={s.bigInput} placeholder="—" placeholderTextColor="#7a85a0" value={incline} onChangeText={setIncline} keyboardType="decimal-pad" />
          </View>
        </>
      ) : (
        <>
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
          </View>

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
        </>
      )}

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
  inputCardRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  machineThumb:    { width: 92, height: 92, borderRadius: 14, flexShrink: 0 },
  bigInput:        { fontSize: 18, fontWeight: '600', color: '#dde3f0' },
  sourceBadge:     { fontSize: 11, color: '#1ecfa4', marginTop: 6, fontWeight: '600' },
  choiceRow:       { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 20 },
  choiceBtn:       { flex: 1, backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 14, alignItems: 'center', gap: 6 },
  choiceBtnAccent: { backgroundColor: '#f04a18', borderColor: '#f04a18' },
  choiceIcon:      { fontSize: 22 },
  choiceBtnText:   { fontSize: 12, fontWeight: '700', color: '#dde3f0', textAlign: 'center' },
  fieldRow:        { flexDirection: 'row', gap: 0 },
  setsRow:         { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 20 },
  inputBlock:      { flex: 1 },
  inputLabel:      { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: '#7a85a0', marginBottom: 8, paddingHorizontal: 16 },
  stepRow:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, overflow: 'hidden' },
  stepBtn:         { width: 44, height: 52, backgroundColor: '#242840', alignItems: 'center', justifyContent: 'center' },
  stepText:        { color: '#dde3f0', fontSize: 20 },
  stepInput:       { flex: 1, fontSize: 20, fontWeight: '800', color: '#dde3f0', height: 52 },
  saveBtn:         { margin: 16, backgroundColor: '#f04a18', borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: '#3c2010' },
  saveBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
});
