import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useLang } from '../../lib/LanguageContext';
import { LanguageToggle } from '../../components/LanguageToggle';
import {
  getAllMachines, getAllPrograms, getActiveProgram,
  createProgram, setActiveProgram, deleteProgramById,
  renameProgramById, SavedProgram, Machine,
} from '../../lib/database';
import { generateProgram, ProgramDay, ProgramExercise } from '../../lib/claude';

type ViewState = 'list' | 'wizard' | 'loading' | 'name' | 'detail' | 'manualTimeChoice' | 'manualBudgetPick' | 'manualBuild';

type ManualExercise = {
  machineId: number;
  name: string;
  muscleGroup: string | null;
  sets: number;
  estMin: number;
};

function estimateMinutes(muscleGroup: string | null, sets: number): number {
  if (muscleGroup === 'Cardio') return 15;
  return Math.round(sets * 2.5);
}

const WEEKDAYS = {
  sv: ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
};

const DAY_SPREAD: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};

const MUSCLE_ORDER = ['Bröst', 'Rygg', 'Axlar', 'Biceps', 'Triceps', 'Ben', 'Rumpa', 'Mage', 'Cardio', 'Övrigt'];

const C = {
  sv: {
    title: 'Träningsprogram',
    step1q: 'Vad är ditt mål?',
    step2q: 'Hur många pass per vecka?',
    step3q: 'Hur lång tid per pass?',
    nameQ: 'Namnge ditt program',
    namePlaceholder: 't.ex. Styrka hösten 2025',
    saveBtn: 'Spara program →',
    createBtn: 'Skapa mitt program',
    creating: 'AI skapar ditt program…',
    newProgram: '+ Skapa nytt program',
    restDay: 'Vilodag',
    active: 'AKTIV',
    setActive: 'Sätt aktiv',
    viewSchedule: 'Visa schema →',
    deleteProgram: 'Ta bort program',
    noPrograms: 'Inga program sparade ännu.',
    back: '← Tillbaka',
    next: 'Nästa',
    errTitle: 'Kunde inte skapa program',
    errMsg: 'Kontrollera internetanslutningen och försök igen.',
    trainingDays: 'TRÄNINGSDAGAR',
    sets: 'set',
    rest: 'sek vila',
    tip: '💡',
    goals: [
      { label: 'Hälsa & välmående',   sub: 'Rörlighet och att må bra',      icon: '💚', value: 'Hälsa och välmående' },
      { label: 'Bygga styrka',         sub: 'Tyngre lyft och mer muskler',   icon: '💪', value: 'Bygga styrka och muskler' },
      { label: 'Gå ner i vikt',        sub: 'Mer rörelse och energi',        icon: '🔥', value: 'Gå ner i vikt och förbränna fett' },
    ],
    days:  [
      { label: '2 pass', sub: 'Bra start',  value: 2 },
      { label: '3 pass', sub: 'Vanligast',  value: 3 },
      { label: '4 pass', sub: 'Effektivt',  value: 4 },
      { label: '5 pass', sub: 'Intensivt',  value: 5 },
    ],
    times: [
      { label: '30 min', value: 30 },
      { label: '45 min', value: 45 },
      { label: '60 min', value: 60 },
      { label: '90 min', value: 90 },
    ],
    metaLine: (d: number, m: number) => `${d} pass/vecka  ·  ${m} min/pass`,
  },
  en: {
    title: 'Training Programs',
    step1q: 'What is your goal?',
    step2q: 'How many sessions per week?',
    step3q: 'How long per session?',
    nameQ: 'Name your program',
    namePlaceholder: 'e.g. Strength autumn 2025',
    saveBtn: 'Save program →',
    createBtn: 'Create my program',
    creating: 'AI is creating your program…',
    newProgram: '+ Create new program',
    restDay: 'Rest day',
    active: 'ACTIVE',
    setActive: 'Set active',
    viewSchedule: 'View schedule →',
    deleteProgram: 'Delete program',
    noPrograms: 'No programs saved yet.',
    back: '← Back',
    next: 'Next',
    errTitle: 'Could not create program',
    errMsg: 'Check your internet connection and try again.',
    trainingDays: 'TRAINING DAYS',
    sets: 'sets',
    rest: 'sec rest',
    tip: '💡',
    goals: [
      { label: 'Health & wellbeing', sub: 'Mobility and feeling good',   icon: '💚', value: 'Health and wellbeing' },
      { label: 'Build strength',      sub: 'Heavier lifts, more muscle', icon: '💪', value: 'Build strength and muscle' },
      { label: 'Lose weight',         sub: 'More movement, more energy', icon: '🔥', value: 'Lose weight and burn fat' },
    ],
    days: [
      { label: '2 sessions', sub: 'Great start',  value: 2 },
      { label: '3 sessions', sub: 'Most popular', value: 3 },
      { label: '4 sessions', sub: 'Effective',    value: 4 },
      { label: '5 sessions', sub: 'Intensive',    value: 5 },
    ],
    times: [
      { label: '30 min', value: 30 },
      { label: '45 min', value: 45 },
      { label: '60 min', value: 60 },
      { label: '90 min', value: 90 },
    ],
    metaLine: (d: number, m: number) => `${d} sessions/week  ·  ${m} min/session`,
  },
} as const;

function parseProg(prog: SavedProgram): { days: ProgramDay[]; daysPerWeek: number; minutes: number } {
  try {
    const p = JSON.parse(prog.data);
    return { days: p.days ?? [], daysPerWeek: p.days_per_week ?? 0, minutes: p.minutes ?? 0 };
  } catch { return { days: [], daysPerWeek: 0, minutes: 0 }; }
}

export default function ProgramScreen() {
  const { lang } = useLang();
  const c = C[lang];

  const [view, setView]       = useState<ViewState>('list');
  const [programs, setPrograms] = useState<SavedProgram[]>([]);
  const [allMachines, setAllMachines] = useState<Machine[]>([]);

  // Wizard
  const [step, setStep]       = useState(0);
  const [goal, setGoal]       = useState<string | null>(null);
  const [days, setDays]       = useState<number | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [mode, setMode]       = useState<'ai' | 'manual' | null>(null);

  // Manual builder
  const [manualBudgetMode, setManualBudgetMode] = useState<'budget' | 'free' | null>(null);
  const [manualTargetMin, setManualTargetMin]   = useState<number | null>(null);
  const [manualDayIndex, setManualDayIndex]     = useState(0);
  const [manualDays, setManualDays]             = useState<ManualExercise[][]>([]);
  const [currentSelection, setCurrentSelection] = useState<ManualExercise[]>([]);

  // After generation
  const [genDays, setGenDays]         = useState<ProgramDay[]>([]);
  const [newProgName, setNewProgName] = useState('');

  // Detail view
  const [detailProg, setDetailProg]       = useState<SavedProgram | null>(null);
  const [detailExpanded, setDetailExpanded] = useState<number | null>(null);

  // Rename inline
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameText, setRenameText] = useState('');

  function loadProgs() {
    setPrograms(getAllPrograms());
    setAllMachines(getAllMachines());
  }

  useFocusEffect(useCallback(() => {
    loadProgs();
    // Default to list if programs exist, wizard if none
    setView(prev => prev === 'list' || prev === 'wizard' ? prev : 'list');
  }, []));

  // ── Wizard / generate ──────────────────────────────────
  async function generate() {
    if (!goal || !days || !minutes) return;
    setView('loading');
    const machines = getAllMachines().map(m => m.name);
    const result = await generateProgram({ goal, daysPerWeek: days, minutesPerSession: minutes, machines, language: lang });
    if (result.error || result.days.length === 0) {
      Alert.alert(c.errTitle, c.errMsg);
      setView('wizard');
      return;
    }
    setGenDays(result.days);
    setNewProgName(`${goal.split(' ')[0]} · ${days} pass`);
    setView('name');
  }

  function saveGeneratedProgram() {
    if (genDays.length === 0) return;
    const name = newProgName.trim() || `${goal?.split(' ')[0] ?? 'Program'} · ${days} pass`;
    createProgram(name, goal ?? null, JSON.stringify({ days: genDays, goal, days_per_week: days, minutes }));
    loadProgs();
    setView('list');
    setStep(0); setGoal(null); setDays(null); setMinutes(null);
    setGenDays([]); setNewProgName('');
  }

  function resetWizard() {
    setStep(0); setGoal(null); setDays(null); setMinutes(null); setMode(null);
    setManualBudgetMode(null); setManualTargetMin(null); setManualDayIndex(0);
    setManualDays([]); setCurrentSelection([]);
    setView('wizard');
  }

  // ── Manual builder ──────────────────────────────────────
  function chooseBudgetMode(m: 'budget' | 'free') {
    setManualBudgetMode(m);
    if (m === 'budget') {
      setView('manualBudgetPick');
    } else {
      setManualTargetMin(null);
      setView('manualBuild');
    }
  }

  function pickBudgetMinutes(mins: number) {
    setManualTargetMin(mins);
    setView('manualBuild');
  }

  function toggleManualMachine(machine: Machine) {
    setCurrentSelection(prev => {
      const exists = prev.find(e => e.machineId === machine.id);
      if (exists) return prev.filter(e => e.machineId !== machine.id);
      const sets = 3;
      return [...prev, { machineId: machine.id, name: machine.name, muscleGroup: machine.muscle_group, sets, estMin: estimateMinutes(machine.muscle_group, sets) }];
    });
  }

  function adjustSets(machineId: number, delta: number) {
    setCurrentSelection(prev => prev.map(e => {
      if (e.machineId !== machineId) return e;
      const sets = Math.max(1, e.sets + delta);
      return { ...e, sets, estMin: estimateMinutes(e.muscleGroup, sets) };
    }));
  }

  function removeManualMachine(machineId: number) {
    setCurrentSelection(prev => prev.filter(e => e.machineId !== machineId));
  }

  const currentTotalMin = currentSelection.reduce((sum, e) => sum + e.estMin, 0);

  function assembleManualProgram(allDays: ManualExercise[][]) {
    const weekdayNames = WEEKDAYS[lang];
    const spread = DAY_SPREAD[days ?? 3] ?? DAY_SPREAD[3];
    const result: ProgramDay[] = [];
    let trainingIdx = 0;
    for (let i = 0; i < 7; i++) {
      if (spread.includes(i)) {
        const selection = allDays[trainingIdx] ?? [];
        const groups = [...new Set(selection.map(e => e.muscleGroup).filter(Boolean))] as string[];
        const type = groups.length ? groups.join(' & ') : (lang === 'sv' ? 'Eget pass' : 'Custom session');
        const exercises: ProgramExercise[] = selection.map(e => ({
          name: e.name,
          sets: e.muscleGroup === 'Cardio' ? 1 : e.sets,
          reps: e.muscleGroup === 'Cardio' ? `${e.estMin} min` : '10-12',
          restSec: 90,
          tip: '',
        }));
        result.push({ dayNumber: i + 1, name: weekdayNames[i], isRest: false, type, muscles: groups.join('  ·  '), exercises });
        trainingIdx++;
      } else {
        result.push({ dayNumber: i + 1, name: weekdayNames[i], isRest: true, type: lang === 'sv' ? 'Vila' : 'Rest', muscles: '', exercises: [] });
      }
    }
    setGenDays(result);
    setMinutes(manualTargetMin ?? 0);
    setNewProgName(`${goal?.split(' ')[0] ?? (lang === 'sv' ? 'Program' : 'Program')} · ${days} ${lang === 'sv' ? 'pass' : 'sessions'}`);
    setView('name');
  }

  function finishDay() {
    const updated = [...manualDays];
    updated[manualDayIndex] = currentSelection;
    setManualDays(updated);
    if (manualDayIndex + 1 < (days ?? 1)) {
      setManualDayIndex(manualDayIndex + 1);
      setCurrentSelection([]);
    } else {
      assembleManualProgram(updated);
    }
  }

  // ── List actions ───────────────────────────────────────
  function activate(id: number) {
    setActiveProgram(id);
    loadProgs();
    if (detailProg?.id === id) setDetailProg(prev => prev ? { ...prev, is_active: 1 } : null);
  }

  function confirmDelete(prog: SavedProgram) {
    Alert.alert(
      lang === 'sv' ? 'Ta bort program?' : 'Delete program?',
      `"${prog.name}"`,
      [
        { text: lang === 'sv' ? 'Avbryt' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'sv' ? 'Ta bort' : 'Delete', style: 'destructive',
          onPress: () => {
            deleteProgramById(prog.id);
            if (detailProg?.id === prog.id) setView('list');
            loadProgs();
          },
        },
      ]
    );
  }

  function commitRename() {
    if (renamingId === null) return;
    const name = renameText.trim();
    if (name) renameProgramById(renamingId, name);
    setRenamingId(null);
    loadProgs();
    if (detailProg?.id === renamingId) setDetailProg(prev => prev ? { ...prev, name: name || prev.name } : null);
  }

  function openDetail(prog: SavedProgram) {
    setDetailProg(prog);
    setDetailExpanded(null);
    setView('detail');
  }

  const canNext = step === 0 ? !!goal : step === 1 ? !!days : step === 2 ? !!mode : !!minutes;

  // ── Loading ────────────────────────────────────────────
  if (view === 'loading') {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator color="#f04a18" size="large" />
        <Text style={s.loadingText}>{c.creating}</Text>
      </View>
    );
  }

  // ── Detail view ────────────────────────────────────────
  if (view === 'detail' && detailProg) {
    const { days: detDays, daysPerWeek, minutes: detMin } = parseProg(detailProg);
    const isActive = detailProg.is_active === 1;
    return (
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setView('list')} style={s.backBtn}>
            <Text style={s.backText}>{c.back}</Text>
          </TouchableOpacity>
          <LanguageToggle />
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
          <View style={s.detailTitleRow}>
            {renamingId === detailProg.id ? (
              <TextInput
                style={[s.detailTitle, s.renameInput]}
                value={renameText}
                onChangeText={setRenameText}
                onBlur={commitRename}
                onSubmitEditing={commitRename}
                autoFocus
              />
            ) : (
              <TouchableOpacity style={{ flex: 1 }} onPress={() => { setRenamingId(detailProg.id); setRenameText(detailProg.name); }}>
                <Text style={s.detailTitle}>{detailProg.name} <Text style={s.editIcon}>✎</Text></Text>
              </TouchableOpacity>
            )}
            {isActive
              ? <View style={s.activeBadge}><Text style={s.activeBadgeText}>{c.active}</Text></View>
              : <TouchableOpacity style={s.setActiveBtn} onPress={() => activate(detailProg.id)}><Text style={s.setActiveBtnText}>{c.setActive}</Text></TouchableOpacity>
            }
          </View>
          <Text style={s.detailMeta}>{detailProg.goal}  ·  {c.metaLine(daysPerWeek, detMin)}</Text>

          <View style={s.dayList}>
            {detDays.map(day => (
              <View key={day.dayNumber} style={[s.dayCard, day.isRest && s.dayCardRest]}>
                <TouchableOpacity
                  style={s.dayTop}
                  onPress={() => !day.isRest && setDetailExpanded(detailExpanded === day.dayNumber ? null : day.dayNumber)}
                  disabled={day.isRest}
                  activeOpacity={day.isRest ? 1 : 0.7}
                >
                  <View style={[s.dayAccent, { backgroundColor: day.isRest ? '#22273a' : '#f04a18' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.dayName}>{day.name}</Text>
                    <Text style={s.dayType}>{day.isRest ? c.restDay : day.type}</Text>
                    {!day.isRest && <Text style={s.dayMuscles}>{day.muscles}</Text>}
                  </View>
                  {!day.isRest && <Text style={s.chevron}>{detailExpanded === day.dayNumber ? '▲' : '▼'}</Text>}
                </TouchableOpacity>
                {!day.isRest && detailExpanded === day.dayNumber && (
                  <View style={s.exList}>
                    {day.exercises.map((ex, i) => (
                      <View key={i} style={s.exRow}>
                        <View style={s.exBadge}><Text style={s.exBadgeText}>{i + 1}</Text></View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.exName}>{ex.name}</Text>
                          <Text style={s.exMeta}>
                            {ex.reps.includes('min') ? `≈ ${ex.reps}` : `${ex.sets} ${c.sets} × ${ex.reps} reps  ·  ${ex.restSec} ${c.rest}`}
                          </Text>
                          {!!ex.tip && <Text style={s.exTip}>{c.tip} {ex.tip}</Text>}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>

          <TouchableOpacity style={s.deleteDetailBtn} onPress={() => confirmDelete(detailProg)}>
            <Text style={s.deleteDetailText}>✕  {c.deleteProgram}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Name view ──────────────────────────────────────────
  if (view === 'name') {
    const trainingDays = genDays.filter(d => !d.isRest);
    return (
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.header}>
          <Text style={s.title}>{c.title}</Text>
          <LanguageToggle />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
          <View style={s.nameSuccessCard}>
            <Text style={s.nameSuccessIcon}>✓</Text>
            <Text style={s.nameSuccessText}>
              {lang === 'sv' ? 'Program skapat!' : 'Program created!'}
            </Text>
          </View>

          <Text style={s.nameLabel}>{c.nameQ}</Text>
          <TextInput
            style={s.nameInput}
            value={newProgName}
            onChangeText={setNewProgName}
            placeholder={c.namePlaceholder}
            placeholderTextColor="#7a85a0"
            autoFocus
          />

          <Text style={s.previewLabel}>{c.trainingDays}</Text>
          {trainingDays.map(d => (
            <View key={d.dayNumber} style={s.previewDay}>
              <View style={s.previewDayDot} />
              <View style={{ flex: 1 }}>
                <Text style={s.previewDayName}>{d.name}</Text>
                <Text style={s.previewDayType}>{d.type}  ·  {d.muscles}</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity style={s.saveProgBtn} onPress={saveGeneratedProgram}>
            <Text style={s.saveProgBtnText}>{c.saveBtn}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Wizard ─────────────────────────────────────────────
  if (view === 'wizard') {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setView('list')} style={s.backBtn}>
            <Text style={s.backText}>{c.back}</Text>
          </TouchableOpacity>
          <LanguageToggle />
        </View>
        <ScrollView contentContainerStyle={s.wizScroll}>
          <View style={s.dots}>
            {[0, 1, 2, 3].map(i => <View key={i} style={[s.dot, i <= step && s.dotOn]} />)}
          </View>

          {step === 0 && (
            <>
              <Text style={s.wizQ}>{c.step1q}</Text>
              {c.goals.map(g => (
                <TouchableOpacity
                  key={g.value}
                  style={[s.optCard, goal === g.value && s.optCardSel]}
                  onPress={() => setGoal(g.value)}
                >
                  <Text style={s.optIcon}>{g.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.optTitle}>{g.label}</Text>
                    <Text style={s.optSub}>{g.sub}</Text>
                  </View>
                  {goal === g.value && <Text style={s.check}>✓</Text>}
                </TouchableOpacity>
              ))}
            </>
          )}

          {step === 1 && (
            <>
              <Text style={s.wizQ}>{c.step2q}</Text>
              <View style={s.grid}>
                {c.days.map(d => (
                  <TouchableOpacity
                    key={d.value}
                    style={[s.gridCell, days === d.value && s.gridCellSel]}
                    onPress={() => setDays(d.value)}
                  >
                    <Text style={[s.gridNum, days === d.value && s.gridNumSel]}>{d.label}</Text>
                    <Text style={s.gridSub}>{d.sub}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={s.wizQ}>{lang === 'sv' ? 'Hur vill du bygga programmet?' : 'How do you want to build the program?'}</Text>
              <TouchableOpacity style={[s.optCard, mode === 'ai' && s.optCardSel]} onPress={() => setMode('ai')}>
                <Text style={s.optIcon}>🤖</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.optTitle}>{lang === 'sv' ? 'Låt AI välja' : 'Let AI choose'}</Text>
                  <Text style={s.optSub}>{lang === 'sv' ? 'AI väljer bland dina registrerade maskiner' : 'AI picks from your registered machines'}</Text>
                </View>
                {mode === 'ai' && <Text style={s.check}>✓</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[s.optCard, mode === 'manual' && s.optCardSel]} onPress={() => setMode('manual')}>
                <Text style={s.optIcon}>✋</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.optTitle}>{lang === 'sv' ? 'Välj maskiner själv' : 'Choose machines yourself'}</Text>
                  <Text style={s.optSub}>{lang === 'sv' ? 'Bygg varje träningsdag manuellt' : 'Build each training day manually'}</Text>
                </View>
                {mode === 'manual' && <Text style={s.check}>✓</Text>}
              </TouchableOpacity>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={s.wizQ}>{c.step3q}</Text>
              <View style={s.grid}>
                {c.times.map(tm => (
                  <TouchableOpacity
                    key={tm.value}
                    style={[s.gridCell, minutes === tm.value && s.gridCellSel]}
                    onPress={() => setMinutes(tm.value)}
                  >
                    <Text style={[s.gridNum, minutes === tm.value && s.gridNumSel]}>{tm.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <View style={s.wizNav}>
            {step > 0 && (
              <TouchableOpacity style={s.wizBackBtn} onPress={() => setStep(p => p - 1)}>
                <Text style={s.wizBackText}>{c.back}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.nextBtn, !canNext && s.nextBtnOff]}
              onPress={() => {
                if (step === 2 && mode === 'manual') {
                  setManualDayIndex(0); setManualDays([]); setCurrentSelection([]);
                  setView('manualTimeChoice');
                  return;
                }
                if (step < 3) { setStep(p => p + 1); return; }
                generate();
              }}
              disabled={!canNext}
            >
              <Text style={s.nextText}>{step === 3 ? c.createBtn : c.next}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Manual: time choice ─────────────────────────────────
  if (view === 'manualTimeChoice') {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setView('wizard')} style={s.backBtn}>
            <Text style={s.backText}>{c.back}</Text>
          </TouchableOpacity>
          <LanguageToggle />
        </View>
        <ScrollView contentContainerStyle={s.wizScroll}>
          <Text style={s.wizQ}>{lang === 'sv' ? 'Hur vill du styra tiden?' : 'How do you want to manage time?'}</Text>
          <TouchableOpacity style={s.optCard} onPress={() => chooseBudgetMode('budget')}>
            <Text style={s.optIcon}>⏱️</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.optTitle}>{lang === 'sv' ? 'Sätt en tidsbudget' : 'Set a time budget'}</Text>
              <Text style={s.optSub}>{lang === 'sv' ? 'Välj passlängd, se hur mycket tid som återstår när du lägger till maskiner' : 'Pick a session length, see remaining time as you add machines'}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={s.optCard} onPress={() => chooseBudgetMode('free')}>
            <Text style={s.optIcon}>➕</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.optTitle}>{lang === 'sv' ? 'Inget tidsmål' : 'No time target'}</Text>
              <Text style={s.optSub}>{lang === 'sv' ? 'Välj alla maskiner du vill ha — vi räknar upp uppskattad tid' : 'Pick all the machines you want — we\'ll count up the estimated time'}</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Manual: budget minutes pick ─────────────────────────
  if (view === 'manualBudgetPick') {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setView('manualTimeChoice')} style={s.backBtn}>
            <Text style={s.backText}>{c.back}</Text>
          </TouchableOpacity>
          <LanguageToggle />
        </View>
        <ScrollView contentContainerStyle={s.wizScroll}>
          <Text style={s.wizQ}>{c.step3q}</Text>
          <View style={s.grid}>
            {c.times.map(tm => (
              <TouchableOpacity key={tm.value} style={s.gridCell} onPress={() => pickBudgetMinutes(tm.value)}>
                <Text style={s.gridNum}>{tm.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Manual: build a training day ────────────────────────
  if (view === 'manualBuild') {
    const remaining = manualTargetMin != null ? manualTargetMin - currentTotalMin : null;
    const grouped: Record<string, Machine[]> = {};
    for (const m of allMachines) {
      const g = m.muscle_group ?? (lang === 'sv' ? 'Övrigt' : 'Other');
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(m);
    }
    const sortedGroups = [
      ...MUSCLE_ORDER.filter(g => grouped[g]),
      ...Object.keys(grouped).filter(g => !MUSCLE_ORDER.includes(g)),
    ];
    return (
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setView('manualTimeChoice')} style={s.backBtn}>
            <Text style={s.backText}>{c.back}</Text>
          </TouchableOpacity>
          <Text style={s.title}>
            {lang === 'sv' ? `Pass ${manualDayIndex + 1} av ${days}` : `Session ${manualDayIndex + 1} of ${days}`}
          </Text>
          <LanguageToggle />
        </View>

        <View style={s.timeBar}>
          {manualTargetMin != null ? (
            <>
              <View style={s.timeBarTrack}>
                <View style={[s.timeBarFill, { width: `${Math.min(100, (currentTotalMin / manualTargetMin) * 100)}%` as any, backgroundColor: (remaining ?? 0) < 0 ? ACCENT : '#1ecfa4' }]} />
              </View>
              <Text style={[s.timeBarText, { color: (remaining ?? 0) < 0 ? ACCENT : '#1ecfa4' }]}>
                {currentTotalMin} / {manualTargetMin} min{(remaining ?? 0) < 0 ? (lang === 'sv' ? ' · över budget' : ' · over budget') : ''}
              </Text>
            </>
          ) : (
            <Text style={s.timeBarTextFree}>
              {lang === 'sv' ? `≈ ${currentTotalMin} min allokerat` : `≈ ${currentTotalMin} min allocated`}
            </Text>
          )}
        </View>

        {currentSelection.length > 0 && (
          <View style={s.selectionList}>
            {currentSelection.map(e => (
              <View key={e.machineId} style={s.selRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.selName} numberOfLines={1}>{e.name}</Text>
                  <Text style={s.selMeta}>{e.muscleGroup === 'Cardio' ? `~${e.estMin} min` : `${e.sets} set · ~${e.estMin} min`}</Text>
                </View>
                {e.muscleGroup !== 'Cardio' && (
                  <View style={s.selSteppers}>
                    <TouchableOpacity style={s.selStepBtn} onPress={() => adjustSets(e.machineId, -1)}>
                      <Text style={s.selStepText}>−</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.selStepBtn} onPress={() => adjustSets(e.machineId, 1)}>
                      <Text style={s.selStepText}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity style={s.selDelBtn} onPress={() => removeManualMachine(e.machineId)}>
                  <Text style={s.selDelText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
          {sortedGroups.map(group => (
            <View key={group}>
              <Text style={s.pickGroupLabel}>{group.toUpperCase()}</Text>
              {grouped[group].map(machine => {
                const selected = currentSelection.some(e => e.machineId === machine.id);
                return (
                  <TouchableOpacity
                    key={machine.id}
                    style={[s.pickRow, selected && s.pickRowSel]}
                    onPress={() => toggleManualMachine(machine)}
                  >
                    <Text style={s.pickName} numberOfLines={1}>{machine.name}</Text>
                    <Text style={s.pickCheck}>{selected ? '✓' : '+'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>

        <View style={s.wizNav}>
          <TouchableOpacity
            style={[s.nextBtn, currentSelection.length === 0 && s.nextBtnOff, { flex: 1 }]}
            onPress={finishDay}
            disabled={currentSelection.length === 0}
          >
            <Text style={s.nextText}>
              {manualDayIndex + 1 < (days ?? 1)
                ? (lang === 'sv' ? 'Nästa pass →' : 'Next session →')
                : (lang === 'sv' ? '✓ Skapa program' : '✓ Create program')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── List view ──────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.header}>
        <Text style={s.title}>{c.title}</Text>
        <LanguageToggle />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        {allMachines.length === 0 ? (
          <View style={s.gateCard}>
            <Text style={s.gateIcon}>🏋️</Text>
            <Text style={s.gateTitle}>
              {lang === 'sv' ? 'Registrera en maskin först' : 'Register a machine first'}
            </Text>
            <Text style={s.gateSub}>
              {lang === 'sv'
                ? 'Träningsprogram kan bara byggas av maskiner du redan registrerat. Skanna eller lägg till minst en maskin i registret innan du skapar ett program.'
                : 'Training programs can only be built from machines you have already registered. Scan or add at least one machine to your registry before creating a program.'}
            </Text>
            <TouchableOpacity style={s.gateBtn} onPress={() => router.push('/(tabs)/machines')}>
              <Text style={s.gateBtnText}>{lang === 'sv' ? 'Gå till Maskiner →' : 'Go to Machines →'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={s.createBtn} onPress={resetWizard}>
            <Text style={s.createBtnText}>{c.newProgram}</Text>
          </TouchableOpacity>
        )}

        {programs.length === 0 && (
          <Text style={s.noPrograms}>{c.noPrograms}</Text>
        )}

        {programs.map(prog => {
          const { daysPerWeek, minutes: progMin } = parseProg(prog);
          const isActive = prog.is_active === 1;
          return (
            <View key={prog.id} style={[s.progCard, isActive && s.progCardActive]}>
              <View style={s.progCardTop}>
                <View style={{ flex: 1 }}>
                  {renamingId === prog.id ? (
                    <TextInput
                      style={s.renameInput}
                      value={renameText}
                      onChangeText={setRenameText}
                      onBlur={commitRename}
                      onSubmitEditing={commitRename}
                      autoFocus
                    />
                  ) : (
                    <TouchableOpacity onPress={() => { setRenamingId(prog.id); setRenameText(prog.name); }}>
                      <Text style={s.progCardName}>{prog.name} <Text style={s.editIcon}>✎</Text></Text>
                    </TouchableOpacity>
                  )}
                  <Text style={s.progCardGoal}>{prog.goal}</Text>
                  <Text style={s.progCardMeta}>{c.metaLine(daysPerWeek, progMin)}</Text>
                </View>
                {isActive && (
                  <View style={s.activeBadge}>
                    <Text style={s.activeBadgeText}>{c.active}</Text>
                  </View>
                )}
              </View>

              <View style={s.progCardActions}>
                {!isActive && (
                  <TouchableOpacity style={s.setActiveBtn} onPress={() => activate(prog.id)}>
                    <Text style={s.setActiveBtnText}>{c.setActive}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.viewBtn} onPress={() => openDetail(prog)}>
                  <Text style={s.viewBtnText}>{c.viewSchedule}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.delBtn} onPress={() => confirmDelete(prog)}>
                  <Text style={s.delBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const ACCENT = '#f04a18';

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0b0d13' },
  center:           { alignItems: 'center', justifyContent: 'center', gap: 20 },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, paddingTop: 60 },
  title:            { fontSize: 22, fontWeight: '800', color: '#dde3f0', letterSpacing: -0.4 },
  loadingText:      { color: '#7a85a0', fontSize: 15 },
  backBtn:          { paddingVertical: 4 },
  backText:         { color: '#7a85a0', fontSize: 14, fontWeight: '600' },

  // List
  createBtn:        { margin: 16, marginBottom: 20, backgroundColor: ACCENT, borderRadius: 14, padding: 15, alignItems: 'center' },
  createBtnText:    { color: '#fff', fontSize: 15, fontWeight: '700' },
  noPrograms:       { color: '#7a85a0', fontSize: 14, paddingHorizontal: 24, paddingTop: 8 },
  progCard:         { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 16, padding: 16 },
  progCardActive:   { borderColor: ACCENT, backgroundColor: 'rgba(240,74,24,.05)' },
  progCardTop:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  progCardName:     { fontSize: 17, fontWeight: '800', color: '#dde3f0', marginBottom: 4 },
  progCardGoal:     { fontSize: 12, color: '#7a85a0', marginBottom: 2 },
  progCardMeta:     { fontSize: 12, color: '#7a85a0' },
  editIcon:         { fontSize: 13, color: '#3c4560' },
  activeBadge:      { backgroundColor: ACCENT, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  activeBadgeText:  { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  progCardActions:  { flexDirection: 'row', gap: 8, alignItems: 'center' },
  setActiveBtn:     { backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  setActiveBtnText: { color: '#dde3f0', fontSize: 12, fontWeight: '600' },
  viewBtn:          { flex: 1, backgroundColor: '#242840', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, alignItems: 'center' },
  viewBtnText:      { color: ACCENT, fontSize: 12, fontWeight: '700' },
  delBtn:           { width: 32, height: 32, borderRadius: 8, backgroundColor: '#2a1010', alignItems: 'center', justifyContent: 'center' },
  delBtnText:       { color: ACCENT, fontSize: 13, fontWeight: '700' },
  renameInput:      { backgroundColor: '#242840', borderWidth: 1.5, borderColor: ACCENT, borderRadius: 10, padding: 10, fontSize: 16, fontWeight: '700', color: '#dde3f0', marginBottom: 4 },

  // Detail
  detailTitleRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 6 },
  detailTitle:      { flex: 1, fontSize: 20, fontWeight: '800', color: '#dde3f0', letterSpacing: -0.4 },
  detailMeta:       { fontSize: 13, color: '#7a85a0', paddingHorizontal: 16, marginBottom: 20 },
  deleteDetailBtn:  { marginHorizontal: 16, marginTop: 24, backgroundColor: '#2a1010', borderWidth: 1.5, borderColor: 'rgba(240,74,24,.3)', borderRadius: 14, padding: 14, alignItems: 'center' },
  deleteDetailText: { color: ACCENT, fontSize: 14, fontWeight: '700' },

  // Name view
  nameSuccessCard:  { backgroundColor: 'rgba(30,207,164,.09)', borderWidth: 1.5, borderColor: 'rgba(30,207,164,.25)', borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 24, flexDirection: 'row', gap: 10 },
  nameSuccessIcon:  { fontSize: 22, color: '#1ecfa4', fontWeight: '800' },
  nameSuccessText:  { fontSize: 17, fontWeight: '700', color: '#1ecfa4' },
  nameLabel:        { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: '#7a85a0', marginBottom: 10 },
  nameInput:        { backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 16, fontSize: 18, fontWeight: '700', color: '#dde3f0', marginBottom: 24 },
  previewLabel:     { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: '#7a85a0', marginBottom: 10 },
  previewDay:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 12, padding: 12, marginBottom: 8 },
  previewDayDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: ACCENT, flexShrink: 0 },
  previewDayName:   { fontSize: 12, fontWeight: '700', color: '#7a85a0', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  previewDayType:   { fontSize: 14, fontWeight: '700', color: '#dde3f0' },
  saveProgBtn:      { marginTop: 20, backgroundColor: ACCENT, borderRadius: 14, padding: 16, alignItems: 'center' },
  saveProgBtnText:  { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Wizard
  wizScroll:        { padding: 16, paddingBottom: 48 },
  dots:             { flexDirection: 'row', gap: 6, marginBottom: 28 },
  dot:              { flex: 1, height: 3, backgroundColor: '#22273a', borderRadius: 2 },
  dotOn:            { backgroundColor: ACCENT },
  wizQ:             { fontSize: 20, fontWeight: '800', color: '#dde3f0', letterSpacing: -0.4, lineHeight: 26, marginBottom: 18 },
  optCard:          { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#1c2030', borderWidth: 2, borderColor: '#22273a', borderRadius: 16, padding: 16, marginBottom: 10 },
  optCardSel:       { borderColor: ACCENT, backgroundColor: 'rgba(240,74,24,.07)' },
  optIcon:          { fontSize: 26 },
  optTitle:         { fontSize: 15, fontWeight: '700', color: '#dde3f0', marginBottom: 2 },
  optSub:           { fontSize: 12, color: '#7a85a0' },
  check:            { color: ACCENT, fontSize: 18, fontWeight: '800' },
  grid:             { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCell:         { width: '47%', backgroundColor: '#1c2030', borderWidth: 2, borderColor: '#22273a', borderRadius: 16, padding: 18, alignItems: 'center' },
  gridCellSel:      { borderColor: ACCENT, backgroundColor: 'rgba(240,74,24,.07)' },
  gridNum:          { fontSize: 17, fontWeight: '800', color: '#7a85a0', marginBottom: 4 },
  gridNumSel:       { color: ACCENT },
  gridSub:          { fontSize: 11, color: '#7a85a0', textAlign: 'center' },
  wizNav:           { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 28, gap: 14 },
  wizBackBtn:       { padding: 12 },
  wizBackText:      { color: '#7a85a0', fontSize: 14 },
  nextBtn:          { backgroundColor: ACCENT, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  nextBtnOff:       { backgroundColor: '#3c1a08', opacity: 0.5 },
  nextText:         { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Shared day schedule
  dayList:          { paddingHorizontal: 16, gap: 8 },
  dayCard:          { backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 16, overflow: 'hidden' },
  dayCardRest:      { opacity: 0.35 },
  dayTop:           { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  dayAccent:        { width: 4, height: 44, borderRadius: 2, flexShrink: 0 },
  dayName:          { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: '#7a85a0', textTransform: 'uppercase', marginBottom: 2 },
  dayType:          { fontSize: 15, fontWeight: '700', color: '#dde3f0', marginBottom: 2 },
  dayMuscles:       { fontSize: 12, color: '#7a85a0' },
  chevron:          { color: '#7a85a0', fontSize: 11, marginLeft: 'auto' },
  exList:           { borderTopWidth: 1, borderTopColor: '#22273a', padding: 14, gap: 14 },
  exRow:            { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  exBadge:          { width: 24, height: 24, borderRadius: 12, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  exBadgeText:      { color: '#fff', fontSize: 11, fontWeight: '800' },
  exName:           { fontSize: 14, fontWeight: '700', color: '#dde3f0', marginBottom: 3 },
  exMeta:           { fontSize: 12, color: '#7a85a0', marginBottom: 3 },
  exTip:            { fontSize: 12, color: 'rgba(30,207,164,.85)', lineHeight: 17 },

  // Manual builder
  timeBar:          { paddingHorizontal: 16, marginBottom: 12 },
  timeBarTrack:     { height: 8, backgroundColor: '#1c2030', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  timeBarFill:      { height: 8, borderRadius: 4 },
  timeBarText:      { fontSize: 12, fontWeight: '700' },
  timeBarTextFree:  { fontSize: 13, fontWeight: '700', color: '#1ecfa4' },
  selectionList:    { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, overflow: 'hidden' },
  selRow:           { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#22273a' },
  selName:          { fontSize: 14, fontWeight: '700', color: '#dde3f0' },
  selMeta:          { fontSize: 11, color: '#7a85a0', marginTop: 1 },
  selSteppers:      { flexDirection: 'row', gap: 4 },
  selStepBtn:       { width: 26, height: 26, borderRadius: 6, backgroundColor: '#242840', alignItems: 'center', justifyContent: 'center' },
  selStepText:      { color: '#dde3f0', fontSize: 15 },
  selDelBtn:        { width: 22, height: 22, borderRadius: 11, backgroundColor: '#2a1010', alignItems: 'center', justifyContent: 'center' },
  selDelText:       { color: ACCENT, fontSize: 11, fontWeight: '700' },
  pickGroupLabel:   { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: ACCENT, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  pickRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 12, padding: 12, marginHorizontal: 16, marginBottom: 8 },
  pickRowSel:       { borderColor: '#1ecfa4', backgroundColor: 'rgba(30,207,164,.06)' },
  pickName:         { fontSize: 14, fontWeight: '600', color: '#dde3f0', flex: 1, marginRight: 8 },
  pickCheck:        { fontSize: 16, fontWeight: '800', color: '#1ecfa4' },
  gateCard:         { margin: 16, backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 16, padding: 24, alignItems: 'center' },
  gateIcon:         { fontSize: 36, marginBottom: 12 },
  gateTitle:        { fontSize: 17, fontWeight: '800', color: '#dde3f0', marginBottom: 8, textAlign: 'center' },
  gateSub:          { fontSize: 13, color: '#7a85a0', textAlign: 'center', lineHeight: 19, marginBottom: 18 },
  gateBtn:          { backgroundColor: ACCENT, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12 },
  gateBtnText:      { color: '#fff', fontSize: 14, fontWeight: '700' },
});
