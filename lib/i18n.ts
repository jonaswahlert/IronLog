import { useLang } from './LanguageContext';

const T = {
  sv: {
    // Home screen
    training_session:    'Träningspass',
    exercises_label:     'ÖVNINGAR',
    total_sets:          'SET TOTALT',
    time:                'TID',
    completed_exercises: 'GENOMFÖRDA ÖVNINGAR',
    start_session:       'Starta träningspass',
    add_exercise:        '+ Lägg till övning',
    where_training:      'Var tränar du idag?',
    city:                'STAD',
    city_placeholder:    'Stad, t.ex. Stockholm',
    gym_optional:        'GYM (VALFRITT)',
    other_gym:           'Annat gym...',
    gym_placeholder:     'Skriv gymnamn',
    start_session_btn:   'Starta pass',
    skip:                'Hoppa över',
    unknown_machine:     'Okänd maskin',
    // Machines screen
    machines:            'Maskiner',
    all_cities:          'Alla orter',
    all_gyms:            'Alla gym',
    no_machines_title:   'Inga maskiner ännu',
    no_machines_sub:     'Skanna din första maskin med knappen ovan – vart efter du tränar eller hela gymmet på en gång.',
    unknown_city:        'Okänd ort',
    other:               'Övrigt',
    scan_machines_title: 'Skanna maskiner',
    scan_machines_sub:   'Skanna vart efter du tränar — eller kartlägg hela gymmet på en gång',
    // History screen
    history_title:       'Historik',
    no_sessions:         'Inga träningspass ännu.',
    exercises_word:      'övningar',
    // Tab bar
    tab_session:         'Pass',
    tab_machines:        'Maskiner',
    tab_history:         'Historik',
    tab_profile:         'Profil',
    tab_program:         'Program',
    // New exercise screen
    new_exercise:        'Ny övning',
    machine:             'MASKIN',
    select_from_list:    'Välj från register',
    scan_new_machine:    'Skanna ny maskin',
    from_registry:       'FRÅN REGISTER',
    ai_identification:   'AI-IDENTIFIERING',
    tap_to_change:       'Tryck för att ändra',
    weight:              'VIKT',
    saving:              'Sparar...',
    save_exercise:       '✓ Spara övning',
    // Scan machine screen
    identify_machine:    'Identifiera maskin',
    ai_done:             'AI-IDENTIFIERING KLAR',
    manual_entry:        'MANUELL INMATNING',
    confidence:          'Konfidensgrad',
    muscle_group:        'MUSKELGRUPP',
    save_and_continue:   '✓ Spara och fortsätt',
    retake:              'Ta om bilden',
    camera_hint_machine: 'Fotografera maskinen eller dess namnskylt',
    camera_permission:   'IronLog behöver åtkomst till kameran.',
    allow_camera:        'Tillåt kamera',
    // Select machine screen
    select_machine:      'Välj maskin',
    no_machines_saved:   'Inga maskiner sparade ännu.',
    scan_new_machine_btn:'📷  Skanna ny maskin',
    // Cancel / end session
    end_session:         'Avsluta pass',
    end_session_msg:     'Passet sparas i historiken.',
    cancel_session:      'Radera pass',
    cancel_session_msg:  'Alla övningar i detta pass raderas permanent.',
    keep_training:       'Fortsätt träna',
    // Edit / delete
    edit:                'Redigera',
    delete:              'Radera',
    confirm_delete:      'Bekräfta radering',
    cannot_undo:         'Kan inte ångras.',
    cancel:              'Avbryt',
    save:                'Spara',
    // Manual entry
    enter_machine_name:  'Skriv maskinnamn',
    enter_weight_kg:     'Vikt i kg',
    enter_sets:          'Sets',
    enter_reps:          'Reps',
    // Session detail
    session_detail:      'Träningspass',
    no_exercises:        'Inga övningar registrerade.',
    // Home
    go_home:             'Hem',
    // Machines
    edit_machine:        'Redigera maskin',
    delete_machine_msg:  'Maskinen och alla kopplade övningar raderas.',
  },
  en: {
    // Home screen
    training_session:    'Workout',
    exercises_label:     'EXERCISES',
    total_sets:          'TOTAL SETS',
    time:                'TIME',
    completed_exercises: 'COMPLETED EXERCISES',
    start_session:       'Start Workout',
    add_exercise:        '+ Add Exercise',
    where_training:      'Where are you training today?',
    city:                'CITY',
    city_placeholder:    'City, e.g. Stockholm',
    gym_optional:        'GYM (OPTIONAL)',
    other_gym:           'Other gym...',
    gym_placeholder:     'Enter gym name',
    start_session_btn:   'Start session',
    skip:                'Skip',
    unknown_machine:     'Unknown machine',
    // Machines screen
    machines:            'Machines',
    all_cities:          'All cities',
    all_gyms:            'All gyms',
    no_machines_title:   'No machines yet',
    no_machines_sub:     'Scan your first machine using the button above — as you train or all at once.',
    unknown_city:        'Unknown city',
    other:               'Other',
    scan_machines_title: 'Scan machines',
    scan_machines_sub:   'Scan as you train — or map out the whole gym at once',
    // History screen
    history_title:       'History',
    no_sessions:         'No workouts yet.',
    exercises_word:      'exercises',
    // Tab bar
    tab_session:         'Session',
    tab_machines:        'Machines',
    tab_history:         'History',
    tab_profile:         'Profile',
    tab_program:         'Program',
    // New exercise screen
    new_exercise:        'New Exercise',
    machine:             'MACHINE',
    select_from_list:    'Select from list',
    scan_new_machine:    'Scan new machine',
    from_registry:       'FROM REGISTRY',
    ai_identification:   'AI IDENTIFICATION',
    tap_to_change:       'Tap to change',
    weight:              'WEIGHT',
    saving:              'Saving...',
    save_exercise:       '✓ Save Exercise',
    // Scan machine screen
    identify_machine:    'Identify Machine',
    ai_done:             'AI IDENTIFICATION COMPLETE',
    manual_entry:        'MANUAL ENTRY',
    confidence:          'Confidence',
    muscle_group:        'MUSCLE GROUP',
    save_and_continue:   '✓ Save and continue',
    retake:              'Retake photo',
    camera_hint_machine: 'Photo of the machine or its name plate',
    camera_permission:   'IronLog needs camera access.',
    allow_camera:        'Allow Camera',
    // Select machine screen
    select_machine:      'Select Machine',
    no_machines_saved:   'No machines saved yet.',
    scan_new_machine_btn:'📷  Scan new machine',
    // Cancel / end session
    end_session:         'End Session',
    end_session_msg:     'The session is saved to history.',
    cancel_session:      'Delete Session',
    cancel_session_msg:  'All exercises in this session will be permanently deleted.',
    keep_training:       'Keep Training',
    // Edit / delete
    edit:                'Edit',
    delete:              'Delete',
    confirm_delete:      'Confirm Delete',
    cannot_undo:         'This cannot be undone.',
    cancel:              'Cancel',
    save:                'Save',
    // Manual entry
    enter_machine_name:  'Enter machine name',
    enter_weight_kg:     'Weight in kg',
    enter_sets:          'Sets',
    enter_reps:          'Reps',
    // Session detail
    session_detail:      'Workout',
    no_exercises:        'No exercises recorded.',
    // Home
    go_home:             'Home',
    // Machines
    edit_machine:        'Edit Machine',
    delete_machine_msg:  'The machine and all linked exercises will be deleted.',
  },
} as const;

export type TKey = keyof typeof T.sv;

export function useTranslation() {
  const { lang } = useLang();
  return (key: TKey): string => T[lang][key];
}
