import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Image,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useFocusEffect } from 'expo-router';
import { getProfile, saveProfile, Profile } from '../../lib/database';
import { useLang } from '../../lib/LanguageContext';
import { LanguageToggle } from '../../components/LanguageToggle';

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

  useFocusEffect(useCallback(() => {
    const p = getProfile();
    setProfile(p);
    setName(p?.name ?? '');
    setAge(p?.age ? String(p.age) : '');
    setHeight(p?.height_cm ? String(p.height_cm) : '');
    setWeight(p?.weight_kg ? String(p.weight_kg) : '');
    setGoal(p?.goal ?? '');
    setAvatarPath(p?.avatar_path ?? null);
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
            ? <Image source={{ uri: avatarPath }} style={s.avatarImg} />
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
});
