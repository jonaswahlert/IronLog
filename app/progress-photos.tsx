import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, Alert, ActivityIndicator, Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useFocusEffect } from 'expo-router';
import {
  getAllProgressPhotos, addProgressPhoto, deleteProgressPhoto, ProgressPhoto,
} from '../lib/database';
import { compareBodyPhotos, BodyPart } from '../lib/claude';
import { useLang } from '../lib/LanguageContext';

const ACCENT = '#f04a18';
const TEAL   = '#1ecfa4';

export default function ProgressPhotosScreen() {
  const { lang } = useLang();
  const [photos, setPhotos]       = useState<ProgressPhoto[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected]   = useState<number[]>([]);
  const [comparing, setComparing] = useState(false);
  const [result, setResult]       = useState<{ parts: BodyPart[]; overall: string } | null>(null);

  useFocusEffect(useCallback(() => {
    setPhotos(getAllProgressPhotos());
  }, []));

  async function addPhoto() {
    Alert.alert(
      lang === 'sv' ? 'Lägg till bild' : 'Add photo',
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
    const res = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [3, 4], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [3, 4], quality: 0.8 });
    if (res.canceled || !res.assets?.[0]) return;
    const dest = FileSystem.documentDirectory + `progress_${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: res.assets[0].uri, to: dest });
    addProgressPhoto(dest, new Date().toISOString().split('T')[0]);
    setPhotos(getAllProgressPhotos());
  }

  function confirmDelete(id: number) {
    Alert.alert(
      lang === 'sv' ? 'Radera bild' : 'Delete photo',
      lang === 'sv' ? 'Kan inte ångras.' : 'This cannot be undone.',
      [
        { text: lang === 'sv' ? 'Avbryt' : 'Cancel', style: 'cancel' },
        { text: lang === 'sv' ? 'Radera' : 'Delete', style: 'destructive', onPress: () => {
          deleteProgressPhoto(id);
          setPhotos(getAllProgressPhotos());
          setSelected(sel => sel.filter(x => x !== id));
        } },
      ]
    );
  }

  function toggleCompareMode() {
    setCompareMode(m => !m);
    setSelected([]);
  }

  function toggleSelect(id: number) {
    setSelected(sel => {
      if (sel.includes(id)) return sel.filter(x => x !== id);
      if (sel.length >= 2) return [sel[1], id];
      return [...sel, id];
    });
  }

  async function runCompare() {
    if (selected.length !== 2) return;
    const [a, b] = selected
      .map(id => photos.find(p => p.id === id)!)
      .sort((x, y) => x.taken_at.localeCompare(y.taken_at));
    setComparing(true);
    try {
      const base64Before = await FileSystem.readAsStringAsync(a.image_path, { encoding: 'base64' });
      const base64After  = await FileSystem.readAsStringAsync(b.image_path, { encoding: 'base64' });
      const res = await compareBodyPhotos({ base64Before, base64After, language: lang });
      if (res.error || res.parts.length === 0) {
        Alert.alert(
          lang === 'sv' ? 'Kunde inte jämföra' : 'Could not compare',
          lang === 'sv' ? 'Försök igen med tydligare bilder.' : 'Try again with clearer photos.',
          [{ text: 'OK' }]
        );
      } else {
        setResult({ parts: res.parts, overall: res.overall });
      }
    } finally {
      setComparing(false);
    }
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Text style={s.iconBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>{lang === 'sv' ? 'Progressbilder' : 'Progress photos'}</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/')} style={s.iconBtn}>
          <Text style={s.iconBtnText}>🏠</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {photos.length === 0 ? (
          <Text style={s.empty}>
            {lang === 'sv'
              ? 'Inga progressbilder ännu. Lägg till din första bild för att börja följa din utveckling.'
              : 'No progress photos yet. Add your first photo to start tracking your progress.'}
          </Text>
        ) : (
          <View style={s.grid}>
            {photos.map(p => {
              const isSelected = selected.includes(p.id);
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[s.photoCard, isSelected && s.photoCardSelected]}
                  onPress={() => compareMode ? toggleSelect(p.id) : undefined}
                  activeOpacity={compareMode ? 0.7 : 1}
                >
                  <Image source={{ uri: p.image_path }} style={s.photoImg} />
                  <View style={s.photoDateBadge}>
                    <Text style={s.photoDateText}>{p.taken_at}</Text>
                  </View>
                  {isSelected && (
                    <View style={s.selectedBadge}>
                      <Text style={s.selectedBadgeText}>{selected.indexOf(p.id) + 1}</Text>
                    </View>
                  )}
                  {!compareMode && (
                    <TouchableOpacity style={s.deleteBtn} onPress={() => confirmDelete(p.id)}>
                      <Text style={s.deleteText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={s.bottomBar}>
        {compareMode ? (
          <>
            <TouchableOpacity
              style={[s.primaryBtn, selected.length !== 2 && s.primaryBtnDisabled]}
              onPress={runCompare}
              disabled={selected.length !== 2 || comparing}
            >
              <Text style={s.primaryBtnText}>
                {comparing
                  ? (lang === 'sv' ? 'Jämför...' : 'Comparing...')
                  : (lang === 'sv' ? `Jämför valda (${selected.length}/2) →` : `Compare selected (${selected.length}/2) →`)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.secondaryBtn} onPress={toggleCompareMode}>
              <Text style={s.secondaryBtnText}>{lang === 'sv' ? 'Avbryt' : 'Cancel'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={s.primaryBtn} onPress={addPhoto}>
              <Text style={s.primaryBtnText}>📷  {lang === 'sv' ? 'Lägg till bild' : 'Add photo'}</Text>
            </TouchableOpacity>
            {photos.length >= 2 && (
              <TouchableOpacity style={s.secondaryBtn} onPress={toggleCompareMode}>
                <Text style={s.secondaryBtnText}>⚖️  {lang === 'sv' ? 'Jämför bilder' : 'Compare photos'}</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      <Modal visible={!!result} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{lang === 'sv' ? 'AI-jämförelse' : 'AI comparison'}</Text>
            <Text style={s.modalDisclaimer}>
              {lang === 'sv'
                ? '⚠️ Detta är en AI-uppskattning baserad på foton, inte en exakt mätning.'
                : '⚠️ This is an AI estimate based on photos, not an exact measurement.'}
            </Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {result?.parts.map((part, i) => (
                <View key={i} style={s.partRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.partName}>{part.name}</Text>
                    <Text style={s.partText}>{part.change_text}</Text>
                  </View>
                  <View style={[s.pctBadge, { backgroundColor: part.change_pct > 0 ? TEAL + '22' : part.change_pct < 0 ? ACCENT + '22' : '#22273a' }]}>
                    <Text style={[s.pctText, { color: part.change_pct > 0 ? TEAL : part.change_pct < 0 ? ACCENT : '#7a85a0' }]}>
                      {part.change_pct > 0 ? '+' : ''}{part.change_pct}%
                    </Text>
                  </View>
                </View>
              ))}
              {result?.overall && (
                <View style={s.overallBox}>
                  <Text style={s.overallLabel}>{lang === 'sv' ? 'HELHETSINTRYCK' : 'OVERALL'}</Text>
                  <Text style={s.partText}>{result.overall}</Text>
                </View>
              )}
            </ScrollView>
            <TouchableOpacity style={s.modalCloseBtn} onPress={() => { setResult(null); setCompareMode(false); setSelected([]); }}>
              <Text style={s.modalCloseText}>{lang === 'sv' ? 'Stäng' : 'Close'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {comparing && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator color={ACCENT} size="large" />
          <Text style={s.loadingText}>{lang === 'sv' ? 'AI analyserar bilderna...' : 'AI is analyzing the photos...'}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0b0d13' },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60 },
  iconBtn:          { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1c2030', alignItems: 'center', justifyContent: 'center' },
  iconBtnText:      { color: '#dde3f0', fontSize: 16 },
  title:            { fontSize: 18, fontWeight: '700', color: '#dde3f0' },
  empty:            { fontSize: 14, color: '#7a85a0', textAlign: 'center', paddingTop: 40, lineHeight: 20 },
  grid:             { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoCard:        { width: '31.5%', aspectRatio: 3 / 4, borderRadius: 14, overflow: 'hidden', backgroundColor: '#1c2030', borderWidth: 2, borderColor: 'transparent' },
  photoCardSelected:{ borderColor: ACCENT },
  photoImg:         { width: '100%', height: '100%' },
  photoDateBadge:   { position: 'absolute', bottom: 6, left: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 6 },
  photoDateText:    { color: '#fff', fontSize: 10, fontWeight: '600', textAlign: 'center' },
  selectedBadge:    { position: 'absolute', top: 6, left: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  selectedBadgeText:{ color: '#fff', fontSize: 12, fontWeight: '800' },
  deleteBtn:        { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  deleteText:       { color: '#fff', fontSize: 11, fontWeight: '700' },
  bottomBar:        { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, backgroundColor: '#0b0d13', borderTopWidth: 1, borderTopColor: '#22273a', gap: 10 },
  primaryBtn:       { backgroundColor: ACCENT, borderRadius: 14, padding: 16, alignItems: 'center' },
  primaryBtnDisabled: { backgroundColor: '#3c2010' },
  primaryBtnText:   { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn:     { backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 14, alignItems: 'center' },
  secondaryBtnText: { color: '#dde3f0', fontSize: 14, fontWeight: '600' },
  loadingOverlay:   { position: 'absolute', inset: 0, backgroundColor: 'rgba(11,13,19,0.9)', alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText:      { color: '#dde3f0', fontSize: 14 },
  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard:        { backgroundColor: '#141720', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 48 },
  modalTitle:       { fontSize: 20, fontWeight: '800', color: '#dde3f0', marginBottom: 8 },
  modalDisclaimer:  { fontSize: 12, color: '#f0b74a', marginBottom: 18, lineHeight: 17 },
  partRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#22273a' },
  partName:         { fontSize: 14, fontWeight: '700', color: '#dde3f0', marginBottom: 2 },
  partText:         { fontSize: 12, color: '#7a85a0', lineHeight: 17 },
  pctBadge:         { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 54, alignItems: 'center' },
  pctText:          { fontSize: 13, fontWeight: '800' },
  overallBox:       { marginTop: 14, paddingTop: 14 },
  overallLabel:     { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#7a85a0', marginBottom: 6 },
  modalCloseBtn:    { marginTop: 18, alignItems: 'center', padding: 8 },
  modalCloseText:   { color: '#7a85a0', fontSize: 14, fontWeight: '600' },
});
