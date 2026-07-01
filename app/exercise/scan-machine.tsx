import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { router, useLocalSearchParams } from 'expo-router';
import { saveMachine } from '../../lib/database';
import { MUSCLE_GROUPS } from '../../lib/muscles';

type AIResult = { machine_type: string; confidence: number; muscle_group: string };

export default function ScanMachineScreen() {
  const { sessionId, city } = useLocalSearchParams<{ sessionId: string; city?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning]         = useState(false);
  const [result, setResult]             = useState<AIResult | null>(null);
  const [imagePath, setImagePath]       = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [machineName, setMachineName]   = useState('');
  const cameraRef = useRef<CameraView>(null);

  async function capture() {
    if (!cameraRef.current || scanning) return;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      if (!photo) return;
      const dest = FileSystem.documentDirectory + `machine_${Date.now()}.jpg`;
      await FileSystem.moveAsync({ from: photo.uri, to: dest });
      setImagePath(dest);
      const ai = await identifyMachine(photo.base64 ?? '');
      setResult(ai);
      setMachineName(ai.machine_type);
      setSelectedGroup(ai.muscle_group);
    } finally {
      setScanning(false);
    }
  }

  function confirm() {
    if (!result || !machineName) return;
    const machine = saveMachine({
      name:         machineName,
      image_path:   imagePath,
      city:         city || null,
      muscle_group: selectedGroup || null,
    });
    router.push({
      pathname: '/exercise/scan-weight',
      params: {
        sessionId,
        city:              city ?? '',
        machineId:         String(machine.id),
        machineType:       machine.name,
        machineImagePath:  imagePath ?? '',
        machineConfidence: String(result.confidence),
        muscleGroup:       selectedGroup,
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
        <Text style={s.topTitle}>Identifiera maskin</Text>
      </View>

      {result ? (
        <ScrollView style={s.resultScroll} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={s.resultCard}>
            <View style={s.resultHeader}>
              <View style={s.dot} />
              <Text style={s.resultHeaderText}>AI-IDENTIFIERING KLAR</Text>
            </View>
            <Text style={s.machineName}>{machineName}</Text>
            <Text style={s.confText}>Konfidensgrad {result.confidence}%</Text>

            <Text style={s.fieldLabel}>MUSKELGRUPP</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20 }}>
              {MUSCLE_GROUPS.map(g => (
                <TouchableOpacity key={g} style={[s.groupChip, selectedGroup === g && s.groupChipActive]} onPress={() => setSelectedGroup(g)}>
                  <Text style={[s.groupChipText, selectedGroup === g && s.groupChipTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={s.confirmBtn} onPress={confirm}>
              <Text style={s.confirmBtnText}>✓ Spara och fortsätt</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.retryBtn} onPress={() => setResult(null)}>
              <Text style={s.retryText}>Ta om bilden</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View style={s.bottomBar}>
          {scanning
            ? <ActivityIndicator color="#f04a18" size="large" />
            : (
              <TouchableOpacity style={s.captureBtn} onPress={capture}>
                <View style={s.captureBtnInner} />
              </TouchableOpacity>
            )
          }
          <Text style={s.hint}>Rikta kameran mot maskinen och ta foto</Text>
        </View>
      )}
    </View>
  );
}

async function identifyMachine(_base64: string): Promise<AIResult> {
  await new Promise(r => setTimeout(r, 1500));
  return { machine_type: 'Kabelbröstpress', confidence: 94, muscle_group: 'Bröst' };
}

const ACCENT = '#f04a18';
const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#000' },
  camera:          { flex: 1 },
  permContainer:   { flex: 1, backgroundColor: '#0b0d13', alignItems: 'center', justifyContent: 'center', padding: 32 },
  permText:        { color: '#dde3f0', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  permBtn:         { backgroundColor: ACCENT, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  permBtnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
  overlay:         { position: 'absolute', inset: 0 },
  corner:          { position: 'absolute', width: 30, height: 30, borderColor: ACCENT, borderTopWidth: 3, borderLeftWidth: 3, top: '25%', left: '15%', borderRadius: 4 },
  cornerTR:        { left: undefined, right: '15%', borderLeftWidth: 0, borderRightWidth: 3 },
  cornerBL:        { top: undefined, bottom: '45%', borderTopWidth: 0, borderBottomWidth: 3 },
  cornerBR:        { top: undefined, bottom: '45%', left: undefined, right: '15%', borderTopWidth: 0, borderBottomWidth: 3, borderLeftWidth: 0, borderRightWidth: 3 },
  topBar:          { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 24, paddingTop: 60 },
  closeBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  closeText:       { color: '#fff', fontSize: 16 },
  topTitle:        { fontSize: 18, fontWeight: '700', color: '#fff' },
  bottomBar:       { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: 48, gap: 16 },
  captureBtn:      { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  captureBtnInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  hint:            { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  resultScroll:    { position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '60%' },
  resultCard:      { backgroundColor: '#141720', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  resultHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dot:             { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1ecfa4' },
  resultHeaderText:{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#1ecfa4' },
  machineName:     { fontSize: 22, fontWeight: '800', color: '#dde3f0', letterSpacing: -0.4, marginBottom: 4 },
  confText:        { fontSize: 12, color: '#7a85a0', marginBottom: 16 },
  fieldLabel:      { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#7a85a0', marginBottom: 10 },
  groupChip:       { backgroundColor: '#242840', borderWidth: 1, borderColor: '#22273a', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 7 },
  groupChipActive: { backgroundColor: '#f04a18', borderColor: '#f04a18' },
  groupChipText:   { fontSize: 13, fontWeight: '600', color: '#7a85a0' },
  groupChipTextActive: { color: '#fff' },
  confirmBtn:      { backgroundColor: '#1ecfa4', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 },
  confirmBtnText:  { color: '#000', fontSize: 16, fontWeight: '700' },
  retryBtn:        { alignItems: 'center', padding: 8 },
  retryText:       { color: '#7a85a0', fontSize: 14 },
});
