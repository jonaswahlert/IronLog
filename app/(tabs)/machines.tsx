import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Image, Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import {
  getAllMachines, getCities, getLastCity,
  updateMachine, deleteMachine, Machine,
} from '../../lib/database';
import { useTranslation } from '../../lib/i18n';
import { LanguageToggle } from '../../components/LanguageToggle';
import { MUSCLE_GROUPS } from '../../lib/muscles';
import { GYM_CHAINS } from '../../lib/gyms';
import { resolveImagePath } from '../../lib/imagePaths';

export default function MachinesScreen() {
  const t = useTranslation();
  const [machines, setMachines]       = useState<Machine[]>([]);
  const [cities, setCities]           = useState<string[]>([]);
  const [activeCity, setActiveCity]   = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [editMachine, setEditMachine] = useState<Machine | null>(null);
  const [editName, setEditName]       = useState('');
  const [editGroup, setEditGroup]     = useState('');
  const [editCity, setEditCity]           = useState('');
  const [editGym, setEditGym]             = useState('');
  const [editCustomGym, setEditCustomGym] = useState('');
  const [editShowCustom, setEditShowCustom] = useState(false);

  useFocusEffect(useCallback(() => {
    const ms = getAllMachines();
    const cs = getCities();
    setMachines(ms);
    setCities(cs);
    const last = getLastCity();
    setActiveCity(prev => prev ?? (last && cs.includes(last) ? last : null));
  }, []));

  function refresh() {
    setMachines(getAllMachines());
    setCities(getCities());
  }

  function openEdit(machine: Machine) {
    setEditMachine(machine);
    setEditName(machine.name);
    setEditGroup(machine.muscle_group ?? '');
    setEditCity(machine.city ?? '');
    const g = machine.gym ?? '';
    if (GYM_CHAINS.includes(g)) {
      setEditGym(g);
      setEditCustomGym('');
      setEditShowCustom(false);
    } else {
      setEditGym('');
      setEditCustomGym(g);
      setEditShowCustom(g !== '');
    }
  }

  function saveEdit() {
    if (!editMachine) return;
    updateMachine(editMachine.id, {
      name:         editName.trim() || editMachine.name,
      muscle_group: editGroup || null,
      city:         editCity.trim() || null,
      gym:          (editShowCustom ? editCustomGym.trim() : editGym) || null,
    });
    setEditMachine(null);
    refresh();
  }

  function confirmDelete(machine: Machine) {
    Alert.alert(t('confirm_delete'), t('delete_machine_msg'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'), style: 'destructive',
        onPress: () => { deleteMachine(machine.id); refresh(); },
      },
    ]);
  }

  const ORDERED_GROUPS = [
    'Bröst', 'Rygg', 'Axlar', 'Biceps', 'Triceps',
    'Ben', 'Rumpa', 'Mage', 'Cardio', 'Övrigt', t('other'),
  ];

  // Step 1: filter by city
  const cityFiltered = machines.filter(m => !activeCity || m.city === activeCity);

  // Step 2: derive available muscle groups from city-filtered set (ordered)
  const groupsPresent = new Set(cityFiltered.map(m => m.muscle_group ?? t('other')));
  const availableGroups = [
    ...ORDERED_GROUPS.filter(g => groupsPresent.has(g)),
    ...[...groupsPresent].filter(g => !ORDERED_GROUPS.includes(g)),
  ];

  // Step 3: apply muscle group filter
  const filtered = cityFiltered.filter(m =>
    !activeGroup || (m.muscle_group ?? t('other')) === activeGroup
  );

  // Step 4: group for display
  const grouped: Record<string, Machine[]> = {};
  for (const m of filtered) {
    const group = m.muscle_group ?? t('other');
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(m);
  }
  const sortedGroups = [
    ...ORDERED_GROUPS.filter(g => grouped[g]),
    ...Object.keys(grouped).filter(g => !ORDERED_GROUPS.includes(g)),
  ];

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.headerRow}>
        <Text style={s.title}>{t('machines')}</Text>
        <LanguageToggle />
      </View>

      <TouchableOpacity style={s.scanBtn} onPress={() => router.push('/gym-scan')}>
        <Text style={s.scanBtnIcon}>📷</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.scanBtnTitle}>{t('scan_machines_title')}</Text>
          <Text style={s.scanBtnSub}>{t('scan_machines_sub')}</Text>
        </View>
        <Text style={s.scanBtnArrow}>→</Text>
      </TouchableOpacity>

      {/* City filter */}
      {cities.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
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

      {machines.length === 0 && (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🏋️</Text>
          <Text style={s.emptyTitle}>{t('no_machines_title')}</Text>
          <Text style={s.emptySub}>{t('no_machines_sub')}</Text>
        </View>
      )}

      {sortedGroups.map(group => (
        <View key={group}>
          <Text style={s.groupLabel}>{group.toUpperCase()}</Text>
          {(grouped[group] ?? []).map(machine => (
            <View key={machine.id} style={s.machineCard}>
              <View style={s.machineImgWrap}>
                {machine.image_path
                  ? <Image source={{ uri: resolveImagePath(machine.image_path)! }} style={s.machineImg} resizeMode="contain" />
                  : <Text style={{ fontSize: 48 }}>🏋️</Text>
                }
              </View>
              <View style={s.machineCardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.machineName}>{machine.name}</Text>
                  <View style={s.machineMeta}>
                    {machine.gym  && <View style={s.tag}><Text style={s.tagText}>{machine.gym}</Text></View>}
                    {machine.city && <View style={s.tag}><Text style={s.tagText}>{machine.city}</Text></View>}
                  </View>
                </View>
                <TouchableOpacity style={s.editBtn} onPress={() => openEdit(machine)}>
                  <Text style={s.editText}>✎</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.delBtn} onPress={() => confirmDelete(machine)}>
                  <Text style={s.delText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ))}

      {/* Edit modal */}
      <Modal visible={!!editMachine} transparent animationType="slide">
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{t('edit_machine')}</Text>

            <Text style={s.fieldLabel}>{t('machine')}</Text>
            <TextInput
              style={s.input}
              placeholder={t('enter_machine_name')}
              placeholderTextColor="#7a85a0"
              value={editName}
              onChangeText={setEditName}
            />

            <Text style={s.fieldLabel}>{t('muscle_group')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingBottom: 8 }} style={{ marginBottom: 16 }}>
              {MUSCLE_GROUPS.map(g => (
                <TouchableOpacity key={g} style={[s.groupChip, editGroup === g && s.groupChipActive]} onPress={() => setEditGroup(g)}>
                  <Text style={[s.groupChipText, editGroup === g && s.groupChipTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.fieldLabel}>{t('city').replace(':', '').toUpperCase()}</Text>
            <TextInput
              style={s.input}
              placeholder="t.ex. Stockholm"
              placeholderTextColor="#7a85a0"
              value={editCity}
              onChangeText={setEditCity}
            />

            <Text style={s.fieldLabel}>GYM (VALFRITT)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingBottom: 4 }} style={{ marginBottom: 12 }}>
              {GYM_CHAINS.map(name => (
                <TouchableOpacity
                  key={name}
                  style={[s.groupChip, !editShowCustom && editGym === name && s.groupChipActive]}
                  onPress={() => { setEditGym(name); setEditCustomGym(''); setEditShowCustom(false); }}
                >
                  <Text style={[s.groupChipText, !editShowCustom && editGym === name && s.groupChipTextActive]}>{name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[s.groupChip, editShowCustom && s.groupChipActive]}
                onPress={() => { setEditGym(''); setEditShowCustom(true); }}
              >
                <Text style={[s.groupChipText, editShowCustom && s.groupChipTextActive]}>Annat</Text>
              </TouchableOpacity>
            </ScrollView>
            {editShowCustom && (
              <TextInput
                style={s.input}
                placeholder="Ange gymnamn..."
                placeholderTextColor="#7a85a0"
                value={editCustomGym}
                onChangeText={setEditCustomGym}
              />
            )}

            <TouchableOpacity style={s.saveBtn} onPress={saveEdit}>
              <Text style={s.saveBtnText}>{t('save')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setEditMachine(null)}>
              <Text style={s.cancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0b0d13' },
  headerRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8 },
  title:           { fontSize: 28, fontWeight: '800', color: '#dde3f0', letterSpacing: -0.6 },
  scanBtn:         { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#f04a18', borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 16 },
  scanBtnIcon:     { fontSize: 24 },
  scanBtnTitle:    { fontSize: 14, fontWeight: '700', color: '#dde3f0', marginBottom: 2 },
  scanBtnSub:      { fontSize: 12, color: '#7a85a0' },
  scanBtnArrow:    { color: '#f04a18', fontSize: 18, fontWeight: '700' },
  chipRow:         { marginBottom: 6 },
  chip:            { backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 7 },
  chipActive:      { backgroundColor: '#f04a18', borderColor: '#f04a18' },
  chipGroupActive: { backgroundColor: '#1ecfa4', borderColor: '#1ecfa4' },
  chipText:        { fontSize: 13, fontWeight: '600', color: '#7a85a0' },
  chipTextActive:  { color: '#fff' },
  empty:           { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon:       { fontSize: 48, marginBottom: 16 },
  emptyTitle:      { fontSize: 18, fontWeight: '700', color: '#dde3f0', marginBottom: 8 },
  emptySub:        { fontSize: 14, color: '#7a85a0', textAlign: 'center', lineHeight: 20 },
  groupLabel:      { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: '#f04a18', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 },
  machineCard:     { backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 16, marginHorizontal: 16, marginBottom: 16, overflow: 'hidden' },
  machineImgWrap:  { width: '100%', aspectRatio: 4 / 3, backgroundColor: '#242840', alignItems: 'center', justifyContent: 'center' },
  machineImg:      { width: '100%', height: '100%' },
  machineCardRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  machineName:     { fontSize: 16, fontWeight: '700', color: '#dde3f0', marginBottom: 6 },
  machineMeta:     { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag:             { backgroundColor: '#242840', borderWidth: 1, borderColor: '#22273a', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 },
  tagText:         { fontSize: 11, fontWeight: '600', color: '#7a85a0' },
  editBtn:         { width: 32, height: 32, borderRadius: 8, backgroundColor: '#242840', alignItems: 'center', justifyContent: 'center' },
  editText:        { color: '#7a85a0', fontSize: 16 },
  delBtn:          { width: 32, height: 32, borderRadius: 8, backgroundColor: '#2a1010', alignItems: 'center', justifyContent: 'center' },
  delText:         { color: '#f04a18', fontSize: 14, fontWeight: '700' },
  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard:       { backgroundColor: '#141720', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 48 },
  modalTitle:      { fontSize: 22, fontWeight: '800', color: '#dde3f0', marginBottom: 20, letterSpacing: -0.4 },
  fieldLabel:      { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: '#7a85a0', marginBottom: 8 },
  input:           { backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 16, fontSize: 17, color: '#dde3f0', marginBottom: 16 },
  groupChip:       { backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8 },
  groupChipActive: { backgroundColor: '#f04a18', borderColor: '#f04a18' },
  groupChipText:   { fontSize: 13, fontWeight: '600', color: '#7a85a0' },
  groupChipTextActive: { color: '#fff' },
  saveBtn:         { backgroundColor: '#f04a18', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 },
  saveBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn:       { alignItems: 'center', padding: 8 },
  cancelText:      { color: '#7a85a0', fontSize: 14 },
});
