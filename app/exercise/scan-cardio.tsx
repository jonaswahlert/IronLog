import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Image,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import { addExercise } from '../../lib/database';
import { readCardioDisplay } from '../../lib/claude';
import { resolveImagePath } from '../../lib/imagePaths';
import { useLang } from '../../lib/LanguageContext';

const GOLD = '#f5c842';

export default function ScanCardioScreen() {
  const { lang } = useLang();
  const params = useLocalSearchParams<{
    sessionId: string; city?: string; gym?: string;
    machineId?: string; machineType?: string;
    machineImagePath?: string; machineConfidence?: string;
  }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning]     = useState(false);
  const [imagePath, setImagePath]   = useState<string | null>(null);
  const [hasResult, setHasResult]   = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [saving, setSaving]         = useState(false);

  const [distance, setDistance]   = useState('');
  const [duration, setDuration]   = useState('');
  const [speed, setSpeed]         = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [calories, setCalories]   = useState('');
  const [floors, setFloors]       = useState('');
  const [incline, setIncline]     = useState('');

  const cameraRef = useRef<CameraView>(null);

  async function capture() {
    if (!cameraRef.current || scanning) return;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      if (!photo) return;
      const dest = FileSystem.documentDirectory + `cardio_${Date.now()}.jpg`;
      await FileSystem.moveAsync({ from: photo.uri, to: dest });
      setImagePath(dest);
      const ai = await readCardioDisplay(photo.base64 ?? '');
      if (ai.error) {
        Alert.alert('AI-fel', `Gemini API returnerade ett fel:\n\n${ai.error}\n\nKontrollera API-nyckeln i appen.`);
      }
      if (ai.distance_km != null)    setDistance(String(ai.distance_km));
      if (ai.duration_min != null)   setDuration(String(ai.duration_min));
      if (ai.avg_speed_kmh != null)  setSpeed(String(ai.avg_speed_kmh));
      if (ai.avg_heart_rate != null) setHeartRate(String(ai.avg_heart_rate));
      if (ai.calories != null)       setCalories(String(ai.calories));
      if (ai.floors_climbed != null) setFloors(String(ai.floors_climbed));
      if (ai.incline_pct != null)    setIncline(String(ai.incline_pct));
      setConfidence(ai.confidence ?? 0);
      setHasResult(true);
    } finally {
      setScanning(false);
    }
  }

  function save() {
    setSaving(true);
    addExercise({
      session_id:         Number(params.sessionId),
      machine_id:         params.machineId ? Number(params.machineId) : null,
      machine_type:       params.machineType ?? null,
      machine_confidence: params.machineConfidence ? Number(params.machineConfidence) : null,
      machine_image_path: params.machineImagePath ?? null,
      muscle_group:       'Cardio',
      weight_kg:          null,
      weight_confidence:  null,
      weight_image_path:  null,
      sets:               null,
      reps:               null,
      notes:              null,
      distance_km:        distance.trim()   ? parseFloat(distance)   : null,
      duration_min:       duration.trim()   ? parseFloat(duration)   : null,
      avg_speed_kmh:      speed.trim()      ? parseFloat(speed)      : null,
      avg_heart_rate:     heartRate.trim()  ? parseInt(heartRate)    : null,
      calories:           calories.trim()   ? parseInt(calories)     : null,
      floors_climbed:     floors.trim()     ? parseInt(floors)       : null,
      incline_pct:        incline.trim()    ? parseFloat(incline)    : null,
      cardio_image_path:  imagePath,
    });
    router.replace('/(tabs)/');
  }

  const hasAnyValue = [distance, duration, speed, heartRate, calories, floors, incline].some(v => v.trim());

  if (hasResult) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#141720' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 70, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <View style={s.topBar}>
            <TouchableOpacity onPress={() => setHasResult(false)} style={s.closeBtn}>
              <Text style={s.closeText}>←</Text>
            </TouchableOpacity>
            <Text style={s.topTitle}>{lang === 'sv' ? 'Konditionspass' : 'Cardio session'}</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/')} style={s.closeBtn}>
              <Text style={s.closeText}>🏠</Text>
            </TouchableOpacity>
          </View>

          {!!params.machineType && (
            <View style={s.machineContext}>
              {!!params.machineImagePath && (
                <Image source={{ uri: resolveImagePath(params.machineImagePath)! }} style={s.machineContextImg} />
              )}
              <Text style={s.machineContextText} numberOfLines={1}>{params.machineType}</Text>
            </View>
          )}

          <View style={s.formHeader}>
            <View style={s.dot} />
            <Text style={s.resultHeaderText}>
              {confidence > 0 ? `${lang === 'sv' ? 'AI-AVLÄSNING' : 'AI READING'} · ${confidence}%` : (lang === 'sv' ? 'MANUELL INMATNING' : 'MANUAL ENTRY')}
            </Text>
          </View>

          <View style={s.fieldRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.formLabel}>{lang === 'sv' ? 'DISTANS (KM)' : 'DISTANCE (KM)'}</Text>
              <TextInput style={s.smallInput} placeholder="—" placeholderTextColor="#5a5a3a" value={distance} onChangeText={setDistance} keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.formLabel}>{lang === 'sv' ? 'TID (MIN)' : 'TIME (MIN)'}</Text>
              <TextInput style={s.smallInput} placeholder="—" placeholderTextColor="#5a5a3a" value={duration} onChangeText={setDuration} keyboardType="decimal-pad" />
            </View>
          </View>

          <View style={s.fieldRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.formLabel}>{lang === 'sv' ? 'HASTIGHET (KM/H)' : 'SPEED (KM/H)'}</Text>
              <TextInput style={s.smallInput} placeholder="—" placeholderTextColor="#5a5a3a" value={speed} onChangeText={setSpeed} keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.formLabel}>{lang === 'sv' ? 'PULS (BPM)' : 'HEART RATE (BPM)'}</Text>
              <TextInput style={s.smallInput} placeholder="—" placeholderTextColor="#5a5a3a" value={heartRate} onChangeText={setHeartRate} keyboardType="number-pad" />
            </View>
          </View>

          <View style={s.fieldRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.formLabel}>{lang === 'sv' ? 'KALORIER' : 'CALORIES'}</Text>
              <TextInput style={s.smallInput} placeholder="—" placeholderTextColor="#5a5a3a" value={calories} onChangeText={setCalories} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.formLabel}>{lang === 'sv' ? 'VÅNINGAR/STEG' : 'FLOORS/STEPS'}</Text>
              <TextInput style={s.smallInput} placeholder="—" placeholderTextColor="#5a5a3a" value={floors} onChangeText={setFloors} keyboardType="number-pad" />
            </View>
          </View>

          <Text style={s.formLabel}>{lang === 'sv' ? 'LUTNING/MOTSTÅND (%)' : 'INCLINE/RESISTANCE (%)'}</Text>
          <TextInput style={s.smallInput} placeholder="—" placeholderTextColor="#5a5a3a" value={incline} onChangeText={setIncline} keyboardType="decimal-pad" />

          <TouchableOpacity
            style={[s.confirmBtn, (!hasAnyValue || saving) && s.confirmBtnDisabled]}
            onPress={save}
            disabled={!hasAnyValue || saving}
          >
            <Text style={s.confirmBtnText}>{saving ? (lang === 'sv' ? 'Sparar...' : 'Saving...') : (lang === 'sv' ? '✓ Spara övning' : '✓ Save exercise')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (!permission) return <View style={s.container} />;
  if (!permission.granted) {
    return (
      <View style={s.permContainer}>
        <Text style={s.permText}>{lang === 'sv' ? 'IronLog behöver åtkomst till kameran.' : 'IronLog needs camera access.'}</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <Text style={s.permBtnText}>{lang === 'sv' ? 'Tillåt kamera' : 'Allow Camera'}</Text>
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
        <Text style={s.topTitle}>{lang === 'sv' ? 'Konditionspass' : 'Cardio session'}</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/')} style={s.closeBtn}>
          <Text style={s.closeText}>🏠</Text>
        </TouchableOpacity>
      </View>

      {!!params.machineType && (
        <View style={s.machineContextOverlay}>
          {!!params.machineImagePath && (
            <Image source={{ uri: resolveImagePath(params.machineImagePath)! }} style={s.machineContextImg} />
          )}
          <Text style={s.machineContextText} numberOfLines={1}>{params.machineType}</Text>
        </View>
      )}

      <View style={s.bottomBar}>
        {scanning
          ? (
            <View style={s.scanningBox}>
              <ActivityIndicator color={GOLD} size="large" />
              <Text style={s.scanningText}>{lang === 'sv' ? 'AI läser av displayen...' : 'AI is reading the display...'}</Text>
            </View>
          )
          : (
            <>
              <TouchableOpacity style={s.captureBtn} onPress={capture}>
                <View style={s.captureBtnInner} />
              </TouchableOpacity>
              <Text style={s.hint}>
                {lang === 'sv' ? 'Fota displayen när passet är avslutat' : 'Photograph the display when the workout is done'}
              </Text>
              <TouchableOpacity style={s.manualBtn} onPress={() => setHasResult(true)}>
                <Text style={s.manualText}>✏️  {lang === 'sv' ? 'Ange manuellt' : 'Enter manually'}</Text>
              </TouchableOpacity>
            </>
          )
        }
      </View>
    </View>
  );
}

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
  closeText:        { color: '#fff', fontSize: 16 },
  topTitle:         { fontSize: 18, fontWeight: '700', color: '#fff' },
  machineContextOverlay: { position: 'absolute', top: 128, left: 24, right: 24, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, padding: 8 },
  machineContext:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 12, padding: 8, marginBottom: 16 },
  machineContextImg: { width: 52, height: 52, borderRadius: 10 },
  machineContextText: { color: '#dde3f0', fontSize: 13, fontWeight: '600', flexShrink: 1 },
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
  formHeader:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, marginTop: 4 },
  formLabel:        { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#7a85a0', marginBottom: 8 },
  fieldRow:         { flexDirection: 'row', gap: 12 },
  smallInput:       { backgroundColor: '#2a2208', borderWidth: 1.5, borderColor: GOLD, borderRadius: 12, padding: 12, fontSize: 20, fontWeight: '800', color: GOLD, textAlign: 'center', marginBottom: 16 },
  confirmBtn:       { backgroundColor: GOLD, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  confirmBtnDisabled: { backgroundColor: '#5a5010' },
  confirmBtnText:   { color: '#000', fontSize: 16, fontWeight: '700' },
});
