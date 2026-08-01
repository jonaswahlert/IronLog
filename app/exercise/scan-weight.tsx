import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Image,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from '../../lib/i18n';
import { readWeightFromImage } from '../../lib/claude';

export default function ScanWeightScreen() {
  const t = useTranslation();
  const params = useLocalSearchParams<{
    sessionId: string; city?: string; gym?: string;
    machineId?: string; machineType?: string;
    machineImagePath?: string; machineConfidence?: string; muscleGroup?: string;
  }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning]     = useState(false);
  const [imagePath, setImagePath]   = useState<string | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [confidence, setConfidence]   = useState(0);
  const [label, setLabel]             = useState('');
  const [hasResult, setHasResult]     = useState(false);
  const cameraRef = useRef<CameraView>(null);

  async function capture() {
    if (!cameraRef.current || scanning) return;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      if (!photo) return;
      const dest = FileSystem.documentDirectory + `weight_${Date.now()}.jpg`;
      await FileSystem.moveAsync({ from: photo.uri, to: dest });
      setImagePath(dest);
      const ai = await readWeightFromImage(photo.base64 ?? '');
      if (ai.error) {
        Alert.alert('AI-fel', `Gemini API returnerade ett fel:\n\n${ai.error}\n\nKontrollera API-nyckeln i appen.`);
      }
      setWeightInput(ai.weight_kg > 0 ? String(ai.weight_kg) : '');
      setConfidence(ai.confidence);
      setLabel(ai.label);
      setHasResult(true);
    } finally {
      setScanning(false);
    }
  }

  function confirm() {
    const kg = parseFloat(weightInput);
    if (!kg) return;
    router.push({
      pathname: '/exercise/new',
      params: {
        sessionId:         params.sessionId,
        city:              params.city ?? '',
        gym:               params.gym ?? '',
        machineId:         params.machineId ?? '',
        machineType:       params.machineType ?? '',
        machineImagePath:  params.machineImagePath ?? '',
        machineConfidence: params.machineConfidence ?? '',
        muscleGroup:       params.muscleGroup ?? '',
        weightKg:          String(kg),
        weightImagePath:   imagePath ?? '',
        weightConfidence:  String(confidence),
      },
    });
  }

  if (hasResult) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#141720' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 70, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <View style={s.topBar}>
            <TouchableOpacity onPress={() => { setHasResult(false); setWeightInput(''); setLabel(''); }} style={s.closeBtn}>
              <Text style={s.closeText}>←</Text>
            </TouchableOpacity>
            <Text style={s.topTitle}>{t('read_weight')}</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/')} style={s.closeBtn}>
              <Text style={s.closeText}>🏠</Text>
            </TouchableOpacity>
          </View>

          {!!params.machineType && (
            <View style={s.machineContext}>
              {!!params.machineImagePath && (
                <Image source={{ uri: params.machineImagePath }} style={s.machineContextImg} />
              )}
              <Text style={s.machineContextText} numberOfLines={1}>{params.machineType}</Text>
            </View>
          )}

          <View style={s.formHeader}>
            <View style={s.dot} />
            <Text style={s.resultHeaderText}>
              {confidence > 0 ? `${t('ai_reading_done')} · ${confidence}%` : 'MANUELL INMATNING'}
            </Text>
          </View>
          {label ? <Text style={s.labelText}>{label}</Text> : null}

          <Text style={s.formLabel}>{t('weight')} (kg)</Text>
          <TextInput
            style={s.formInput}
            placeholder="0"
            placeholderTextColor="#5a5a3a"
            value={weightInput}
            onChangeText={setWeightInput}
            keyboardType="decimal-pad"
            autoFocus
          />

          <TouchableOpacity
            style={[s.confirmBtn, !weightInput && s.confirmBtnDisabled]}
            onPress={confirm}
            disabled={!weightInput}
          >
            <Text style={s.confirmBtnText}>{t('use_this_weight')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
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
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Text style={s.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={s.topTitle}>{t('read_weight')}</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/')} style={s.closeBtn}>
          <Text style={s.closeText}>🏠</Text>
        </TouchableOpacity>
      </View>

      {!!params.machineType && (
        <View style={s.machineContextOverlay}>
          {!!params.machineImagePath && (
            <Image source={{ uri: params.machineImagePath }} style={s.machineContextImg} />
          )}
          <Text style={s.machineContextText} numberOfLines={1}>{params.machineType}</Text>
        </View>
      )}

      {hasResult ? null : (
        <View style={s.bottomBar}>
          {scanning
            ? (
              <View style={s.scanningBox}>
                <ActivityIndicator color="#f5c842" size="large" />
                <Text style={s.scanningText}>AI läser av vikten...</Text>
              </View>
            )
            : (
              <>
                <TouchableOpacity style={s.captureBtn} onPress={capture}>
                  <View style={s.captureBtnInner} />
                </TouchableOpacity>
                <Text style={s.hint}>{t('camera_hint_weight')}</Text>
                <TouchableOpacity style={s.manualBtn} onPress={() => setHasResult(true)}>
                  <Text style={s.manualText}>✏️  Ange manuellt</Text>
                </TouchableOpacity>
              </>
            )
          }
        </View>
      )}
    </View>
  );
}

const GOLD = '#f5c842';
const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#000' },
  camera:           { flex: 1 },
  permContainer:    { flex: 1, backgroundColor: '#0b0d13', alignItems: 'center', justifyContent: 'center', padding: 32 },
  permText:         { color: '#dde3f0', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  permBtn:          { backgroundColor: GOLD, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  permBtnText:      { color: '#000', fontWeight: '700', fontSize: 16 },
  overlay:          { position: 'absolute', inset: 0 },
  corner:           { position: 'absolute', width: 30, height: 30, borderColor: GOLD, borderTopWidth: 3, borderLeftWidth: 3, top: '25%', left: '15%', borderRadius: 4 },
  cornerTR:         { left: undefined, right: '15%', borderLeftWidth: 0, borderRightWidth: 3 },
  cornerBL:         { top: undefined, bottom: '45%', borderTopWidth: 0, borderBottomWidth: 3 },
  cornerBR:         { top: undefined, bottom: '45%', left: undefined, right: '15%', borderTopWidth: 0, borderBottomWidth: 3, borderLeftWidth: 0, borderRightWidth: 3 },
  topBar:           { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, paddingTop: 60 },
  closeBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  machineContextOverlay: { position: 'absolute', top: 128, left: 24, right: 24, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, padding: 8 },
  machineContext:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 12, padding: 8, marginBottom: 16 },
  machineContextImg: { width: 36, height: 36, borderRadius: 8 },
  machineContextText: { color: '#dde3f0', fontSize: 13, fontWeight: '600', flexShrink: 1 },
  closeText:        { color: '#fff', fontSize: 16 },
  topTitle:         { fontSize: 18, fontWeight: '700', color: '#fff' },
  bottomBar:        { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: 48, gap: 12 },
  captureBtn:       { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  captureBtnInner:  { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  hint:             { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  manualBtn:        { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  manualText:       { color: '#fff', fontSize: 14, fontWeight: '600' },
  scanningBox:      { alignItems: 'center', gap: 12 },
  scanningText:     { color: '#fff', fontSize: 14 },
  dot:              { width: 6, height: 6, borderRadius: 3, backgroundColor: GOLD },
  resultHeaderText: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: GOLD },
  labelText:        { fontSize: 12, color: '#7a85a0', marginBottom: 16 },
  formHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, marginTop: 20 },
  formLabel:        { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#7a85a0', marginBottom: 8 },
  formInput:        { backgroundColor: '#2a2208', borderWidth: 2, borderColor: GOLD, borderRadius: 14, padding: 16, fontSize: 48, fontWeight: '900', color: GOLD, textAlign: 'center', marginBottom: 24, letterSpacing: -1 },
  confirmBtn:       { backgroundColor: GOLD, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 },
  confirmBtnDisabled: { backgroundColor: '#5a5010' },
  confirmBtnText:   { color: '#000', fontSize: 16, fontWeight: '700' },
  retryBtn:         { alignItems: 'center', padding: 8 },
  retryText:        { color: '#7a85a0', fontSize: 14 },
});
