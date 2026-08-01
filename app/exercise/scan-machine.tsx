import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Image,
  StyleSheet, ActivityIndicator, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import { saveMachine, machineExists } from '../../lib/database';
import { MUSCLE_GROUPS } from '../../lib/muscles';
import { useTranslation } from '../../lib/i18n';
import { identifyMachine, readNameplateText } from '../../lib/claude';
import { resolveImagePath } from '../../lib/imagePaths';

type Step = 'machine' | 'nameplate' | 'result';

export default function ScanMachineScreen() {
  const t = useTranslation();
  const { sessionId, city, gym } = useLocalSearchParams<{ sessionId: string; city?: string; gym?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep]                       = useState<Step>('machine');
  const [capturing, setCapturing]             = useState(false);
  const [machineImagePath, setMachineImagePath] = useState<string | null>(null);
  const [nameplateImagePath, setNameplateImagePath] = useState<string | null>(null);
  const [machineName, setMachineName]         = useState('');
  const [selectedGroup, setSelectedGroup]     = useState('');
  const [confidence, setConfidence]           = useState(0);
  const cameraRef = useRef<CameraView>(null);

  async function captureMachine() {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
      if (!photo) { setStep('nameplate'); return; }
      const dest = FileSystem.documentDirectory + `machine_${Date.now()}.jpg`;
      await FileSystem.moveAsync({ from: photo.uri, to: dest });
      setMachineImagePath(dest);
      const ai = await identifyMachine(photo.base64 ?? '');
      setMachineName(ai.machine_type ?? '');
      setSelectedGroup(ai.muscle_group ?? '');
      setConfidence(ai.confidence ?? 0);
      setStep('result');
    } catch {
      setMachineImagePath(null);
      setStep('nameplate');
    } finally {
      setCapturing(false);
    }
  }

  async function captureNameplate() {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      if (!photo) return;
      const dest = FileSystem.documentDirectory + `nameplate_${Date.now()}.jpg`;
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
      setCapturing(false);
      setStep('result');
    }
  }

  function confirm() {
    if (!machineName.trim()) return;
    const cityVal = city || null;
    const gymVal  = gym  || null;

    const doSave = () => {
      const machine = saveMachine({
        name:                 machineName.trim(),
        image_path:           machineImagePath,
        city:                 cityVal,
        gym:                  gymVal,
        muscle_group:         selectedGroup || null,
        nameplate_image_path: nameplateImagePath,
      });
      router.push({
        pathname: '/exercise/scan-weight',
        params: {
          sessionId,
          city:              city ?? '',
          gym:               gym ?? '',
          machineId:         String(machine.id),
          machineType:       machine.name,
          machineImagePath:  machineImagePath ?? '',
          machineConfidence: String(confidence),
          muscleGroup:       selectedGroup,
        },
      });
    };

    if (machineExists(machineName.trim(), cityVal, gymVal)) {
      Alert.alert(
        'Maskin finns redan',
        `"${machineName.trim()}" är redan registrerad${cityVal ? ` på ${[gymVal, cityVal].filter(Boolean).join(', ')}` : ''}. Är det en annan övning på samma maskin? Då kan du spara den som en till variant — fotot hjälper dig skilja dem åt i listan.`,
        [
          { text: 'Avbryt', style: 'cancel' },
          { text: 'Spara ändå', onPress: doSave },
        ]
      );
      return;
    }
    doSave();
  }

  function skipToNew() {
    router.push({
      pathname: '/exercise/new',
      params: {
        sessionId,
        city:        city ?? '',
        gym:         gym ?? '',
        machineType: machineName.trim(),
        muscleGroup: selectedGroup,
      },
    });
  }

  function reset() {
    setStep('machine');
    setMachineImagePath(null);
    setNameplateImagePath(null);
    setMachineName('');
    setSelectedGroup('');
    setConfidence(0);
  }

  function goBack() {
    if (step === 'nameplate') setStep('result');
    else router.back();
  }

  if (!permission) return <View style={s.container} />;
  if (!permission.granted) {
    return (
      <View style={s.permContainer}>
        <Text style={s.permText}>{t('camera_permission')}</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <Text style={s.permBtnText}>{t('allow_camera')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'result') {
    return (
      <KeyboardAvoidingView style={s.resultContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.resultTopBar}>
          <TouchableOpacity onPress={goBack} style={s.iconBtn}>
            <Text style={s.iconBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={s.resultTitle}>{t('identify_machine')}</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/')} style={s.iconBtn}>
            <Text style={s.iconBtnText}>🏠</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
          {machineImagePath && (
            <Image source={{ uri: resolveImagePath(machineImagePath)! }} style={s.machinePreview} resizeMode="cover" />
          )}

          <View style={s.resultHeader}>
            <View style={s.dot} />
            <Text style={s.resultHeaderText}>
              {confidence > 0 ? `${t('ai_done')} · ${confidence}%` : t('manual_entry')}
            </Text>
          </View>

          <Text style={s.fieldLabel}>{t('machine')}</Text>
          <TextInput
            style={s.nameInput}
            placeholder={t('enter_machine_name')}
            placeholderTextColor="#7a85a0"
            value={machineName}
            onChangeText={setMachineName}
          />

          <Text style={s.fieldLabel}>{t('muscle_group')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20 }}>
            {MUSCLE_GROUPS.map(g => (
              <TouchableOpacity key={g} style={[s.groupChip, selectedGroup === g && s.groupChipActive]} onPress={() => setSelectedGroup(g)}>
                <Text style={[s.groupChipText, selectedGroup === g && s.groupChipTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={[s.confirmBtn, !machineName.trim() && s.confirmBtnDisabled]} onPress={confirm} disabled={!machineName.trim()}>
            <Text style={s.confirmBtnText}>{t('save_and_continue')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.nameplateBtn} onPress={() => setStep('nameplate')}>
            <Text style={s.nameplateBtnText}>📷  Ta bild på namnskylt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.skipBtn} onPress={skipToNew}>
            <Text style={s.skipText}>Fortsätt utan att spara maskin</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.retryBtn} onPress={reset}>
            <Text style={s.retryText}>{t('retake')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
        <TouchableOpacity onPress={goBack} style={s.iconBtn}>
          <Text style={s.iconBtnText}>{step === 'machine' ? '✕' : '←'}</Text>
        </TouchableOpacity>
        <View style={s.stepPill}>
          <Text style={s.stepPillText}>
            {step === 'machine' ? 'Fotografera maskinen' : 'Fota namnskylten'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/')} style={s.iconBtn}>
          <Text style={s.iconBtnText}>🏠</Text>
        </TouchableOpacity>
      </View>

      <View style={s.bottomBar}>
        {capturing ? (
          <View style={s.scanningBox}>
            <ActivityIndicator color="#f04a18" size="large" />
            <Text style={s.scanningText}>AI identifierar...</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity style={s.captureBtn} onPress={step === 'machine' ? captureMachine : captureNameplate}>
              <View style={s.captureBtnInner} />
            </TouchableOpacity>
            <Text style={s.hint}>
              {step === 'machine'
                ? 'Fota maskinen — AI identifierar automatiskt'
                : 'AI osäker — fota namnskylten för bättre resultat'}
            </Text>
            {step === 'machine' ? (
              <TouchableOpacity style={s.manualBtn} onPress={() => setStep('nameplate')}>
                <Text style={s.manualText}>Hoppa över →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.manualBtn} onPress={() => setStep('result')}>
                <Text style={s.manualText}>✏️  Ange manuellt</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
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
  topBar:             { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, gap: 12 },
  iconBtn:            { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  iconBtnText:        { color: '#fff', fontSize: 16 },
  stepPill:           { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, alignItems: 'center' },
  stepPillText:       { color: '#fff', fontSize: 13, fontWeight: '700' },
  bottomBar:          { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: 48, gap: 12 },
  captureBtn:         { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  captureBtnInner:    { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  hint:               { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  manualBtn:          { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  manualText:         { color: '#fff', fontSize: 14, fontWeight: '600' },
  scanningBox:        { alignItems: 'center', gap: 12 },
  scanningText:       { color: '#fff', fontSize: 14 },
  resultContainer:    { flex: 1, backgroundColor: '#0b0d13' },
  resultTopBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  resultTitle:        { fontSize: 17, fontWeight: '700', color: '#dde3f0' },
  machinePreview:     { width: '100%', height: 200, borderRadius: 16, marginBottom: 20, backgroundColor: '#1c2030' },
  resultHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  dot:                { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1ecfa4' },
  resultHeaderText:   { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#1ecfa4' },
  fieldLabel:         { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#7a85a0', marginBottom: 8 },
  nameInput:          { backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 14, fontSize: 18, fontWeight: '700', color: '#dde3f0', marginBottom: 16 },
  groupChip:          { backgroundColor: '#242840', borderWidth: 1, borderColor: '#22273a', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 7 },
  groupChipActive:    { backgroundColor: ACCENT, borderColor: ACCENT },
  groupChipText:      { fontSize: 13, fontWeight: '600', color: '#7a85a0' },
  groupChipTextActive:{ color: '#fff' },
  confirmBtn:         { backgroundColor: '#1ecfa4', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 },
  nameplateBtn:       { backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 10 },
  nameplateBtnText:   { color: '#dde3f0', fontSize: 14, fontWeight: '600' },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText:     { color: '#000', fontSize: 16, fontWeight: '700' },
  skipBtn:            { alignItems: 'center', padding: 8, marginBottom: 4 },
  skipText:           { color: '#7a85a0', fontSize: 13 },
  retryBtn:           { alignItems: 'center', padding: 8 },
  retryText:          { color: '#7a85a0', fontSize: 14 },
});
