import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('ironlog.db');

export function initDatabase() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS sessions (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      date      TEXT NOT NULL,
      gym_name  TEXT,
      started_at TEXT NOT NULL,
      ended_at  TEXT
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id          INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      machine_type        TEXT,
      machine_confidence  REAL,
      machine_image_path  TEXT,
      muscle_groups       TEXT,
      weight_kg           REAL,
      weight_confidence   REAL,
      weight_image_path   TEXT,
      sets                INTEGER,
      reps                INTEGER,
      notes               TEXT,
      created_at          TEXT DEFAULT (datetime('now'))
    );
  `);
}

// Sessions
export function getTodaySession() {
  const today = new Date().toISOString().split('T')[0];
  return db.getFirstSync<Session>('SELECT * FROM sessions WHERE date = ?', [today]);
}

export function createSession(gymName?: string): Session {
  const today = new Date().toISOString().split('T')[0];
  const now   = new Date().toISOString();
  const result = db.runSync(
    'INSERT INTO sessions (date, gym_name, started_at) VALUES (?, ?, ?)',
    [today, gymName ?? null, now]
  );
  return db.getFirstSync<Session>('SELECT * FROM sessions WHERE id = ?', [result.lastInsertRowId])!;
}

export function getAllSessions(): Session[] {
  return db.getAllSync<Session>('SELECT * FROM sessions ORDER BY date DESC LIMIT 50');
}

// Exercises
export function getExercisesForSession(sessionId: number): Exercise[] {
  return db.getAllSync<Exercise>('SELECT * FROM exercises WHERE session_id = ? ORDER BY created_at ASC', [sessionId]);
}

export function addExercise(data: Omit<Exercise, 'id' | 'created_at'>): void {
  db.runSync(
    `INSERT INTO exercises
      (session_id, machine_type, machine_confidence, machine_image_path, muscle_groups,
       weight_kg, weight_confidence, weight_image_path, sets, reps, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.session_id,
      data.machine_type ?? null,
      data.machine_confidence ?? null,
      data.machine_image_path ?? null,
      data.muscle_groups ?? null,
      data.weight_kg ?? null,
      data.weight_confidence ?? null,
      data.weight_image_path ?? null,
      data.sets ?? null,
      data.reps ?? null,
      data.notes ?? null,
    ]
  );
}

// Types
export type Session = {
  id: number;
  date: string;
  gym_name: string | null;
  started_at: string;
  ended_at: string | null;
};

export type Exercise = {
  id: number;
  session_id: number;
  machine_type: string | null;
  machine_confidence: number | null;
  machine_image_path: string | null;
  muscle_groups: string | null;
  weight_kg: number | null;
  weight_confidence: number | null;
  weight_image_path: string | null;
  sets: number | null;
  reps: number | null;
  notes: string | null;
  created_at: string;
};
