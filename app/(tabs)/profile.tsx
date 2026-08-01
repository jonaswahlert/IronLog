import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Image,
  StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useFocusEffect } from 'expo-router';
import {
  getProfile, saveProfile, Profile,
  addWeightEntry, getWeightHistory, deleteWeightEntry, WeightEntry,
} from '../../lib/database';
import { useLang } from '../../lib/LanguageContext';
import { LanguageToggle } from '../../components/LanguageToggle';
import { resolveImagePath } from '../../lib/imagePaths';

const ACCENT = '#f04a18';

export default function ProfileScreen() {
  const { lang } = useLang();
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [name, setName]         = useState('');
  const [age, setAge]           = useState('');
  const [height, setHeight]     = useState('');
  const [weight, setWeight]     = useState('');
  const [goal, setGoal]         = useState('');
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [logWeightOpen, setLogWeightOpen] = useState(false);
  const [newWeightInput, setNewWeightInput] = useState('');

  useFocusEffect(useCallback(() => {
    const p = getProfile();
    setProfile(p);
    setName(p?.name ?? '');
    setAge(p?.age ? String(p.age) : '');
    setHeight(p?.height_cm ? String(p.height_cm) : '');
    setWeight(p?.weight_kg ? String(p.weight_kg) : '');
    setGoal(p?.goal ?? '');
    setAvatarPath(p?.avatar_path ?? null);
    setWeightHistory(getWeightHistory());
  }, []));

  async function pickAvatar() {
    Alert.alert(
      lang === 'sv' ? 'Profilbild' : 'Profile photo',
      lang === 'sv' ? 'Välj en bild' : 'Choose a photo',
      [
        { text: lang === 'sv' ? 'Ta foto' : 'Take photo', onPress: () => launchPicker('camera') },
        { text: lang === 'sv' ? 'Välj från galleri' : 'Choose from library', onPress: () => launchPicker('library') },
        { text: lang === 'sv' ? 'Avbryt' : 'Cancel', style: 'cancel' },
      ]
    );
  }

  async function launchPicker(source: 'camera' | 'library') {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const dest = FileSystem.documentDirectory + `avatar_${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: result.assets[0].uri, to: dest });
    setAvatarPath(dest);
  }

  function openLogWeight() {
    setNewWeightInput(weightHistory[0] ? String(weightHistory[0].weight_kg) : weight);
    setLogWeightOpen(true);
  }

  function logWeight() {
    const kg = parseFloat(newWeightInput);
    if (!kg) return;
    const today = new Date().toISOString().split('T')[0];
    addWeightEntry(kg, today);
    saveProfile({ weight_kg: kg });
    setWeight(String(kg));
    setWeightHistory(getWeightHistory());
    setLogWeightOpen(false);
  }

  function confirmDeleteWeight(id: number) {
    Alert.alert(
      lang === 'sv' ? 'Radera post' : 'Delete entry',
      lang === 'sv' ? 'Kan inte ångras.' : 'This cannot be undone.',
      [
        { text: lang === 'sv' ? 'Avbryt' : 'Cancel', style: 'cancel' },
        { text: lang === 'sv' ? 'Radera' : 'Delete', style: 'destructive', onPress: () => {
          deleteWeightEntry(id);
          setWeightHistory(getWeightHistory());
        } },
      ]
    );
  }

  function save() {
    setSaving(true);
    saveProfile({
      name:        name.trim() || null,
      age:         age.trim() ? parseInt(age) : null,
      height_cm:   height.trim() ? parseFloat(height) : null,
      weight_kg:   weight.trim() ? parseFloat(weight) : null,
      goal:        goal.trim() || null,
      avatar_path: avatarPath,
    });
    setSaving(false);
    Alert.alert(lang === 'sv' ? 'Sparat' : 'Saved', '', [{ text: 'OK' }]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <View style={s.header}>
        <Text style={s.title}>{lang === 'sv' ? 'Profil' : 'Profile'}</Text>
        <LanguageToggle />
      </View>

      <View style={s.avatarWrap}>
        <TouchableOpacity style={s.avatarCircle} onPress={pickAvatar}>
          {avatarPath
            ? <Image source={{ uri: resolveImagePath(avatarPath)! }} style={s.avatarImg} />
            : <Text style={s.avatarPlaceholder}>👤</Text>
          }
          <View style={s.avatarEditBadge}>
            <Text style={s.avatarEditText}>📷</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={s.sectionLabel}>{lang === 'sv' ? 'NAMN' : 'NAME'}</Text>
      <View style={s.inputCard}>
        <TextInput
          style={s.input}
          placeholder={lang === 'sv' ? 'Ditt namn' : 'Your name'}
          placeholderTextColor="#7a85a0"
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={s.sectionLabel}>{lang === 'sv' ? 'ÅLDER' : 'AGE'}</Text>
          <View style={s.inputCard}>
            <TextInput style={s.input} placeholder="—" placeholderTextColor="#7a85a0" value={age} onChangeText={setAge} keyboardType="number-pad" />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.sectionLabel}>{lang === 'sv' ? 'LÄNGD (CM)' : 'HEIGHT (CM)'}</Text>
          <View style={s.inputCard}>
            <TextInput style={s.input} placeholder="—" placeholderTextColor="#7a85a0" value={height} onChangeText={setHeight} keyboardType="decimal-pad" />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.sectionLabel}>{lang === 'sv' ? 'VIKT (KG)' : 'WEIGHT (KG)'}</Text>
          <View style={s.inputCard}>
            <TextInput style={s.input} placeholder="—" placeholderTextColor="#7a85a0" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
          </View>
        </View>
      </View>

      <Text style={s.sectionLabel}>{lang === 'sv' ? 'MÅL' : 'GOAL'}</Text>
      <View style={s.inputCard}>
        <TextInput
          style={[s.input, { minHeight: 60 }]}
          placeholder={lang === 'sv' ? 'T.ex. bygga muskler, gå ner i vikt...' : 'E.g. build muscle, lose weight...'}
          placeholderTextColor="#7a85a0"
          value={goal}
          onChangeText={setGoal}
          multiline
        />
      </View>

      <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving}>
        <Text style={s.saveBtnText}>{saving ? (lang === 'sv' ? 'Sparar...' : 'Saving...') : (lang === 'sv' ? '✓ Spara' : '✓ Save')}</Text>
      </TouchableOpacity>

      <View style={s.weightHeaderRow}>
        <Text style={s.sectionLabel}>{lang === 'sv' ? 'VIKTUTVECKLING' : 'WEIGHT PROGRESS'}</Text>
        <TouchableOpacity style={s.logWeightBtn} onPress={openLogWeight}>
          <Text style={s.logWeightBtnText}>+ {lang === 'sv' ? 'Logga ny vikt' : 'Log new weight'}</Text>
        </TouchableOpacity>
      </View>

      {weightHistory.length === 0 ? (
        <Text style={s.weightEmpty}>
          {lang === 'sv' ? 'Ingen vikt loggad ännu.' : 'No weight logged yet.'}
        </Text>
      ) : (
        <View style={s.weightList}>
          {weightHistory.map((entry, i) => {
            const prev = weightHistory[i + 1];
            const delta = prev ? entry.weight_kg - prev.weight_kg : null;
            return (
              <View key={entry.id} style={s.weightRow}>
                <Text style={s.weightDate}>{entry.logged_at}</Text>
                <Text style={s.weightValue}>{entry.weight_kg} kg</Text>
                {delta !== null && delta !== 0 && (
                  <Text style={[s.weightDelta, { color: delta > 0 ? ACCENT : '#1ecfa4' }]}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(1)} kg
                  </Text>
                )}
                <TouchableOpacity style={s.weightDeleteBtn} onPress={() => confirmDeleteWeight(entry.id)}>
                  <Text style={s.weightDeleteText}>✕</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      <TouchableOpacity style={s.progressCard} onPress={() => router.push('/progress-photos')}>
        <View style={{ flex: 1 }}>
          <Text style={s.progressTitle}>📸  {lang === 'sv' ? 'Progressbilder' : 'Progress photos'}</Text>
          <Text style={s.progressSub}>
            {lang === 'sv' ? 'Se hur din kropp förändras över tid — med AI-jämförelse' : 'See how your body changes over time — with AI comparison'}
          </Text>
        </View>
        <Text style={s.progressArrow}>→</Text>
      </TouchableOpacity>
    </ScrollView>

    <Modal visible={logWeightOpen} transparent animationType="slide">
      <View style={s.modalOverlay}>
        <View style={s.modalCard}>
          <Text style={s.modalTitle}>{lang === 'sv' ? 'Logga ny vikt' : 'Log new weight'}</Text>
          <Text style={s.sectionLabel}>{lang === 'sv' ? 'VIKT (KG)' : 'WEIGHT (KG)'}</Text>
          <View style={s.inputCard}>
            <TextInput
              style={[s.input, { fontSize: 24, fontWeight: '800' }]}
              placeholder="0"
              placeholderTextColor="#7a85a0"
              value={newWeightInput}
              onChangeText={setNewWeightInput}
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>
          <TouchableOpacity style={s.saveBtn} onPress={logWeight} disabled={!newWeightInput.trim()}>
            <Text style={s.saveBtnText}>{lang === 'sv' ? '✓ Spara' : '✓ Save'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.modalCancelBtn} onPress={() => setLogWeightOpen(false)}>
            <Text style={s.modalCancelText}>{lang === 'sv' ? 'Avbryt' : 'Cancel'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#0b0d13' },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, paddingTop: 60 },
  title:              { fontSize: 28, fontWeight: '800', color: '#dde3f0', letterSpacing: -0.6 },
  avatarWrap:         { alignItems: 'center', marginBottom: 28 },
  avatarCircle:       { width: 108, height: 108, borderRadius: 54, backgroundColor: '#1c2030', borderWidth: 2, borderColor: '#22273a', alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  avatarImg:          { width: 104, height: 104, borderRadius: 52 },
  avatarPlaceholder:  { fontSize: 44 },
  avatarEditBadge:    { position: 'absolute', bottom: -2, right: -2, width: 34, height: 34, borderRadius: 17, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#0b0d13' },
  avatarEditText:     { fontSize: 14 },
  sectionLabel:       { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#7a85a0', paddingHorizontal: 16, marginBottom: 8, marginTop: 4 },
  inputCard:          { marginHorizontal: 16, marginBottom: 10, backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 14 },
  input:              { fontSize: 16, fontWeight: '600', color: '#dde3f0' },
  row:                { flexDirection: 'row', gap: 0 },
  saveBtn:            { margin: 16, marginTop: 10, backgroundColor: '#1ecfa4', borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnText:        { color: '#000', fontSize: 16, fontWeight: '700' },
  progressCard:       { flexDirection: 'row', alignItems: 'center', margin: 16, marginTop: 8, backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 16 },
  progressTitle:      { fontSize: 15, fontWeight: '700', color: '#dde3f0', marginBottom: 4 },
  progressSub:        { fontSize: 12, color: '#7a85a0', lineHeight: 17 },
  progressArrow:      { fontSize: 20, color: '#7a85a0', marginLeft: 8 },
  weightHeaderRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 4 },
  logWeightBtn:       { backgroundColor: ACCENT, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 8 },
  logWeightBtnText:   { color: '#fff', fontSize: 12, fontWeight: '700' },
  weightEmpty:        { fontSize: 13, color: '#7a85a0', paddingHorizontal: 16, marginBottom: 16 },
  weightList:         { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, overflow: 'hidden' },
  weightRow:          { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#22273a' },
  weightDate:         { fontSize: 12, color: '#7a85a0', flex: 1 },
  weightValue:        { fontSize: 14, fontWeight: '700', color: '#dde3f0' },
  weightDelta:        { fontSize: 12, fontWeight: '700', minWidth: 56, textAlign: 'right' },
  weightDeleteBtn:     { width: 22, height: 22, borderRadius: 11, backgroundColor: '#2a1010', alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  weightDeleteText:   { color: ACCENT, fontSize: 11, fontWeight: '700' },
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard:          { backgroundColor: '#141720', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 48 },
  modalTitle:         { fontSize: 20, fontWeight: '800', color: '#dde3f0', marginBottom: 16 },
  modalCancelBtn:     { alignItems: 'center', padding: 8 },
  modalCancelText:    { color: '#7a85a0', fontSize: 14 },
});
