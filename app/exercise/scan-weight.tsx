import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';

type AIResult = { weight_kg: number; confidence: number; label: string };

export default function ScanWeightScreen() {
  const params = useLocalSearchParams<{
    sessionId: string; machineType?: string;
    machineImageUrl?: string; machineConfidence?: string;
  }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  async function capture() {
    if (!cameraRef.current || scanning) return;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      if (!photo?.base64) return;

      const filename = `${Date.now()}.jpg`;
      const binary = Uint8Array.from(atob(photo.base64), c => c.charCodeAt(0));
      const { data: uploadData } = await supabase.storage
        .from('weight-images')
        .upload(filename, binary, { contentType: 'image/jpeg' });

      const publicUrl = uploadData
        ? supabase.storage.from('weight-images').getPublicUrl(uploadData.path).data.publicUrl
        : null;

      const aiResult = await readWeight(photo.base64);
      setResult(aiResult);
      setImageUri(publicUrl ?? photo.uri);
    } finally {
      setScanning(false);
    }
  }

  function confirm() {
    if (!result) return;
    router.push({
      pathname: '/exercise/new',
      params: {
        sessionId:         params.sessionId,
        machineType:       params.machineType ?? '',
        machineImageUrl:   params.machineImageUrl ?? '',
        machineConfidence: params.machineConfidence ?? '',
        weightKg:          String(result.weight_kg),
        weightImageUrl:    imageUri ?? '',
        weightConfidence:  String(result.confidence),
      },
    });
  }

  if (!permission) return <View style={s.container} />;
  if (!permission.granted) {
    return (
      <View style={s.permContainer}>
        <Text style={s.permText}>IronLog behöver åtkomst till kameran.</Text>
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
        <TouchableOpacity onPress={() => router.back()} style={s.closeBtn}>
          <Text style={s.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={s.topTitle}>Läs av vikten</Text>
      </View>

      {result ? (
        <View style={s.resultCard}>
          <View style={s.resultHeader}>
            <View style={s.dot} />
            <Text style={s.resultHeaderText}>AI-AVLÄSNING KLAR</Text>
          </View>
          <View style={s.weightRow}>
            <Text style={s.weightNumber}>{result.weight_kg}</Text>
            <Text style={s.weightUnit}>kg</Text>
          </View>
          <Text style={s.confText}>Konfidensgrad {result.confidence}% · {result.label}</Text>
          <TouchableOpacity style={s.confirmBtn} onPress={confirm}>
            <Text style={s.confirmBtnText}>✓ Använd denna vikt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.retryBtn} onPress={() => setResult(null)}>
            <Text style={s.retryText}>Ta om bilden</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.bottomBar}>
          {scanning ? (
            <ActivityIndicator color="#f5c842" size="large" />
          ) : (
            <TouchableOpacity style={s.captureBtn} onPress={capture}>
              <View style={s.captureBtnInner} />
            </TouchableOpacity>
          )}
          <Text style={s.hint}>Rikta kameran mot viktinställningen</Text>
        </View>
      )}
    </View>
  );
}

// Placeholder — replace with real Claude Vision API call via Supabase Edge Function
async function readWeight(base64: string): Promise<AIResult> {
  await new Promise(r => setTimeout(r, 1500));
  return { weight_kg: 80, confidence: 96, label: 'Viktstack · Pin-system' };
}

const GOLD = '#f5c842';
const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#000' },
  camera:         { flex: 1 },
  permContainer:  { flex: 1, backgroundColor: '#0b0d13', alignItems: 'center', justifyContent: 'center', padding: 32 },
  permText:       { color: '#dde3f0', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  permBtn:        { backgroundColor: GOLD, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  permBtnText:    { color: '#000', fontWeight: '700', fontSize: 16 },
  overlay:        { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
  corner:         { position: 'absolute', width: 30, height: 30, borderColor: GOLD, borderTopWidth: 3, borderLeftWidth: 3, top: '25%', left: '15%', borderRadius: 4 },
  cornerTR:       { left: undefined, right: '15%', borderLeftWidth: 0, borderRightWidth: 3 },
  cornerBL:       { top: undefined, bottom: '25%', borderTopWidth: 0, borderBottomWidth: 3 },
  cornerBR:       { top: undefined, bottom: '25%', left: undefined, right: '15%', borderTopWidth: 0, borderBottomWidth: 3, borderLeftWidth: 0, borderRightWidth: 3 },
  topBar:         { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 24, paddingTop: 60 },
  closeBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  closeText:      { color: '#fff', fontSize: 16 },
  topTitle:       { fontSize: 18, fontWeight: '700', color: '#fff' },
  bottomBar:      { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: 48, gap: 16 },
  captureBtn:     { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  captureBtnInner:{ width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  hint:           { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  resultCard:     { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#141720', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  resultHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dot:            { width: 6, height: 6, borderRadius: 3, backgroundColor: GOLD },
  resultHeaderText:{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: GOLD },
  weightRow:      { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 },
  weightNumber:   { fontSize: 52, fontWeight: '900', color: GOLD, letterSpacing: -1 },
  weightUnit:     { fontSize: 20, fontWeight: '600', color: '#7a85a0' },
  confText:       { fontSize: 12, color: '#7a85a0', marginBottom: 20 },
  confirmBtn:     { backgroundColor: GOLD, borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 },
  confirmBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  retryBtn:       { alignItems: 'center', padding: 8 },
  retryText:      { color: '#7a85a0', fontSize: 14 },
});
