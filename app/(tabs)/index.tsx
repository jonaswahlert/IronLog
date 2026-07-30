import { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, Alert, ImageBackground, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  getTodaySession, createSession, getExercisesForSession,
  getLastCity, getLastGym, endSession, deleteSession,
  deleteExercise, updateExercise, loadProgram, getActiveProgram,
  Session, Exercise,
} from '../../lib/database';
import { ProgramDay } from '../../lib/claude';
import { GYM_CHAINS } from '../../lib/gyms';
import { useTranslation } from '../../lib/i18n';
import { useLang } from '../../lib/LanguageContext';
import { LanguageToggle } from '../../components/LanguageToggle';
import { MUSCLE_GROUPS } from '../../lib/muscles';

const GUIDE = {
  sv: {
    tabBasics:  'Grunderna',
    tabMuscles: 'Muskelgrupper',
    tabApp:     'Appen',
    basics: [
      { icon: '🔁', h: 'Set & reps',   p: '3 rundor av 10 armhävningar = 3 set × 10 reps.' },
      { icon: '⚖️', h: 'Hur tungt?',   p: 'Sista repet ska vara svårt men genomförbart.' },
      { icon: '⏱️', h: 'Vilotid',      p: 'Vänta 1–2 minuter mellan set.' },
      { icon: '💨', h: 'Andas rätt',   p: 'Andas ut vid ansträngning, in vid vila.' },
    ],
    groups: [
      { color: '#f04a18', name: 'Tryckmuskler', sub: 'Träna ihop', muscles: 'Bröst  ·  Axlar  ·  Baksida arm' },
      { color: '#1ecfa4', name: 'Dragmuskler',  sub: 'Träna ihop', muscles: 'Rygg  ·  Framsida arm' },
      { color: '#4a8af0', name: 'Ben & rumpa',  sub: 'Eget pass',  muscles: 'Lår  ·  Rumpa  ·  Mage' },
      { color: '#a04af0', name: 'Kondition',    sub: 'När som',    muscles: 'Löpband  ·  Cykel  ·  Crosstrainer' },
    ],
    appSteps: [
      { step: '1', h: 'Starta pass',      p: 'Tryck "Starta träningspass" och ange stad och gym.' },
      { step: '2', h: 'Skanna maskin',    p: 'Tryck "Lägg till övning" → fota maskinen → AI identifierar den automatiskt.' },
      { step: '3', h: 'Registrera vikt',  p: 'Fota viktplattan eller ange kg manuellt.' },
      { step: '4', h: 'Spara övning',     p: 'Kontrollera set/reps och tryck Spara. Upprepa för varje maskin.' },
      { step: '5', h: 'Avsluta',          p: 'Tryck "Avsluta pass" när träningen är klar.' },
    ],
  },
  en: {
    tabBasics:  'The basics',
    tabMuscles: 'Muscle groups',
    tabApp:     'How to use',
    basics: [
      { icon: '🔁', h: 'Sets & reps',    p: '3 rounds of 10 push-ups = 3 sets × 10 reps.' },
      { icon: '⚖️', h: 'How heavy?',     p: 'Last rep should be hard but doable.' },
      { icon: '⏱️', h: 'Rest time',      p: 'Wait 1–2 minutes between sets.' },
      { icon: '💨', h: 'Breathe right',  p: 'Breathe out on effort, in on rest.' },
    ],
    groups: [
      { color: '#f04a18', name: 'Push muscles', sub: 'Train together', muscles: 'Chest  ·  Shoulders  ·  Triceps' },
      { color: '#1ecfa4', name: 'Pull muscles', sub: 'Train together', muscles: 'Back  ·  Biceps' },
      { color: '#4a8af0', name: 'Legs & glutes',sub: 'Own session',    muscles: 'Thighs  ·  Glutes  ·  Core' },
      { color: '#a04af0', name: 'Cardio',        sub: 'Anytime',       muscles: 'Treadmill  ·  Bike  ·  Cross trainer' },
    ],
    appSteps: [
      { step: '1', h: 'Start session',    p: 'Tap "Start training session" and enter city and gym.' },
      { step: '2', h: 'Scan machine',     p: 'Tap "Add exercise" → photograph the machine → AI identifies it automatically.' },
      { step: '3', h: 'Log weight',       p: 'Photograph the weight plate or enter kg manually.' },
      { step: '4', h: 'Save exercise',    p: 'Check sets/reps and tap Save. Repeat for each machine.' },
      { step: '5', h: 'Finish',           p: 'Tap "End session" when you are done training.' },
    ],
  },
} as const;

const BG_IMAGE = require('../../assets/hero-bg.jpg');

export default function SessionScreen() {
  const t = useTranslation();
  const { lang } = useLang();
  const [guideTab, setGuideTab]           = useState<'basics' | 'muscles' | 'app'>('app');
  const [guideOpen, setGuideOpen]         = useState(false);
  const [savedProgram, setSavedProgram]   = useState<ProgramDay[] | null>(null);
  const [activeProgName, setActiveProgName] = useState<string | null>(null);
  const [programDayModal, setProgramDayModal] = useState<ProgramDay | null>(null);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [session, setSession]             = useState<Session | null>(null);
  const [exercises, setExercises]         = useState<Exercise[]>([]);
  const [showCityModal, setShowCityModal] = useState(false);
  const [city, setCity]                   = useState('');
  const [gym, setGym]                     = useState('');
  const [customGym, setCustomGym]         = useState('');
  const [showCustomGym, setShowCustomGym] = useState(false);
  const pendingProgramDayRef = useRef<ProgramDay | null>(null);
  const [editEx, setEditEx]               = useState<Exercise | null>(null);
  const [editWeight, setEditWeight]       = useState('');
  const [editSets, setEditSets]           = useState('');
  const [editReps, setEditReps]           = useState('');
  const [editMachine, setEditMachine]     = useState('');
  const [editGroup, setEditGroup]         = useState('');

  useFocusEffect(useCallback(() => {
    const s = getTodaySession();
    setSession(s);
    setExercises(s ? getExercisesForSession(s.id) : []);
    try {
      const active = getActiveProgram();
      setSavedProgram(active ? JSON.parse(active.data).days : null);
      setActiveProgName(active?.name ?? null);
    } catch { setSavedProgram(null); setActiveProgName(null); }
  }, []));

  function refresh() {
    const s = getTodaySession();
    setSession(s);
    setExercises(s ? getExercisesForSession(s.id) : []);
  }

  function getTodayDayNum(): number {
    const dow = new Date().getDay();
    return dow === 0 ? 7 : dow;
  }

  function handleStartProgram() {
    setShowSessionPicker(true);
  }

  function handleStart() {
    const lastCity = getLastCity() ?? '';
    setCity(lastCity);
    setGym(lastCity ? (getLastGym(lastCity) ?? '') : '');
    setCustomGym('');
    setShowCustomGym(false);
    setShowCityModal(true);
  }

  function selectGymChip(name: string) {
    setGym(name);
    setShowCustomGym(false);
    setCustomGym('');
  }

  function confirmStart() {
    const finalGym = showCustomGym ? customGym.trim() : gym;
    const s = createSession(city.trim() || undefined, finalGym || undefined);
    setSession(s);
    setExercises([]);
    setShowCityModal(false);
    setCity('');
    setGym('');
    setCustomGym('');
    setShowCustomGym(false);
    if (pendingProgramDayRef.current) {
      const pd = pendingProgramDayRef.current;
      pendingProgramDayRef.current = null;
      router.push({
        pathname: '/session/live',
        params: {
          sessionId: String(s.id),
          exercises: JSON.stringify(pd.exercises),
          dayName:   pd.name,
          dayType:   pd.type,
          muscles:   pd.muscles ?? '',
        },
      });
    }
  }

  function handleEndSession() {
    if (!session) return;
    Alert.alert(t('end_session'), t('end_session_msg'), [
      { text: t('keep_training'), style: 'cancel' },
      {
        text: t('end_session'), style: 'default',
        onPress: () => { endSession(session.id); refresh(); },
      },
      {
        text: t('cancel_session'), style: 'destructive',
        onPress: () =>
          Alert.alert(t('confirm_delete'), t('cancel_session_msg'), [
            { text: t('cancel'), style: 'cancel' },
            { text: t('delete'), style: 'destructive', onPress: () => { deleteSession(session.id); refresh(); } },
          ]),
      },
    ]);
  }

  function openEdit(ex: Exercise) {
    setEditEx(ex);
    setEditMachine(ex.machine_type ?? '');
    setEditWeight(ex.weight_kg != null ? String(ex.weight_kg) : '');
    setEditSets(ex.sets != null ? String(ex.sets) : '');
    setEditReps(ex.reps != null ? String(ex.reps) : '');
    setEditGroup(ex.muscle_group ?? '');
  }

  function saveEdit() {
    if (!editEx) return;
    updateExercise(editEx.id, {
      machine_type: editMachine.trim() || undefined,
      muscle_group: editGroup || undefined,
      weight_kg:    parseFloat(editWeight) || undefined,
      sets:         parseInt(editSets) || undefined,
      reps:         parseInt(editReps) || undefined,
    });
    setEditEx(null);
    refresh();
  }

  function confirmDeleteExercise(id: number) {
    Alert.alert(t('confirm_delete'), t('cannot_undo'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => { deleteExercise(id); refresh(); } },
    ]);
  }

  const totalSets = exercises.reduce((sum, e) => sum + (e.sets ?? 0), 0);
  const elapsed   = session
    ? Math.floor((Date.now() - new Date(session.started_at).getTime()) / 60000)
    : 0;

  const activeGym = showCustomGym ? '' : gym;

  return (
    <ImageBackground source={BG_IMAGE} style={s.bgContainer} imageStyle={s.bgImage}>
      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={s.header}>
          <View style={s.headerTop}>
            <View style={s.chip}>
              <Text style={s.chipDot}>●</Text>
              <Text style={s.chipText}>
                {new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'short' })}
              </Text>
            </View>
            <LanguageToggle />
          </View>
          <Text style={s.title}>{t('training_session')}</Text>
          {session && (
            <Text style={s.sub}>
              {new Date(session.started_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
              {session.city ? `  ·  ${session.city}` : ''}
              {session.gym  ? `  ·  ${session.gym}`  : ''}
            </Text>
          )}
        </View>

        {session && (
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={[s.statVal, { color: '#f04a18' }]}>{exercises.length}</Text>
              <Text style={s.statLbl}>{t('exercises_label')}</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statVal}>{totalSets}</Text>
              <Text style={s.statLbl}>{t('total_sets')}</Text>
            </View>
            <View style={s.statCard}>
              <Text style={[s.statVal, { color: '#1ecfa4' }]}>{elapsed}m</Text>
              <Text style={s.statLbl}>{t('time')}</Text>
            </View>
          </View>
        )}

        {exercises.length > 0 && (
          <>
            <Text style={s.sectionLabel}>{t('completed_exercises')}</Text>
            {exercises.map(ex => (
              <TouchableOpacity key={ex.id} style={s.exCard} onPress={() => openEdit(ex)}>
                <View style={s.exThumb}>
                  <Text style={{ fontSize: 22 }}>🏋️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.exName} numberOfLines={1}>{ex.machine_type ?? t('unknown_machine')}</Text>
                  <Text style={s.exMeta}>{ex.sets} set · {ex.reps} reps{ex.muscle_group ? `  ·  ${ex.muscle_group}` : ''}</Text>
                </View>
                <View style={s.weightBadge}>
                  <Text style={s.weightText}>{ex.weight_kg} kg</Text>
                </View>
                <TouchableOpacity style={s.deleteBtn} onPress={() => confirmDeleteExercise(ex.id)}>
                  <Text style={s.deleteText}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </>
        )}

        {!session ? (
          <>
            {/* ── Guide section – always visible at top ── */}
            <Text style={s.guideTitle}>
              {lang === 'sv' ? 'Lär dig träna' : 'Learn to train'}
            </Text>
            <View style={s.guideTabs}>
              <TouchableOpacity
                style={[s.guideTabBtn, guideTab === 'app' && s.guideTabBtnActive]}
                onPress={() => setGuideTab('app')}
              >
                <Text style={[s.guideTabText, guideTab === 'app' && s.guideTabTextActive]}>
                  {GUIDE[lang].tabApp}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.guideTabBtn, guideTab === 'basics' && s.guideTabBtnActive]}
                onPress={() => setGuideTab('basics')}
              >
                <Text style={[s.guideTabText, guideTab === 'basics' && s.guideTabTextActive]}>
                  {GUIDE[lang].tabBasics}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.guideTabBtn, guideTab === 'muscles' && s.guideTabBtnActive]}
                onPress={() => setGuideTab('muscles')}
              >
                <Text style={[s.guideTabText, guideTab === 'muscles' && s.guideTabTextActive]}>
                  {GUIDE[lang].tabMuscles}
                </Text>
              </TouchableOpacity>
            </View>
            {guideTab === 'app' ? (
              <View style={s.groupList}>
                {GUIDE[lang].appSteps.map((step, i) => (
                  <View key={i} style={s.groupRow}>
                    <View style={s.appStepNum}>
                      <Text style={s.appStepNumText}>{step.step}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.groupName}>{step.h}</Text>
                      <Text style={s.groupMuscles}>{step.p}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : guideTab === 'basics' ? (
              <View style={s.basicsGrid}>
                {GUIDE[lang].basics.map((b, i) => (
                  <View key={i} style={s.basicCard}>
                    <Text style={s.basicIcon}>{b.icon}</Text>
                    <Text style={s.basicH}>{b.h}</Text>
                    <Text style={s.basicP}>{b.p}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={s.groupList}>
                {GUIDE[lang].groups.map((g, i) => (
                  <View key={i} style={s.groupRow}>
                    <View style={[s.groupDot, { backgroundColor: g.color }]} />
                    <View style={{ flex: 1 }}>
                      <View style={s.groupNameRow}>
                        <Text style={s.groupName}>{g.name}</Text>
                        <View style={[s.groupSubBadge, { backgroundColor: g.color + '22', borderColor: g.color + '55' }]}>
                          <Text style={[s.groupSubText, { color: g.color }]}>{g.sub}</Text>
                        </View>
                      </View>
                      <Text style={s.groupMuscles}>{g.muscles}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ── Action buttons – at bottom ── */}
            {savedProgram ? (
              <>
                <TouchableOpacity style={s.addBtn} onPress={handleStartProgram}>
                  <Text style={s.addBtnText}>
                    📋  {activeProgName ?? (lang === 'sv' ? 'Följ mitt program' : 'Follow my program')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.freeBtn} onPress={handleStart}>
                  <Text style={s.freeBtnText}>
                    {lang === 'sv' ? '🆓  Starta fritt pass' : '🆓  Free session'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={s.addBtn} onPress={handleStart}>
                  <Text style={s.addBtnText}>{t('start_session')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.progCard} onPress={() => router.push('/(tabs)/program')}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.progCardTitle}>
                      {lang === 'sv' ? '📋  Skapa träningsprogram' : '📋  Create training program'}
                    </Text>
                    <Text style={s.progCardSub}>
                      {lang === 'sv' ? 'AI hjälper dig lägga upp ett schema' : 'AI helps you build a weekly schedule'}
                    </Text>
                  </View>
                  <Text style={s.progCardArrow}>→</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        ) : (
          <>
            <TouchableOpacity
              style={s.addBtn}
              onPress={() => router.push({
                pathname: '/exercise/new',
                params: { sessionId: String(session.id), city: session.city ?? '', gym: session.gym ?? '' },
              })}
            >
              <Text style={s.addBtnText}>{t('add_exercise')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.endBtn} onPress={handleEndSession}>
              <Text style={s.endBtnText}>{t('end_session')}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Session picker modal */}
      <Modal visible={showSessionPicker} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>
              {lang === 'sv' ? 'Välj pass att köra' : 'Choose a session'}
            </Text>
            {savedProgram?.filter(d => !d.isRest).map(day => {
              const isToday = day.dayNumber === getTodayDayNum();
              return (
                <TouchableOpacity
                  key={day.dayNumber}
                  style={[s.pickRow, isToday && s.pickRowToday]}
                  onPress={() => { setShowSessionPicker(false); setProgramDayModal(day); }}
                >
                  <View style={{ flex: 1 }}>
                    <View style={s.pickRowTop}>
                      <Text style={s.pickDayName}>{day.name}</Text>
                      {isToday && (
                        <View style={s.todayBadge}>
                          <Text style={s.todayBadgeText}>{lang === 'sv' ? 'Idag' : 'Today'}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.pickType}>{day.type}</Text>
                    <Text style={s.pickMuscles}>{day.muscles}</Text>
                  </View>
                  <Text style={s.pickArrow}>›</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={s.modalSkip} onPress={() => setShowSessionPicker(false)}>
              <Text style={s.modalSkipText}>{lang === 'sv' ? 'Avbryt' : 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Program day preview modal */}
      <Modal visible={!!programDayModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.progDayHeader}>
              <View style={s.progDayBadge}>
                <Text style={s.progDayBadgeText}>📋 {lang === 'sv' ? 'Dagens pass' : "Today's session"}</Text>
              </View>
            </View>
            <Text style={s.progDayType}>{programDayModal?.type}</Text>
            <Text style={s.progDayMuscles}>{programDayModal?.muscles}</Text>
            <View style={s.progExList}>
              {programDayModal?.exercises.map((ex, i) => (
                <View key={i} style={s.progExRow}>
                  <View style={s.progExNum}><Text style={s.progExNumText}>{i + 1}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.progExName}>{ex.name}</Text>
                    <Text style={s.progExMeta}>{ex.sets} set × {ex.reps} reps</Text>
                  </View>
                </View>
              ))}
            </View>
            <TouchableOpacity style={s.modalBtn} onPress={() => { pendingProgramDayRef.current = programDayModal; setProgramDayModal(null); setTimeout(handleStart, 400); }}>
              <Text style={s.modalBtnText}>{lang === 'sv' ? 'Starta passet →' : 'Start session →'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalSkip} onPress={() => setProgramDayModal(null)}>
              <Text style={s.modalSkipText}>{lang === 'sv' ? 'Avbryt' : 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* City/gym modal */}
      <Modal visible={showCityModal} transparent animationType="slide">
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{t('where_training')}</Text>
            <Text style={s.fieldLabel}>{t('city')}</Text>
            <TextInput
              style={s.input}
              placeholder={t('city_placeholder')}
              placeholderTextColor="#7a85a0"
              value={city}
              onChangeText={setCity}
            />
            <Text style={s.fieldLabel}>{t('gym_optional')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
              style={{ marginBottom: 12 }}
            >
              {GYM_CHAINS.map(name => (
                <TouchableOpacity
                  key={name}
                  style={[s.gymChip, activeGym === name && s.gymChipActive]}
                  onPress={() => selectGymChip(name)}
                >
                  <Text style={[s.gymChipText, activeGym === name && s.gymChipTextActive]}>{name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[s.gymChip, showCustomGym && s.gymChipActive]}
                onPress={() => { setGym(''); setShowCustomGym(true); }}
              >
                <Text style={[s.gymChipText, showCustomGym && s.gymChipTextActive]}>{t('other_gym')}</Text>
              </TouchableOpacity>
            </ScrollView>
            {showCustomGym && (
              <TextInput
                style={[s.input, { marginBottom: 16 }]}
                placeholder={t('gym_placeholder')}
                placeholderTextColor="#7a85a0"
                value={customGym}
                onChangeText={setCustomGym}
              />
            )}
            <TouchableOpacity style={s.modalBtn} onPress={confirmStart}>
              <Text style={s.modalBtnText}>{t('start_session_btn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalSkip} onPress={() => setShowCityModal(false)}>
              <Text style={s.modalSkipText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit exercise modal */}
      <Modal visible={!!editEx} transparent animationType="slide">
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{t('edit')}</Text>

            <Text style={s.fieldLabel}>{t('machine')}</Text>
            <TextInput
              style={s.input}
              placeholder={t('enter_machine_name')}
              placeholderTextColor="#7a85a0"
              value={editMachine}
              onChangeText={setEditMachine}
            />

            <Text style={s.fieldLabel}>{t('weight')} (kg)</Text>
            <TextInput
              style={s.input}
              placeholder="0"
              placeholderTextColor="#7a85a0"
              value={editWeight}
              onChangeText={setEditWeight}
              keyboardType="decimal-pad"
            />

            <View style={s.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>SETS</Text>
                <TextInput
                  style={s.input}
                  placeholder="3"
                  placeholderTextColor="#7a85a0"
                  value={editSets}
                  onChangeText={setEditSets}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>REPS</Text>
                <TextInput
                  style={s.input}
                  placeholder="10"
                  placeholderTextColor="#7a85a0"
                  value={editReps}
                  onChangeText={setEditReps}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <Text style={s.fieldLabel}>{t('muscle_group')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }} style={{ marginBottom: 16 }}>
              {MUSCLE_GROUPS.map(g => (
                <TouchableOpacity key={g} style={[s.gymChip, editGroup === g && s.gymChipActive]} onPress={() => setEditGroup(g)}>
                  <Text style={[s.gymChipText, editGroup === g && s.gymChipTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={s.modalBtn} onPress={saveEdit}>
              <Text style={s.modalBtnText}>{t('save')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalSkip} onPress={() => setEditEx(null)}>
              <Text style={s.modalSkipText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  bgContainer:       { flex: 1 },
  bgImage:           { opacity: 0.12, resizeMode: 'cover' },
  container:         { flex: 1, backgroundColor: 'rgba(11,13,19,0.82)' },
  header:            { padding: 24, paddingTop: 60 },
  headerTop:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  chip:              { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 5 },
  chipDot:           { color: '#1ecfa4', fontSize: 10 },
  chipText:          { color: '#7a85a0', fontSize: 12, fontWeight: '600' },
  title:             { fontSize: 28, fontWeight: '800', color: '#dde3f0', letterSpacing: -0.6 },
  sub:               { fontSize: 13, color: '#7a85a0', marginTop: 4 },
  statsRow:          { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 28 },
  statCard:          { flex: 1, backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 14, padding: 14, alignItems: 'center' },
  statVal:           { fontSize: 22, fontWeight: '800', color: '#dde3f0' },
  statLbl:           { fontSize: 10, color: '#7a85a0', fontWeight: '600', letterSpacing: 0.6, marginTop: 2 },
  sectionLabel:      { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#7a85a0', paddingHorizontal: 24, marginBottom: 12 },
  exCard:            { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 10 },
  exThumb:           { width: 52, height: 52, borderRadius: 10, backgroundColor: '#242840', alignItems: 'center', justifyContent: 'center' },
  exName:            { fontSize: 15, fontWeight: '700', color: '#dde3f0', marginBottom: 4 },
  exMeta:            { fontSize: 12, color: '#7a85a0' },
  weightBadge:       { backgroundColor: '#2b1510', borderWidth: 1, borderColor: '#f04a18', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  weightText:        { fontSize: 13, fontWeight: '800', color: '#f04a18' },
  deleteBtn:         { width: 28, height: 28, borderRadius: 14, backgroundColor: '#2a1010', alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  deleteText:        { color: '#f04a18', fontSize: 12, fontWeight: '700' },
  addBtn:            { margin: 16, marginBottom: 8, backgroundColor: '#f04a18', borderRadius: 14, padding: 16, alignItems: 'center' },
  addBtnText:        { color: '#fff', fontSize: 16, fontWeight: '700' },
  endBtn:            { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 14, padding: 14, alignItems: 'center' },
  endBtnText:        { color: '#7a85a0', fontSize: 15, fontWeight: '600' },
  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard:         { backgroundColor: '#141720', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 48 },
  modalTitle:        { fontSize: 22, fontWeight: '800', color: '#dde3f0', marginBottom: 20, letterSpacing: -0.4 },
  fieldLabel:        { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: '#7a85a0', marginBottom: 8 },
  input:             { backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 16, fontSize: 17, color: '#dde3f0', marginBottom: 16 },
  rowInputs:         { flexDirection: 'row', gap: 12 },
  gymChip:           { backgroundColor: '#1c2030', borderWidth: 1, borderColor: '#22273a', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8 },
  gymChipActive:     { backgroundColor: '#f04a18', borderColor: '#f04a18' },
  gymChipText:       { fontSize: 13, fontWeight: '600', color: '#7a85a0' },
  gymChipTextActive: { color: '#fff' },
  modalBtn:          { backgroundColor: '#f04a18', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 },
  modalBtnText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalSkip:         { alignItems: 'center', padding: 8 },
  modalSkipText:     { color: '#7a85a0', fontSize: 14 },
  // Session start buttons
  freeBtn:           { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 15, alignItems: 'center' },
  freeBtnText:       { color: '#dde3f0', fontSize: 15, fontWeight: '700' },
  progCard:          { marginHorizontal: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 15, gap: 8 },
  progCardTitle:     { fontSize: 14, fontWeight: '700', color: '#dde3f0', marginBottom: 2 },
  progCardSub:       { fontSize: 12, color: '#7a85a0' },
  progCardArrow:     { color: '#f04a18', fontSize: 18, fontWeight: '700' },
  guideTitle:        { fontSize: 13, fontWeight: '700', color: '#7a85a0', letterSpacing: 0.3, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 },
  // Session picker
  pickRow:           { flexDirection: 'row', alignItems: 'center', backgroundColor: '#242840', borderRadius: 14, padding: 14, marginBottom: 8 },
  pickRowToday:      { borderWidth: 1.5, borderColor: '#f04a18', backgroundColor: 'rgba(240,74,24,.07)' },
  pickRowTop:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  pickDayName:       { fontSize: 13, fontWeight: '700', color: '#7a85a0', textTransform: 'uppercase', letterSpacing: 0.6 },
  pickType:          { fontSize: 15, fontWeight: '700', color: '#dde3f0', marginBottom: 2 },
  pickMuscles:       { fontSize: 12, color: '#7a85a0' },
  pickArrow:         { fontSize: 22, color: '#f04a18', fontWeight: '700', marginLeft: 8 },
  todayBadge:        { backgroundColor: '#f04a18', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  todayBadgeText:    { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  // Program day modal
  progDayHeader:     { marginBottom: 8 },
  progDayBadge:      { backgroundColor: 'rgba(240,74,24,.12)', borderWidth: 1, borderColor: 'rgba(240,74,24,.3)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 12 },
  progDayBadgeText:  { fontSize: 12, fontWeight: '700', color: '#f04a18', letterSpacing: 0.3 },
  progDayType:       { fontSize: 22, fontWeight: '800', color: '#dde3f0', letterSpacing: -0.4, marginBottom: 4 },
  progDayMuscles:    { fontSize: 13, color: '#7a85a0', marginBottom: 18 },
  progExList:        { gap: 10, marginBottom: 24 },
  progExRow:         { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progExNum:         { width: 24, height: 24, borderRadius: 12, backgroundColor: '#f04a18', alignItems: 'center', justifyContent: 'center' },
  progExNumText:     { color: '#fff', fontSize: 11, fontWeight: '800' },
  progExName:        { fontSize: 14, fontWeight: '700', color: '#dde3f0' },
  progExMeta:        { fontSize: 12, color: '#7a85a0' },
  // Guide
  guideTabs:         { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 14 },
  guideTabBtn:       { flex: 1, backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 12, padding: 11, alignItems: 'center' },
  guideTabBtnActive: { backgroundColor: '#f04a18', borderColor: '#f04a18' },
  guideTabText:      { fontSize: 13, fontWeight: '700', color: '#7a85a0' },
  guideTabTextActive:{ color: '#fff' },
  basicsGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, marginBottom: 20 },
  basicCard:         { width: '47%', backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 16, padding: 14 },
  basicIcon:         { fontSize: 22, marginBottom: 8 },
  basicH:            { fontSize: 13, fontWeight: '700', color: '#dde3f0', marginBottom: 4 },
  basicP:            { fontSize: 12, color: '#7a85a0', lineHeight: 17 },
  groupList:         { paddingHorizontal: 16, marginBottom: 20, gap: 8 },
  groupRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 14 },
  groupDot:          { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  groupNameRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  groupName:         { fontSize: 14, fontWeight: '700', color: '#dde3f0' },
  groupSubBadge:     { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  groupSubText:      { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  groupMuscles:      { fontSize: 12, color: '#7a85a0', lineHeight: 18 },
  appStepNum:        { width: 26, height: 26, borderRadius: 13, backgroundColor: '#f04a18', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  appStepNumText:    { color: '#fff', fontSize: 12, fontWeight: '800' },
});
