import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  getAllMachines, getCities, getLastExerciseForMachine, getLastCity,
  Machine,
} from '../../lib/database';
import { useTranslation } from '../../lib/i18n';
import { LanguageToggle } from '../../components/LanguageToggle';
import { resolveImagePath } from '../../lib/imagePaths';

export default function SelectMachineScreen() {
  const t = useTranslation();
  const { sessionId, city: sessionCity, gym: sessionGym } = useLocalSearchParams<{ sessionId: string; city?: string; gym?: string }>();
  const [machines, setMachines]       = useState<Machine[]>([]);
  const [cities, setCities]           = useState<string[]>([]);
  const [activeCity, setActiveCity]   = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    const ms = getAllMachines();
    const cs = getCities();
    setMachines(ms);
    setCities(cs);
    // Default to session city, then last used city
    const defaultCity = sessionCity || getLastCity();
    setActiveCity(prev => prev ?? (defaultCity && cs.includes(defaultCity) ? defaultCity : null));
  }, [sessionCity]));

  function selectMachine(machine: Machine) {
    if (machine.muscle_group === 'Cardio') {
      router.push({
        pathname: '/exercise/scan-cardio',
        params: {
          sessionId,
          city:              sessionCity ?? '',
          gym:               sessionGym  ?? '',
          machineId:         String(machine.id),
          machineType:       machine.name,
          machineImagePath:  machine.image_path ?? '',
          machineConfidence: '100',
        },
      });
      return;
    }
    const last = getLastExerciseForMachine(machine.id);
    router.push({
      pathname: '/exercise/new',
      params: {
        sessionId,
        city:              sessionCity ?? '',
        gym:               sessionGym  ?? '',
        machineId:         String(machine.id),
        machineType:       machine.name,
        machineImagePath:  machine.image_path ?? '',
        machineConfidence: '100',
        muscleGroup:       machine.muscle_group ?? '',
        weightKg:          last?.weight_kg ? String(last.weight_kg) : '',
        weightConfidence:  last?.weight_confidence ? String(last.weight_confidence) : '',
        defaultSets:       last?.sets ? String(last.sets) : '3',
        defaultReps:       last?.reps ? String(last.reps) : '10',
      },
    });
  }

  const ORDERED = ['Bröst','Rygg','Axlar','Biceps','Triceps','Ben','Rumpa','Mage','Cardio','Övrigt', t('other')];

  const cityFiltered = activeCity ? machines.filter(m => m.city === activeCity) : machines;

  const groupsPresent = new Set(cityFiltered.map(m => m.muscle_group ?? t('other')));
  const availableGroups = [
    ...ORDERED.filter(g => groupsPresent.has(g)),
    ...[...groupsPresent].filter(g => !ORDERED.includes(g)),
  ];

  const filtered = cityFiltered.filter(m =>
    !activeGroup || (m.muscle_group ?? t('other')) === activeGroup
  );

  const grouped: Record<string, Machine[]> = {};
  for (const m of filtered) {
    const group = m.muscle_group ?? t('other');
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(m);
  }

  const sortedGroups = [
    ...ORDERED.filter(g => grouped[g]),
    ...Object.keys(grouped).filter(g => !ORDERED.includes(g)),
  ];

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>{t('select_machine')}</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/')} style={s.homeBtn}>
          <Text style={s.homeText}>🏠</Text>
        </TouchableOpacity>
        <LanguageToggle />
      </View>

      {/* City filter */}
      {cities.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          <TouchableOpacity style={[s.chip, !activeCity && s.chipActive]} onPress={() => { setActiveCity(null); setActiveGroup(null); }}>
            <Text style={[s.chipText, !activeCity && s.chipTextActive]}>{t('all_cities')}</Text>
          </TouchableOpacity>
          {cities.map(c => (
            <TouchableOpacity key={c} style={[s.chip, activeCity === c && s.chipActive]} onPress={() => { setActiveCity(c); setActiveGroup(null); }}>
              <Text style={[s.chipText, activeCity === c && s.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Muscle group filter */}
      {availableGroups.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          <TouchableOpacity style={[s.chip, !activeGroup && s.chipGroupActive]} onPress={() => setActiveGroup(null)}>
            <Text style={[s.chipText, !activeGroup && s.chipTextActive]}>Alla grupper</Text>
          </TouchableOpacity>
          {availableGroups.map(g => (
            <TouchableOpacity key={g} style={[s.chip, activeGroup === g && s.chipGroupActive]} onPress={() => setActiveGroup(g)}>
              <Text style={[s.chipText, activeGroup === g && s.chipTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {filtered.length === 0 && (
        <Text style={s.empty}>{t('no_machines_saved')}</Text>
      )}

      {sortedGroups.map(group => (
        <View key={group}>
          <Text style={s.groupLabel}>{group.toUpperCase()}</Text>
          {(grouped[group] ?? []).map(machine => {
            const last = getLastExerciseForMachine(machine.id);
            return (
              <TouchableOpacity key={machine.id} style={s.machineCard} onPress={() => selectMachine(machine)}>
                <View style={s.machineThumb}>
                  {machine.image_path
                    ? <Image source={{ uri: resolveImagePath(machine.image_path)! }} style={s.machineImg} />
                    : <Text style={{ fontSize: 32 }}>🏋️</Text>
                  }
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.machineName}>{machine.name}</Text>
                  {machine.city && <Text style={s.cityLabel}>{machine.city}{machine.gym ? ` · ${machine.gym}` : ''}</Text>}
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

      <TouchableOpacity
        style={s.scanBtn}
        onPress={() => router.push({ pathname: '/exercise/scan-machine', params: { sessionId, city: sessionCity ?? '', gym: sessionGym ?? '' } })}
      >
        <Text style={s.scanBtnText}>{t('scan_new_machine_btn')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0b0d13' },
  header:         { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 24, paddingTop: 60 },
  backBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1c2030', alignItems: 'center', justifyContent: 'center' },
  backText:       { color: '#dde3f0', fontSize: 17 },
  homeBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1c2030', alignItems: 'center', justifyContent: 'center' },
  homeText:       { fontSize: 18 },
  title:          { fontSize: 20, fontWeight: '700', color: '#dde3f0', letterSpacing: -0.4, flex: 1 },
  chipRow:        { marginBottom: 6 },
  chipGroupActive:{ backgroundColor: '#1ecfa4', borderColor: '#1ecfa4' },
  chip:           { backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 7 },
  chipActive:     { backgroundColor: '#f04a18', borderColor: '#f04a18' },
  chipText:       { fontSize: 13, fontWeight: '600', color: '#7a85a0' },
  chipTextActive: { color: '#fff' },
  empty:          { fontSize: 14, color: '#7a85a0', paddingHorizontal: 24, paddingTop: 16 },
  groupLabel:     { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: '#f04a18', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  machineCard:    { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 10 },
  machineThumb:   { width: 140, height: 140, borderRadius: 16, backgroundColor: '#242840', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  machineImg:     { width: 140, height: 140 },
  machineName:    { fontSize: 15, fontWeight: '700', color: '#dde3f0', marginBottom: 2 },
  cityLabel:      { fontSize: 11, color: '#7a85a0' },
  lastUsed:       { fontSize: 12, color: '#1ecfa4', fontWeight: '600', marginTop: 2 },
  arrow:          { fontSize: 22, color: '#7a85a0' },
  scanBtn:        { margin: 16, marginTop: 24, backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 16, alignItems: 'center' },
  scanBtnText:    { color: '#dde3f0', fontSize: 15, fontWeight: '600' },
});
