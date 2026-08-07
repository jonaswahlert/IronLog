import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, Alert, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  getSessionById, getExercisesForSession,
  updateExercise, deleteExercise, updateSession,
  Session, Exercise,
} from '../../lib/database';
import { useTranslation } from '../../lib/i18n';
import { MUSCLE_GROUPS } from '../../lib/muscles';
import { GYM_CHAINS } from '../../lib/gyms';
import { resolveImagePath } from '../../lib/imagePaths';

export default function SessionDetailScreen() {
  const t = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession]   = useState<Session | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [editEx, setEditEx]     = useState<Exercise | null>(null);
  const [editMachine, setEditMachine] = useState('');
  const [editWeight, setEditWeight]   = useState('');
  const [editSets, setEditSets]       = useState('');
  const [editReps, setEditReps]       = useState('');
  const [editGroup, setEditGroup]     = useState('');
  const [editDistance, setEditDistance]   = useState('');
  const [editDuration, setEditDuration]   = useState('');
  const [editSpeed, setEditSpeed]         = useState('');
  const [editHeartRate, setEditHeartRate] = useState('');
  const [editCalories, setEditCalories]   = useState('');
  const [editFloors, setEditFloors]       = useState('');
  const [editIncline, setEditIncline]     = useState('');
  const [editSession, setEditSession]     = useState(false);
  const [editCity, setEditCity]           = useState('');
  const [editGym, setEditGym]             = useState('');
  const [editCustomGym, setEditCustomGym] = useState('');
  const [editShowCustom, setEditShowCustom] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!id) return;
    const s = getSessionById(Number(id));
    setSession(s);
    setExercises(s ? getExercisesForSession(s.id) : []);
  }, [id]));

  function refresh() {
    if (!id) return;
    setExercises(getExercisesForSession(Number(id)));
  }

  function openEdit(ex: Exercise) {
    setEditEx(ex);
    setEditMachine(ex.machine_type ?? '');
    setEditWeight(ex.weight_kg != null ? String(ex.weight_kg) : '');
    setEditSets(ex.sets != null ? String(ex.sets) : '');
    setEditReps(ex.reps != null ? String(ex.reps) : '');
    setEditGroup(ex.muscle_group ?? '');
    setEditDistance(ex.distance_km != null ? String(ex.distance_km) : '');
    setEditDuration(ex.duration_min != null ? String(ex.duration_min) : '');
    setEditSpeed(ex.avg_speed_kmh != null ? String(ex.avg_speed_kmh) : '');
    setEditHeartRate(ex.avg_heart_rate != null ? String(ex.avg_heart_rate) : '');
    setEditCalories(ex.calories != null ? String(ex.calories) : '');
    setEditFloors(ex.floors_climbed != null ? String(ex.floors_climbed) : '');
    setEditIncline(ex.incline_pct != null ? String(ex.incline_pct) : '');
  }

  function saveEdit() {
    if (!editEx) return;
    if (editGroup === 'Cardio') {
      updateExercise(editEx.id, {
        machine_type:   editMachine.trim() || undefined,
        muscle_group:   editGroup || undefined,
        distance_km:    editDistance.trim()   ? parseFloat(editDistance)   : null,
        duration_min:   editDuration.trim()   ? parseFloat(editDuration)   : null,
        avg_speed_kmh:  editSpeed.trim()      ? parseFloat(editSpeed)      : null,
        avg_heart_rate: editHeartRate.trim()  ? parseInt(editHeartRate)    : null,
        calories:       editCalories.trim()   ? parseInt(editCalories)     : null,
        floors_climbed: editFloors.trim()     ? parseInt(editFloors)       : null,
        incline_pct:    editIncline.trim()    ? parseFloat(editIncline)    : null,
      });
    } else {
      updateExercise(editEx.id, {
        machine_type: editMachine.trim() || undefined,
        muscle_group: editGroup || undefined,
        weight_kg:    parseFloat(editWeight) || undefined,
        sets:         parseInt(editSets) || undefined,
        reps:         parseInt(editReps) || undefined,
      });
    }
    setEditEx(null);
    refresh();
  }

  function openEditSession() {
    setEditCity(session?.city ?? '');
    const g = session?.gym ?? '';
    if (GYM_CHAINS.includes(g)) {
      setEditGym(g); setEditCustomGym(''); setEditShowCustom(false);
    } else {
      setEditGym(''); setEditCustomGym(g); setEditShowCustom(g !== '');
    }
    setEditSession(true);
  }

  function saveSession() {
    if (!session) return;
    updateSession(session.id, {
      city: editCity.trim() || null,
      gym:  (editShowCustom ? editCustomGym.trim() : editGym) || null,
    });
    const updated = getSessionById(session.id);
    setSession(updated);
    setEditSession(false);
  }

  function confirmDelete(exId: number) {
    Alert.alert(t('confirm_delete'), t('cannot_undo'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => { deleteExercise(exId); refresh(); } },
    ]);
  }

  const date = session
    ? new Date(session.date).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>{date}</Text>
          <TouchableOpacity onPress={openEditSession} style={s.locationBtn}>
            <Text style={s.locationBtnText} numberOfLines={1}>
              {[session?.city, session?.gym].filter(Boolean).join('  ·  ') || '+ Lägg till ort & gym'}
            </Text>
            <Text style={s.editIcon}>✎</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/')} style={s.homeBtn}>
          <Text style={s.homeText}>🏠</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.sectionLabel}>{t('completed_exercises')}</Text>

      {exercises.length === 0 && (
        <Text style={s.empty}>{t('no_exercises')}</Text>
      )}

      {exercises.map(ex => (
        <TouchableOpacity key={ex.id} style={s.exCard} onPress={() => openEdit(ex)}>
          <View style={s.exThumb}>
            {ex.machine_image_path
              ? <Image source={{ uri: resolveImagePath(ex.machine_image_path)! }} style={s.exThumbImg} />
              : <Text style={{ fontSize: 22 }}>🏋️</Text>
            }
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.exName} numberOfLines={1}>{ex.machine_type ?? t('unknown_machine')}</Text>
            <Text style={s.exMeta}>
              {ex.muscle_group === 'Cardio'
                ? [ex.distance_km != null && `${ex.distance_km} km`, ex.duration_min != null && `${ex.duration_min} min`, ex.avg_heart_rate != null && `${ex.avg_heart_rate} bpm`].filter(Boolean).join('  ·  ') || 'Cardio'
                : `${ex.sets} set · ${ex.reps} reps${ex.muscle_group ? `  ·  ${ex.muscle_group}` : ''}`}
            </Text>
          </View>
          {ex.muscle_group !== 'Cardio' && (
            <View style={s.weightBadge}>
              <Text style={s.weightText}>{ex.weight_kg} kg</Text>
            </View>
          )}
          <TouchableOpacity style={s.delBtn} onPress={() => confirmDelete(ex.id)}>
            <Text style={s.delText}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ))}

      {/* Edit session city/gym modal */}
      <Modal visible={editSession} transparent animationType="slide">
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Ort & Gym</Text>

            <Text style={s.fieldLabel}>ORT</Text>
            <TextInput
              style={s.input}
              placeholder="t.ex. Stockholm"
              placeholderTextColor="#7a85a0"
              value={editCity}
              onChangeText={setEditCity}
            />

            <Text style={s.fieldLabel}>GYM (VALFRITT)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }} style={{ marginBottom: 12 }}>
              {GYM_CHAINS.map(name => (
                <TouchableOpacity
                  key={name}
                  style={[s.chip, !editShowCustom && editGym === name && s.chipActive]}
                  onPress={() => { setEditGym(name); setEditCustomGym(''); setEditShowCustom(false); }}
                >
                  <Text style={[s.chipText, !editShowCustom && editGym === name && s.chipTextActive]}>{name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[s.chip, editShowCustom && s.chipActive]}
                onPress={() => { setEditGym(''); setEditShowCustom(true); }}
              >
                <Text style={[s.chipText, editShowCustom && s.chipTextActive]}>Annat</Text>
              </TouchableOpacity>
            </ScrollView>
            {editShowCustom && (
              <TextInput
                style={s.input}
                placeholder="Ange gymnamn..."
                placeholderTextColor="#7a85a0"
                value={editCustomGym}
                onChangeText={setEditCustomGym}
              />
            )}

            <TouchableOpacity style={s.saveBtn} onPress={saveSession}>
              <Text style={s.saveBtnText}>{t('save')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setEditSession(false)}>
              <Text style={s.cancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit exercise modal */}
      <Modal visible={!!editEx} transparent animationType="slide">
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{t('edit')}</Text>

            <Text style={s.fieldLabel}>{t('machine')}</Text>
            <TextInput
              style={s.input}
              placeholder={t('enter_machine_name')}
              placeholderTextColor="#7a85a0"
              value={editMachine}
              onChangeText={setEditMachine}
            />

            {editGroup === 'Cardio' ? (
              <>
                <View style={s.rowInputs}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.fieldLabel}>DISTANS (KM)</Text>
                    <TextInput style={s.input} placeholder="—" placeholderTextColor="#7a85a0" value={editDistance} onChangeText={setEditDistance} keyboardType="decimal-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.fieldLabel}>TID (MIN)</Text>
                    <TextInput style={s.input} placeholder="—" placeholderTextColor="#7a85a0" value={editDuration} onChangeText={setEditDuration} keyboardType="decimal-pad" />
                  </View>
                </View>
                <View style={s.rowInputs}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.fieldLabel}>HASTIGHET (KM/H)</Text>
                    <TextInput style={s.input} placeholder="—" placeholderTextColor="#7a85a0" value={editSpeed} onChangeText={setEditSpeed} keyboardType="decimal-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.fieldLabel}>PULS (BPM)</Text>
                    <TextInput style={s.input} placeholder="—" placeholderTextColor="#7a85a0" value={editHeartRate} onChangeText={setEditHeartRate} keyboardType="number-pad" />
                  </View>
                </View>
                <View style={s.rowInputs}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.fieldLabel}>KALORIER</Text>
                    <TextInput style={s.input} placeholder="—" placeholderTextColor="#7a85a0" value={editCalories} onChangeText={setEditCalories} keyboardType="number-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.fieldLabel}>VÅNINGAR/STEG</Text>
                    <TextInput style={s.input} placeholder="—" placeholderTextColor="#7a85a0" value={editFloors} onChangeText={setEditFloors} keyboardType="number-pad" />
                  </View>
                </View>
                <Text style={s.fieldLabel}>LUTNING/MOTSTÅND (%)</Text>
                <TextInput style={s.input} placeholder="—" placeholderTextColor="#7a85a0" value={editIncline} onChangeText={setEditIncline} keyboardType="decimal-pad" />
              </>
            ) : (
              <>
                <Text style={s.fieldLabel}>{t('weight')} (kg)</Text>
                <TextInput
                  style={s.input}
                  placeholder="0"
                  placeholderTextColor="#7a85a0"
                  value={editWeight}
                  onChangeText={setEditWeight}
                  keyboardType="decimal-pad"
                />

                <View style={s.rowInputs}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.fieldLabel}>SETS</Text>
                    <TextInput
                      style={s.input}
                      placeholder="3"
                      placeholderTextColor="#7a85a0"
                      value={editSets}
                      onChangeText={setEditSets}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.fieldLabel}>REPS</Text>
                    <TextInput
                      style={s.input}
                      placeholder="10"
                      placeholderTextColor="#7a85a0"
                      value={editReps}
                      onChangeText={setEditReps}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </>
            )}

            <Text style={s.fieldLabel}>{t('muscle_group')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }} style={{ marginBottom: 16 }}>
              {MUSCLE_GROUPS.map(g => (
                <TouchableOpacity key={g} style={[s.chip, editGroup === g && s.chipActive]} onPress={() => setEditGroup(g)}>
                  <Text style={[s.chipText, editGroup === g && s.chipTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={s.saveBtn} onPress={saveEdit}>
              <Text style={s.saveBtnText}>{t('save')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setEditEx(null)}>
              <Text style={s.cancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0b0d13' },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 24, paddingTop: 60 },
  backBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1c2030', alignItems: 'center', justifyContent: 'center' },
  backText:     { color: '#dde3f0', fontSize: 17 },
  homeBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1c2030', alignItems: 'center', justifyContent: 'center' },
  homeText:     { fontSize: 18 },
  title:        { fontSize: 18, fontWeight: '800', color: '#dde3f0', letterSpacing: -0.3, textTransform: 'capitalize' },
  locationBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, backgroundColor: '#1c2030', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  locationBtnText:  { fontSize: 12, color: '#f04a18', fontWeight: '600', flexShrink: 1 },
  editIcon:         { fontSize: 11, color: '#7a85a0' },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#7a85a0', paddingHorizontal: 24, marginBottom: 12 },
  empty:        { fontSize: 14, color: '#7a85a0', paddingHorizontal: 24 },
  exCard:       { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 10 },
  exThumb:      { width: 92, height: 92, borderRadius: 14, backgroundColor: '#242840', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  exThumbImg:   { width: '100%', height: '100%' },
  exName:       { fontSize: 15, fontWeight: '700', color: '#dde3f0', marginBottom: 4 },
  exMeta:       { fontSize: 12, color: '#7a85a0' },
  weightBadge:  { backgroundColor: '#2b1510', borderWidth: 1, borderColor: '#f04a18', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  weightText:   { fontSize: 13, fontWeight: '800', color: '#f04a18' },
  delBtn:       { width: 28, height: 28, borderRadius: 14, backgroundColor: '#2a1010', alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  delText:      { color: '#f04a18', fontSize: 12, fontWeight: '700' },
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: '#141720', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 48 },
  modalTitle:   { fontSize: 22, fontWeight: '800', color: '#dde3f0', marginBottom: 20, letterSpacing: -0.4 },
  fieldLabel:   { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: '#7a85a0', marginBottom: 8 },
  input:        { backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 16, fontSize: 17, color: '#dde3f0', marginBottom: 16 },
  rowInputs:    { flexDirection: 'row', gap: 12 },
  chip:         { backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive:   { backgroundColor: '#f04a18', borderColor: '#f04a18' },
  chipText:     { fontSize: 13, fontWeight: '600', color: '#7a85a0' },
  chipTextActive: { color: '#fff' },
  saveBtn:      { backgroundColor: '#f04a18', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 },
  saveBtnText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn:    { alignItems: 'center', padding: 8 },
  cancelText:   { color: '#7a85a0', fontSize: 14 },
});
