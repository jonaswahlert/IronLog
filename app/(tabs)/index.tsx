import { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, Alert, Image, ImageBackground, KeyboardAvoidingView, Platform,
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
import { resolveImagePath } from '../../lib/imagePaths';

const GUIDE = {
  sv: {
    tabBasics:      'Grunderna',
    tabMuscles:     'Muskelgrupper',
    tabApp:         'Appen',
    tabSupplements: 'Kosttillskott',
    basics: [
      { icon: '🔁', h: 'Set & reps',   p: '3 rundor av 10 armhävningar = 3 set × 10 reps.' },
      { icon: '⚖️', h: 'Hur tungt?',   p: 'Sista repet ska vara svårt men genomförbart.' },
      { icon: '⏱️', h: 'Vilotid',      p: 'Vänta 1–2 minuter mellan set.' },
      { icon: '💨', h: 'Andas rätt',   p: 'Andas ut vid ansträngning, in vid vila.' },
    ],
    groups: [
      {
        color: '#f04a18', name: 'Tryckmuskler', sub: 'Träna ihop', muscles: 'Bröst  ·  Axlar  ·  Baksida arm',
        detail: 'Dessa tre muskelgrupper jobbar tillsammans i nästan alla tryckrörelser — när du trycker något ifrån dig (bänkpress, axelpress, dips) används bröst, axlar och baksida arm samtidigt. Genom att träna dem samma pass belastar du samma rörelsemönster en gång, och kan sedan vila dem tillsammans till nästa gång — istället för att träna samma muskler flera dagar i rad utan återhämtning.\n\nNybörjartips: börja med den största muskelgruppen (bröst) innan du går vidare till mindre (axlar, triceps), annars orkar du inte lika mycket på de stora övningarna. 2–3 övningar räcker för ett bra pass i början.',
        rest: '48–72 timmars vila rekommenderas innan du tränar tryckmuskler igen med tung belastning. Bröst är störst av de tre och styr återhämtningstiden — vänta gärna tills eventuell träningsvärk lagt sig. Axlar och triceps jobbar redan indirekt vid bröstövningar och behöver i praktiken samma vila.',
      },
      {
        color: '#1ecfa4', name: 'Dragmuskler',  sub: 'Träna ihop', muscles: 'Rygg  ·  Framsida arm',
        detail: 'Dragmuskler aktiveras i alla rörelser där du drar något mot kroppen — rodd, latsdrag, pull-ups. Rygg och biceps jobbar alltid tillsammans i dessa övningar, så det är naturligt att träna dem ihop. Att separera tryck- och dragövningar till olika pass gör att du kan träna oftare utan att muskelgrupperna är för trötta.\n\nNybörjartips: fokusera på att dra med ryggen, inte bara armarna — tänk "för armbågarna bakåt" snarare än "böj armen". Det ger bättre resultat och minskar risken för att bara bicepsen tar all belastning.',
        rest: '48–72 timmars vila rekommenderas innan nästa tunga dragpass. Ryggen är en stor muskelgrupp som styr återhämtningstiden. Biceps belastas indirekt vid ryggövningar och behöver därför i praktiken samma vila, även om den isolerad återhämtar sig något snabbare.',
      },
      {
        color: '#4a8af0', name: 'Ben & rumpa',  sub: 'Eget pass',  muscles: 'Lår  ·  Rumpa  ·  Mage',
        detail: 'Benen är kroppens största muskelgrupp och förtjänar ofta ett eget pass, eftersom övningar som benpress och utfall är krävande för hela kroppen — inklusive magen/core, som jobbar som stabilisator i nästan alla benövningar. Att blanda in ett tungt benpass med tryck eller drag blir oftast för mycket på en gång för de flesta nybörjare.\n\nNybörjartips: många hoppar över benpass för att det är jobbigare — men starka ben ger bättre balans i hela kroppen och förebygger skador. Börja lugnt med lägre vikt och fokusera på tekniken innan du lastar på.',
        rest: 'Ofta den muskelgrupp som behöver längst vila — räkna med 48–72 timmar, ibland upp till 3 dygn efter ett tungt benpass som nybörjare. Vänta gärna tills eventuell träningsvärk i lår/rumpa lagt sig innan du kör hårt igen.',
      },
      {
        color: '#a04af0', name: 'Kondition',    sub: 'När som',    muscles: 'Löpband  ·  Cykel  ·  Crosstrainer',
        detail: 'Konditionsträning belastar hjärta och lungor snarare än specifika muskler, så den kan i princip läggas in när som helst — före, efter eller på en helt egen dag. Många nybörjare kombinerar ett kort konditionspass (10–20 min) i slutet av ett styrkepass.\n\nNybörjartips: kör inte hård kondition direkt före tunga styrkeövningar — det tröttar ut kroppen och du orkar lyfta mindre. Lägg konditionen sist i passet, eller på en separat dag om målet är muskeltillväxt.',
        rest: 'Inget specifikt muskelbehov av vila som vid styrketräning, men undvik hög intensitet flera dagar i rad — hjärta, leder och nervsystem behöver återhämtning också. Växla gärna med lugnare pass eller en vilodag, särskilt samma vecka som du styrketränar tungt.',
      },
    ],
    appSteps: [
      { step: '1', h: 'Starta pass',              p: 'Tryck "Starta träningspass" och ange stad och gym.' },
      { step: '2', h: 'Lägg till övning',         p: 'Tryck "+ Lägg till övning" för varje maskin du tränar på.' },
      { step: '3', h: 'Ny maskin? Skanna den',     p: 'Bara första gången du tränar på en maskin: fota den → AI identifierar den automatiskt och sparar den i ditt register.' },
      { step: '4', h: 'Tränat här förut? Välj i listan', p: 'Nästa gång du tränar på samma maskin: välj den bara i din sparade lista — ingen ny skanning behövs.' },
      { step: '5', h: 'Registrera vikt',           p: 'Fota viktplattan eller ange kg manuellt.' },
      { step: '6', h: 'Spara & upprepa',           p: 'Kontrollera set/reps, tryck Spara. Upprepa för varje maskin i passet.' },
      { step: '7', h: 'Avsluta pass',              p: 'Tryck "Avsluta pass" när träningen är klar.' },
    ],
    supplements: [
      { icon: '🥛', h: 'Protein',  p: 'Byggstenen för muskelåterhämtning och -tillväxt. Om du har svårt att nå ditt dagliga proteinbehov via vanlig mat kan ett proteinpulver (vassle eller växtbaserat) vara ett enkelt sätt att täcka mellanskillnaden. Total mängd protein per dag är viktigare än exakt timing runt träningspasset.' },
      { icon: '⚡', h: 'Kreatin',  p: 'Ett av de mest välstuderade och beprövade tillskotten som finns. Kreatinmonohydrat kan ge några procents extra styrka och uthållighet vid tunga, korta ansträngningar (knäböj, bänkpress, marklyft). Rekommenderad dos är 3–5 g per dag — när på dygnet spelar ingen roll, effekten byggs upp över några veckor.' },
      { icon: '☕', h: 'Koffein',  p: 'Ett av de mest beprövade sätten att prestera lite bättre, särskilt vid kondition och långa pass. Tas gärna 30–60 minuter innan träning, t.ex. som kaffe eller ett förträningstillskott. Var försiktig med mängden sent på dagen om det stör sömnen.' },
      { icon: '🍊', h: 'Övrigt (omega-3, vitamin D)', p: 'Kan vara relevanta om du äter lite fisk eller får lite sol, men påverkar inte prestationen direkt på samma sätt som protein och kreatin — se dem mer som allmänt hälsostöd.' },
      { icon: '⚠️', h: 'Kom ihåg', p: 'Tillskott ersätter aldrig bra kost, sömn och ett bra träningsupplägg — se dem som ett komplement, inte en genväg. Rådgör med läkare om du är osäker, gravid, sjuk eller tar andra mediciner.' },
    ],
  },
  en: {
    tabBasics:      'The basics',
    tabMuscles:     'Muscle groups',
    tabApp:         'How to use',
    tabSupplements: 'Supplements',
    basics: [
      { icon: '🔁', h: 'Sets & reps',    p: '3 rounds of 10 push-ups = 3 sets × 10 reps.' },
      { icon: '⚖️', h: 'How heavy?',     p: 'Last rep should be hard but doable.' },
      { icon: '⏱️', h: 'Rest time',      p: 'Wait 1–2 minutes between sets.' },
      { icon: '💨', h: 'Breathe right',  p: 'Breathe out on effort, in on rest.' },
    ],
    groups: [
      {
        color: '#f04a18', name: 'Push muscles', sub: 'Train together', muscles: 'Chest  ·  Shoulders  ·  Triceps',
        detail: 'These three muscle groups work together in almost every pushing movement — bench press, shoulder press, dips all use chest, shoulders and triceps at the same time. Training them in the same session loads this movement pattern once, then lets you rest it together until next time, instead of hitting the same muscles several days in a row without recovery.\n\nBeginner tip: start with the biggest muscle group (chest) before moving to smaller ones (shoulders, triceps) — otherwise you won\'t have energy left for the big lifts. 2–3 exercises is plenty for a good beginner session.',
        rest: 'Rest 48–72 hours before training push muscles hard again. Chest is the largest of the three and sets the pace — wait until any soreness has eased. Shoulders and triceps are already worked indirectly during chest exercises, so they need roughly the same rest in practice.',
      },
      {
        color: '#1ecfa4', name: 'Pull muscles', sub: 'Train together', muscles: 'Back  ·  Biceps',
        detail: 'Pull muscles are activated in every movement where you pull something toward your body — rows, lat pulldowns, pull-ups. Back and biceps always work together in these exercises, so it\'s natural to train them together. Separating push and pull days lets you train more often without the same muscles being too fatigued.\n\nBeginner tip: focus on pulling with your back, not just your arms — think "elbows back" rather than "bend the arm". This gives better results and stops your biceps from taking all the load.',
        rest: 'Rest 48–72 hours before your next heavy pull session. Back is a large muscle group that determines recovery time. Biceps are worked indirectly during back exercises, so they need about the same rest even though they recover slightly faster in isolation.',
      },
      {
        color: '#4a8af0', name: 'Legs & glutes',sub: 'Own session',    muscles: 'Thighs  ·  Glutes  ·  Core',
        detail: 'Legs are the body\'s largest muscle group and often deserve their own session, since exercises like leg press and lunges are demanding for the whole body — including the core, which stabilizes almost every leg exercise. Combining a heavy leg day with push or pull exercises is usually too much for most beginners in one session.\n\nBeginner tip: many skip leg day because it\'s tougher — but strong legs improve balance throughout the body and help prevent injuries. Start light and focus on technique before adding weight.',
        rest: 'Usually the muscle group that needs the longest rest — plan for 48–72 hours, sometimes up to 3 days after a heavy leg session as a beginner. Wait until any soreness in thighs/glutes has eased before training hard again.',
      },
      {
        color: '#a04af0', name: 'Cardio',        sub: 'Anytime',       muscles: 'Treadmill  ·  Bike  ·  Cross trainer',
        detail: 'Cardio trains your heart and lungs rather than specific muscles, so it can be added almost anywhere — before, after, or on its own day. Many beginners add a short cardio session (10–20 min) at the end of a strength workout.\n\nBeginner tip: don\'t do hard cardio right before heavy strength exercises — it tires out your body and you\'ll lift less. Put cardio at the end of the session, or on a separate day if your main goal is muscle growth.',
        rest: 'No muscle-specific rest requirement like strength training, but avoid high intensity several days in a row — heart, joints and nervous system need recovery too. Mix in easier sessions or a rest day, especially in weeks when you\'re also strength training hard.',
      },
    ],
    appSteps: [
      { step: '1', h: 'Start session',            p: 'Tap "Start training session" and enter city and gym.' },
      { step: '2', h: 'Add exercise',              p: 'Tap "+ Add exercise" for each machine you train on.' },
      { step: '3', h: 'New machine? Scan it',      p: 'Only the first time you use a machine: photograph it → AI identifies it automatically and saves it to your registry.' },
      { step: '4', h: 'Used it before? Pick it',   p: 'Next time on the same machine: just select it from your saved list — no need to scan again.' },
      { step: '5', h: 'Log weight',                p: 'Photograph the weight plate or enter kg manually.' },
      { step: '6', h: 'Save & repeat',              p: 'Check sets/reps, tap Save. Repeat for each machine in the session.' },
      { step: '7', h: 'Finish session',            p: 'Tap "End session" when you are done training.' },
    ],
    supplements: [
      { icon: '🥛', h: 'Protein',  p: 'The building block for muscle recovery and growth. If it\'s hard to hit your daily protein target from regular food, a protein powder (whey or plant-based) is an easy way to cover the gap. Total daily protein matters more than exact timing around your workout.' },
      { icon: '⚡', h: 'Creatine', p: 'One of the most studied and proven supplements out there. Creatine monohydrate can add a few percent extra strength and endurance on heavy, short efforts (squats, bench press, deadlifts). Recommended dose is 3–5 g per day — timing doesn\'t matter, the effect builds up over a few weeks.' },
      { icon: '☕', h: 'Caffeine', p: 'One of the most proven ways to perform a little better, especially for cardio and longer sessions. Best taken 30–60 minutes before training, e.g. as coffee or a pre-workout. Watch the amount late in the day if it affects your sleep.' },
      { icon: '🍊', h: 'Others (omega-3, vitamin D)', p: 'Can be relevant if you eat little fish or get little sun, but they don\'t directly affect performance the way protein and creatine do — think of them more as general health support.' },
      { icon: '⚠️', h: 'Keep in mind', p: 'Supplements never replace good food, sleep and a solid training plan — think of them as a complement, not a shortcut. Talk to a doctor if you\'re unsure, pregnant, ill, or taking other medication.' },
    ],
  },
} as const;

const BG_IMAGE = require('../../assets/hero-bg.jpg');

export default function SessionScreen() {
  const t = useTranslation();
  const { lang } = useLang();
  const [guideTab, setGuideTab]           = useState<'basics' | 'muscles' | 'app' | 'supplements'>('app');
  const [guideOpen, setGuideOpen]         = useState(false);
  const [savedProgram, setSavedProgram]   = useState<ProgramDay[] | null>(null);
  const [activeProgName, setActiveProgName] = useState<string | null>(null);
  const [programDayModal, setProgramDayModal] = useState<ProgramDay | null>(null);
  const [muscleDetailIdx, setMuscleDetailIdx] = useState<number | null>(null);
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
                  {ex.machine_image_path
                    ? <Image source={{ uri: resolveImagePath(ex.machine_image_path)! }} style={s.exThumbImg} />
                    : <Text style={{ fontSize: 22 }}>🏋️</Text>
                  }
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
            {/* ── Guide entry point – collapsed behind a button ── */}
            <TouchableOpacity style={s.guideOpenBtn} onPress={() => setGuideOpen(true)}>
              <Text style={s.guideOpenIcon}>📖</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.guideOpenTitle}>{lang === 'sv' ? 'Lär dig träna' : 'Learn to train'}</Text>
                <Text style={s.guideOpenSub}>
                  {lang === 'sv' ? 'Hur appen funkar, muskelgrupper, kosttillskott' : 'How the app works, muscle groups, supplements'}
                </Text>
              </View>
              <Text style={s.progCardArrow}>→</Text>
            </TouchableOpacity>

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

      {/* Guide modal – how the app works, muscle groups, supplements */}
      <Modal visible={guideOpen} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.guideModalCard}>
            <View style={s.guideModalHeader}>
              <Text style={s.guideTitle}>{lang === 'sv' ? 'Lär dig träna' : 'Learn to train'}</Text>
              <TouchableOpacity onPress={() => setGuideOpen(false)}>
                <Text style={s.guideModalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={s.guideTabs}>
              <View style={s.guideTabRow}>
                <TouchableOpacity
                  style={[s.guideTabBtn, guideTab === 'app' && s.guideTabBtnActive]}
                  onPress={() => setGuideTab('app')}
                >
                  <Text style={[s.guideTabText, guideTab === 'app' && s.guideTabTextActive]} numberOfLines={1} adjustsFontSizeToFit>
                    {GUIDE[lang].tabApp}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.guideTabBtn, guideTab === 'basics' && s.guideTabBtnActive]}
                  onPress={() => setGuideTab('basics')}
                >
                  <Text style={[s.guideTabText, guideTab === 'basics' && s.guideTabTextActive]} numberOfLines={1} adjustsFontSizeToFit>
                    {GUIDE[lang].tabBasics}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={s.guideTabRow}>
                <TouchableOpacity
                  style={[s.guideTabBtn, guideTab === 'muscles' && s.guideTabBtnActive]}
                  onPress={() => setGuideTab('muscles')}
                >
                  <Text style={[s.guideTabText, guideTab === 'muscles' && s.guideTabTextActive]} numberOfLines={1} adjustsFontSizeToFit>
                    {GUIDE[lang].tabMuscles}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.guideTabBtn, guideTab === 'supplements' && s.guideTabBtnActive]}
                  onPress={() => setGuideTab('supplements')}
                >
                  <Text style={[s.guideTabText, guideTab === 'supplements' && s.guideTabTextActive]} numberOfLines={1} adjustsFontSizeToFit>
                    {GUIDE[lang].tabSupplements}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16 }}>
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
              ) : guideTab === 'muscles' ? (
                <View style={s.groupList}>
                  {GUIDE[lang].groups.map((g, i) => (
                    <TouchableOpacity key={i} style={s.groupRow} onPress={() => setMuscleDetailIdx(i)}>
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
                      <Text style={s.groupArrow}>›</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={s.groupList}>
                  {GUIDE[lang].supplements.map((sup, i) => (
                    <View key={i} style={s.groupRow}>
                      <Text style={s.supplementIcon}>{sup.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={s.groupName}>{sup.h}</Text>
                        <Text style={s.groupMuscles}>{sup.p}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Muscle group detail modal */}
      <Modal visible={muscleDetailIdx !== null} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            {muscleDetailIdx !== null && (
              <>
                <View style={s.groupNameRow}>
                  <View style={[s.groupDot, { backgroundColor: GUIDE[lang].groups[muscleDetailIdx].color }]} />
                  <Text style={[s.progDayType, { flex: 1, marginBottom: 0 }]}>{GUIDE[lang].groups[muscleDetailIdx].name}</Text>
                </View>
                <Text style={[s.progDayMuscles, { marginBottom: 16 }]}>{GUIDE[lang].groups[muscleDetailIdx].muscles}</Text>
                <ScrollView style={{ maxHeight: 380 }}>
                  <Text style={s.muscleDetailText}>{GUIDE[lang].groups[muscleDetailIdx].detail}</Text>
                  <View style={s.restBox}>
                    <Text style={s.restLabel}>🛌  {lang === 'sv' ? 'VILA & ÅTERHÄMTNING' : 'REST & RECOVERY'}</Text>
                    <Text style={s.muscleDetailText}>{GUIDE[lang].groups[muscleDetailIdx].rest}</Text>
                  </View>
                </ScrollView>
              </>
            )}
            <TouchableOpacity style={s.modalSkip} onPress={() => setMuscleDetailIdx(null)}>
              <Text style={s.modalSkipText}>{lang === 'sv' ? 'Stäng' : 'Close'}</Text>
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
  exThumb:           { width: 52, height: 52, borderRadius: 10, backgroundColor: '#242840', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  exThumbImg:        { width: '100%', height: '100%' },
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
  guideTitle:        { fontSize: 20, fontWeight: '800', color: '#dde3f0', letterSpacing: -0.4 },
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
  guideOpenBtn:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 16, backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 14, padding: 16 },
  guideOpenIcon:     { fontSize: 24 },
  guideOpenTitle:    { fontSize: 15, fontWeight: '700', color: '#dde3f0', marginBottom: 2 },
  guideOpenSub:      { fontSize: 12, color: '#7a85a0', lineHeight: 16 },
  guideModalCard:    { backgroundColor: '#141720', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingBottom: 40, maxHeight: '85%' },
  guideModalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 14 },
  guideModalClose:   { fontSize: 20, color: '#7a85a0', padding: 4 },
  guideTabs:         { paddingHorizontal: 16, marginBottom: 14, gap: 8 },
  guideTabRow:       { flexDirection: 'row', gap: 8 },
  guideTabBtn:       { flex: 1, backgroundColor: '#1c2030', borderWidth: 1.5, borderColor: '#22273a', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 10, alignItems: 'center' },
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
  groupArrow:        { fontSize: 20, color: '#7a85a0', marginTop: 2, flexShrink: 0 },
  supplementIcon:    { fontSize: 22, marginTop: 2, flexShrink: 0 },
  muscleDetailText:  { fontSize: 14, color: '#c3c9db', lineHeight: 22 },
  restBox:           { marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#22273a' },
  restLabel:         { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#1ecfa4', marginBottom: 8 },
  appStepNum:        { width: 26, height: 26, borderRadius: 13, backgroundColor: '#f04a18', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  appStepNumText:    { color: '#fff', fontSize: 12, fontWeight: '800' },
});
