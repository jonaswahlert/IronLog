import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getAllMachines, getCities, Machine } from '../../lib/database';

export default function MachinesScreen() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [cities, setCities]     = useState<string[]>([]);
  const [activeCity, setActiveCity] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    setMachines(getAllMachines());
    setCities(getCities());
  }, []));

  const filtered = activeCity ? machines.filter(m => m.city === activeCity) : machines;

  // Gruppera: stad → muskelgrupp → maskiner
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
      <Text style={s.title}>Maskiner</Text>

      {cities.length > 0 && (
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
      )}

      {machines.length === 0 && (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🏋️</Text>
          <Text style={s.emptyTitle}>Inga maskiner ännu</Text>
          <Text style={s.emptySub}>Starta ett träningspass och skanna din första maskin.</Text>
        </View>
      )}

      {Object.entries(grouped).map(([city, muscleGroups]) => (
        <View key={city}>
          <View style={s.cityHeader}>
            <Text style={s.cityTitle}>{city}</Text>
          </View>
          {Object.entries(muscleGroups).map(([group, ms]) => (
            <View key={group}>
              <Text style={s.groupLabel}>{group.toUpperCase()}</Text>
              {ms.map(machine => (
                <View key={machine.id} style={s.machineCard}>
                  <View style={s.machineThumb}>
                    {machine.image_path ? (
                      <Image source={{ uri: machine.image_path }} style={s.machineImg} />
                    ) : (
                      <Text style={{ fontSize: 24 }}>🏋️</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.machineName}>{machine.name}</Text>
                    <View style={s.machineMeta}>
                      {machine.muscle_group && (
                        <View style={s.tag}><Text style={s.tagText}>{machine.muscle_group}</Text></View>
                      )}
                      {machine.city && (
                        <View style={s.tag}><Text style={s.tagText}>{machine.city}</Text></View>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0b0d13' },
  title:           { fontSize: 28, fontWeight: '800', color: '#dde3f0', padding: 24, paddingTop: 60, letterSpacing: -0.6 },
  chipRow:         { marginBottom: 20 },
  chip:            { backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 7 },
  chipActive:      { backgroundColor: '#f04a18', borderColor: '#f04a18' },
  chipText:        { fontSize: 13, fontWeight: '600', color: '#7a85a0' },
  chipTextActive:  { color: '#fff' },
  empty:           { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon:       { fontSize: 48, marginBottom: 16 },
  emptyTitle:      { fontSize: 18, fontWeight: '700', color: '#dde3f0', marginBottom: 8 },
  emptySub:        { fontSize: 14, color: '#7a85a0', textAlign: 'center', lineHeight: 20 },
  cityHeader:      { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#22273a' },
  cityTitle:       { fontSize: 18, fontWeight: '800', color: '#f04a18', letterSpacing: -0.3 },
  groupLabel:      { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#7a85a0', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  machineCard:     { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 10 },
  machineThumb:    { width: 56, height: 56, borderRadius: 12, backgroundColor: '#242840', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  machineImg:      { width: 56, height: 56 },
  machineName:     { fontSize: 15, fontWeight: '700', color: '#dde3f0', marginBottom: 6 },
  machineMeta:     { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag:             { backgroundColor: '#242840', borderWidth: 1, borderColor: '#22273a', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 },
  tagText:         { fontSize: 11, fontWeight: '600', color: '#7a85a0' },
});
