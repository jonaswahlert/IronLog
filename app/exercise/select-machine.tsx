import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { getAllMachines, getCities, getLastExerciseForMachine, Machine } from '../../lib/database';

export default function SelectMachineScreen() {
  const { sessionId, city: sessionCity, gym: sessionGym } = useLocalSearchParams<{ sessionId: string; city?: string; gym?: string }>();
  const [machines, setMachines]     = useState<Machine[]>([]);
  const [cities, setCities]         = useState<string[]>([]);
  const [activeCity, setActiveCity] = useState<string | null>(sessionCity || null);

  useFocusEffect(useCallback(() => {
    setMachines(getAllMachines());
    setCities(getCities());
  }, []));

  function selectMachine(machine: Machine) {
    const last = getLastExerciseForMachine(machine.id);
    router.push({
      pathname: '/exercise/new',
      params: {
        sessionId,
        city: sessionCity ?? '',
        gym:  sessionGym  ?? '',
        machineId:         String(machine.id),
        machineType:       machine.name,
        machineImagePath:  machine.image_path ?? '',
        machineConfidence: '100',
        muscleGroup:       machine.muscle_group ?? '',
        // Pre-fyll senaste värden
        weightKg:          last?.weight_kg     ? String(last.weight_kg)  : '',
        weightConfidence:  last?.weight_confidence ? String(last.weight_confidence) : '',
        defaultSets:       last?.sets          ? String(last.sets)       : '3',
        defaultReps:       last?.reps          ? String(last.reps)       : '10',
      },
    });
  }

  const filtered = activeCity ? machines.filter(m => m.city === activeCity) : machines;

  const grouped: Record<string, Record<string, Machine[]>> = {};
  for (const m of filtered) {
    const city  = m.city ?? 'Okänd ort';
    const group = m.muscle_group ?? 'Övrigt';
    if (!grouped[city]) grouped[city] = {};
    if (!grouped[city][group]) grouped[city][group] = [];
    grouped[city][group].push(m);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>Välj maskin</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        <TouchableOpacity style={[s.chip, !activeCity && s.chipActive]} onPress={() => setActiveCity(null)}>
          <Text style={[s.chipText, !activeCity && s.chipTextActive]}>Alla orter</Text>
        </TouchableOpacity>
        {cities.map(c => (
          <TouchableOpacity key={c} style={[s.chip, activeCity === c && s.chipActive]} onPress={() => setActiveCity(c)}>
            <Text style={[s.chipText, activeCity === c && s.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filtered.length === 0 && (
        <Text style={s.empty}>Inga maskiner sparade ännu.</Text>
      )}

      {Object.entries(grouped).map(([city, muscleGroups]) => (
        <View key={city}>
          <View style={s.cityHeader}>
            <Text style={s.cityTitle}>{city}</Text>
          </View>
          {Object.entries(muscleGroups).map(([group, ms]) => (
            <View key={group}>
              <Text style={s.groupLabel}>{group.toUpperCase()}</Text>
              {ms.map(machine => {
                const last = getLastExerciseForMachine(machine.id);
                return (
                  <TouchableOpacity key={machine.id} style={s.machineCard} onPress={() => selectMachine(machine)}>
                    <View style={s.machineThumb}>
                      {machine.image_path
                        ? <Image source={{ uri: machine.image_path }} style={s.machineImg} />
                        : <Text style={{ fontSize: 24 }}>🏋️</Text>
                      }
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.machineName}>{machine.name}</Text>
                      {last && (
                        <Text style={s.lastUsed}>{last.weight_kg} kg · {last.sets}×{last.reps}</Text>
                      )}
                    </View>
                    <Text style={s.arrow}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      ))}

      <TouchableOpacity
        style={s.scanBtn}
        onPress={() => router.push({ pathname: '/exercise/scan-machine', params: { sessionId, city: sessionCity ?? '', gym: sessionGym ?? '' } })}
      >
        <Text style={s.scanBtnText}>📷  Skanna ny maskin</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0b0d13' },
  header:         { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 24, paddingTop: 60 },
  backBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1c2030', alignItems: 'center', justifyContent: 'center' },
  backText:       { color: '#dde3f0', fontSize: 17 },
  title:          { fontSize: 22, fontWeight: '700', color: '#dde3f0', letterSpacing: -0.4 },
  chipRow:        { marginBottom: 16 },
  chip:           { backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 7 },
  chipActive:     { backgroundColor: '#f04a18', borderColor: '#f04a18' },
  chipText:       { fontSize: 13, fontWeight: '600', color: '#7a85a0' },
  chipTextActive: { color: '#fff' },
  empty:          { fontSize: 14, color: '#7a85a0', paddingHorizontal: 24, paddingTop: 16 },
  cityHeader:     { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#22273a' },
  cityTitle:      { fontSize: 17, fontWeight: '800', color: '#f04a18' },
  groupLabel:     { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#7a85a0', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  machineCard:    { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 10 },
  machineThumb:   { width: 52, height: 52, borderRadius: 10, backgroundColor: '#242840', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  machineImg:     { width: 52, height: 52 },
  machineName:    { fontSize: 15, fontWeight: '700', color: '#dde3f0', marginBottom: 3 },
  lastUsed:       { fontSize: 12, color: '#1ecfa4', fontWeight: '600' },
  arrow:          { fontSize: 22, color: '#7a85a0' },
  scanBtn:        { margin: 16, marginTop: 24, backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 16, alignItems: 'center' },
  scanBtnText:    { color: '#dde3f0', fontSize: 15, fontWeight: '600' },
});
