import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Image,
  StyleSheet, ActivityIndicator, ScrollView, Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import { saveMachine, machineExists, getLastCity, getLastGym } from '../lib/database';
import { MUSCLE_GROUPS } from '../lib/muscles';
import { identifyMachine, readNameplateText } from '../lib/claude';
import { GYM_CHAINS } from '../lib/gyms';
import { resolveImagePath } from '../lib/imagePaths';

export default function GymScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();

  const [showSetup, setShowSetup] = useState(true);
  const [city, setCity]           = useState(() => getLastCity() ?? '');
  const [gym, setGym]             = useState(() => { const c = getLastCity(); return c ? (getLastGym(c) ?? '') : ''; });
  const [customGym, setCustomGym] = useState('');
  const [showCustomGym, setShowCustomGym] = useState(false);

  const [scanning, setScanning]       = useState(false);
  const [hasResult, setHasResult]     = useState(false);
  const [machineName, setMachineName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [confidence, setConfidence]   = useState(0);
  const [imagePath, setImagePath]     = useState<string | null>(null);
  const [nameplateImagePath, setNameplateImagePath] = useState<string | null>(null);

  const [savedCount, setSavedCount]     = useState(0);
  const [captureStep, setCaptureStep]   = useState<'machine' | 'nameplate'>('machine');

  const cameraRef = useRef<CameraView>(null);

  async function captureMachine() {
    if (!cameraRef.current || scanning) return;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
      if (!photo) { setCaptureStep('nameplate'); return; }
      const dest = FileSystem.documentDirectory + `gym_scan_${Date.now()}.jpg`;
      await FileSystem.moveAsync({ from: photo.uri, to: dest });
      setImagePath(dest);
      const ai = await identifyMachine(photo.base64 ?? '');
      setMachineName(ai.machine_type ?? '');
      setMuscleGroup(ai.muscle_group ?? '');
      setConfidence(ai.confidence ?? 0);
      setHasResult(true);
    } catch {
      setCaptureStep('nameplate');
    } finally {
      setScanning(false);
    }
  }

  async function captureNameplate() {
    if (!cameraRef.current || scanning) return;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      if (!photo) return;
      const dest = FileSystem.documentDirectory + `gym_nameplate_${Date.now()}.jpg`;
      await FileSystem.moveAsync({ from: photo.uri, to: dest });
      setNameplateImagePath(dest);
      const ai = await readNameplateText(photo.base64 ?? '');
      if (ai.text) {
        setMachineName(ai.text);
        setConfidence(100);
      } else {
        Alert.alert(
          'Kunde inte läsa skylten',
          ai.error ? `Försök igen eller ange namnet manuellt. (${ai.error})` : 'Ingen läsbar text hittades på bilden. Försök igen eller ange namnet manuellt.',
          [{ text: 'OK' }]
        );
      }
    } catch {
      Alert.alert('Kunde inte läsa skylten', 'Försök igen eller ange namnet manuellt.', [{ text: 'OK' }]);
    } finally {
      setScanning(false);
      setHasResult(true);
    }
  }

  function saveCurrent() {
    if (!machineName.trim()) return;
    const finalGym  = showCustomGym ? customGym.trim() : gym;
    const finalCity = city.trim() || null;
    const finalGymVal = finalGym || null;

    const doSave = () => {
      saveMachine({
        name:                 machineName.trim(),
        image_path:           imagePath,
        city:                 finalCity,
        gym:                  finalGymVal,
        muscle_group:         muscleGroup || null,
        nameplate_image_path: nameplateImagePath,
      });
      setSavedCount(c => c + 1);
      setHasResult(false);
      setMachineName('');
      setMuscleGroup('');
      setConfidence(0);
      setImagePath(null);
      setNameplateImagePath(null);
      setCaptureStep('machine');
    };

    if (machineExists(machineName.trim(), finalCity, finalGymVal)) {
      Alert.alert(
        'Maskin finns redan',
        `"${machineName.trim()}" är redan registrerad på detta gym. Är det en annan övning på samma maskin? Då kan du spara den som en till variant — fotot hjälper dig skilja dem åt i listan.`,
        [
          { text: 'Avbryt', style: 'cancel' },
          { text: 'Spara ändå', onPress: doSave },
        ]
      );
      return;
    }
    doSave();
  }

  const gymLabel      = showCustomGym ? customGym : gym;
  const locationLabel = [city, gymLabel].filter(Boolean).join(' · ');
  const activeGym     = showCustomGym ? '' : gym;

  if (!permission) return <View style={s.container} />;

  if (!permission.granted) {
    return (
      <View style={s.permContainer}>
        <Text style={s.permText}>IronLog behöver tillgång till kameran för att skanna maskiner.</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <Text style={s.permBtnText}>Tillåt kamera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <CameraView ref={cameraRef} style={s.camera} facing="back" />

      <View style={s.overlay} pointerEvents="none">
        <View style={s.corner} />
        <View style={[s.corner, s.cornerTR]} />
        <View style={[s.corner, s.cornerBL]} />
        <View style={[s.corner, s.cornerBR]} />
      </View>

      <View style={s.topBar}>
        <TouchableOpacity style={s.doneBtn} onPress={() => router.back()}>
          <Text style={s.doneBtnText}>
            {savedCount > 0 ? `✓ Klar (${savedCount})` : '✕'}
          </Text>
        </TouchableOpacity>
        {locationLabel ? (
          <View style={s.locationBadge}>
            <Text style={s.locationText} numberOfLines={1}>🏋️ {locationLabel}</Text>
          </View>
        ) : <View style={{ flex: 1 }} />}
        <TouchableOpacity style={s.settingsBtn} onPress={() => setShowSetup(true)}>
          <Text style={s.settingsText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {savedCount > 0 && (
        <View style={s.counterBubble}>
          <Text style={s.counterNum}>{savedCount}</Text>
          <Text style={s.counterLabel}>maskiner{'\n'}sparade</Text>
        </View>
      )}

      {hasResult ? (
        <ScrollView style={s.resultScroll} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={s.resultCard}>
            {imagePath && (
              <Image source={{ uri: resolveImagePath(imagePath)! }} style={s.machinePreview} resizeMode="cover" />
            )}
            <View style={s.resultHeader}>
              <View style={s.dot} />
              <Text style={s.resultHeaderText}>
                {confidence > 0 ? `AI-IDENTIFIERING · ${confidence}%` : 'MANUELL INMATNING'}
              </Text>
            </View>

            <Text style={s.fieldLabel}>MASKINNAMN</Text>
            <TextInput
              style={s.nameInput}
              placeholder="Ange maskinnamn..."
              placeholderTextColor="#7a85a0"
              value={machineName}
              onChangeText={setMachineName}
            />

            <Text style={s.fieldLabel}>MUSKELGRUPP</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, marginBottom: 20 }}
            >
              {MUSCLE_GROUPS.map(g => (
                <TouchableOpacity
                  key={g}
                  style={[s.groupChip, muscleGroup === g && s.groupChipActive]}
                  onPress={() => setMuscleGroup(g)}
                >
                  <Text style={[s.groupChipText, muscleGroup === g && s.groupChipTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[s.saveNextBtn, !machineName.trim() && s.saveNextBtnDisabled]}
              onPress={saveCurrent}
              disabled={!machineName.trim()}
            >
              <Text style={s.saveNextText}>Spara & nästa →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.nameplateBtn}
              onPress={() => { setHasResult(false); setCaptureStep('nameplate'); }}
            >
              <Text style={s.nameplateBtnText}>📷  Ta bild på namnskylt</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.retryBtn}
              onPress={() => { setHasResult(false); setMachineName(''); setMuscleGroup(''); setConfidence(0); setImagePath(null); setNameplateImagePath(null); setCaptureStep('machine'); }}
            >
              <Text style={s.retryText}>↩ Skanna om</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View style={s.bottomBar}>
          {scanning ? (
            <View style={s.scanningBox}>
              <ActivityIndicator color="#f04a18" size="large" />
              <Text style={s.scanningText}>AI identifierar maskinen...</Text>
            </View>
          ) : (
            <>
              <View style={s.stepBadge}>
                <Text style={s.stepBadgeText}>
                  {captureStep === 'machine' ? 'Fotografera maskinen' : 'Fota namnskylten'}
                </Text>
              </View>
              <TouchableOpacity style={s.captureBtn} onPress={captureStep === 'machine' ? captureMachine : captureNameplate}>
                <View style={s.captureBtnInner} />
              </TouchableOpacity>
              <Text style={s.hint}>
                {captureStep === 'machine'
                  ? 'Fota maskinen — AI identifierar automatiskt'
                  : 'AI osäker — fota namnskylten för bättre resultat'}
              </Text>
              <TouchableOpacity style={s.manualBtn} onPress={() => {
                if (captureStep === 'machine') setCaptureStep('nameplate');
                else setHasResult(true);
              }}>
                <Text style={s.manualText}>
                  {captureStep === 'machine' ? 'Hoppa över →' : '✏️  Ange manuellt'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Setup / gym info modal */}
      <Modal visible={showSetup} transparent animationType="slide">
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>På vilket gym scannar du?</Text>

            <Text style={s.fieldLabel}>STAD</Text>
            <TextInput
              style={s.input}
              placeholder="t.ex. Stockholm"
              placeholderTextColor="#7a85a0"
              value={city}
              onChangeText={setCity}
            />

            <Text style={s.fieldLabel}>GYM (valfritt)</Text>
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
                  onPress={() => { setGym(name); setShowCustomGym(false); setCustomGym(''); }}
                >
                  <Text style={[s.gymChipText, activeGym === name && s.gymChipTextActive]}>{name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[s.gymChip, showCustomGym && s.gymChipActive]}
                onPress={() => { setGym(''); setShowCustomGym(true); }}
              >
                <Text style={[s.gymChipText, showCustomGym && s.gymChipTextActive]}>Annat</Text>
              </TouchableOpacity>
            </ScrollView>

            {showCustomGym && (
              <TextInput
                style={[s.input, { marginBottom: 16 }]}
                placeholder="Gymnamn..."
                placeholderTextColor="#7a85a0"
                value={customGym}
                onChangeText={setCustomGym}
              />
            )}

            <TouchableOpacity style={s.startBtn} onPress={() => setShowSetup(false)}>
              <Text style={s.startBtnText}>Börja skanna  →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.cancelModalBtn}
              onPress={() => savedCount > 0 ? setShowSetup(false) : router.back()}
            >
              <Text style={s.cancelModalText}>
                {savedCount > 0 ? 'Tillbaka till skanning' : 'Avbryt'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const ACCENT = '#f04a18';

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#000' },
  camera:             { flex: 1 },
  permContainer:      { flex: 1, backgroundColor: '#0b0d13', alignItems: 'center', justifyContent: 'center', padding: 32 },
  permText:           { color: '#dde3f0', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  permBtn:            { backgroundColor: ACCENT, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  permBtnText:        { color: '#fff', fontWeight: '700', fontSize: 16 },
  overlay:            { position: 'absolute', inset: 0 },
  corner:             { position: 'absolute', width: 30, height: 30, borderColor: ACCENT, borderTopWidth: 3, borderLeftWidth: 3, top: '25%', left: '15%', borderRadius: 4 },
  cornerTR:           { left: undefined, right: '15%', borderLeftWidth: 0, borderRightWidth: 3 },
  cornerBL:           { top: undefined, bottom: '45%', borderTopWidth: 0, borderBottomWidth: 3 },
  cornerBR:           { top: undefined, bottom: '45%', left: undefined, right: '15%', borderTopWidth: 0, borderBottomWidth: 3, borderLeftWidth: 0, borderRightWidth: 3 },
  topBar:             { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, paddingTop: 60 },
  doneBtn:            { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  doneBtnText:        { color: '#fff', fontWeight: '700', fontSize: 14 },
  locationBadge:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' },
  locationText:       { color: '#fff', fontSize: 12, fontWeight: '600' },
  settingsBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  settingsText:       { fontSize: 16 },
  counterBubble:      { position: 'absolute', top: '20%', right: 20, backgroundColor: ACCENT, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', minWidth: 60 },
  counterNum:         { color: '#fff', fontSize: 26, fontWeight: '900', lineHeight: 30 },
  counterLabel:       { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '600', textAlign: 'center' },
  bottomBar:          { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: 48, gap: 12 },
  captureBtn:         { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  captureBtnInner:    { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  hint:               { color: 'rgba(255,255,255,0.6)', fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
  manualBtn:          { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  manualText:         { color: '#fff', fontSize: 14, fontWeight: '600' },
  scanningBox:        { alignItems: 'center', gap: 12 },
  scanningText:       { color: '#fff', fontSize: 14 },
  stepBadge:          { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  stepBadgeText:      { color: '#fff', fontSize: 13, fontWeight: '700' },
  machinePreview:     { width: '100%', height: 200, borderRadius: 14, marginBottom: 16, backgroundColor: '#242840' },
  resultScroll:       { position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '70%' },
  resultCard:         { backgroundColor: '#141720', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  resultHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  dot:                { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1ecfa4' },
  resultHeaderText:   { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#1ecfa4' },
  fieldLabel:         { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#7a85a0', marginBottom: 8 },
  nameInput:          { backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 14, fontSize: 18, fontWeight: '700', color: '#dde3f0', marginBottom: 16 },
  groupChip:          { backgroundColor: '#242840', borderWidth: 1, borderColor: '#22273a', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 7 },
  groupChipActive:    { backgroundColor: ACCENT, borderColor: ACCENT },
  groupChipText:      { fontSize: 13, fontWeight: '600', color: '#7a85a0' },
  groupChipTextActive:{ color: '#fff' },
  retryBtn:           { flex: 1, backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 14, alignItems: 'center' },
  retryText:          { color: '#7a85a0', fontSize: 14, fontWeight: '600' },
  saveNextBtn:        { backgroundColor: '#1ecfa4', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 10 },
  nameplateBtn:       { backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 10 },
  nameplateBtnText:   { color: '#dde3f0', fontSize: 14, fontWeight: '600' },
  saveNextBtnDisabled:{ opacity: 0.4 },
  saveNextText:       { color: '#000', fontSize: 15, fontWeight: '700' },
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard:          { backgroundColor: '#141720', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 48 },
  modalTitle:         { fontSize: 22, fontWeight: '800', color: '#dde3f0', marginBottom: 20, letterSpacing: -0.4 },
  input:              { backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 16, fontSize: 17, color: '#dde3f0', marginBottom: 16 },
  gymChip:            { backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8 },
  gymChipActive:      { backgroundColor: ACCENT, borderColor: ACCENT },
  gymChipText:        { fontSize: 13, fontWeight: '600', color: '#7a85a0' },
  gymChipTextActive:  { color: '#fff' },
  startBtn:           { backgroundColor: ACCENT, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 },
  startBtnText:       { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelModalBtn:     { alignItems: 'center', padding: 8 },
  cancelModalText:    { color: '#7a85a0', fontSize: 14 },
});
