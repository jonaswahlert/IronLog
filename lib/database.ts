import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('ironlog.db');

export function initDatabase() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS machines (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL,
      image_path   TEXT,
      city         TEXT,
      gym          TEXT,
      muscle_group TEXT,
      created_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT NOT NULL,
      city       TEXT,
      gym        TEXT,
      started_at TEXT NOT NULL,
      ended_at   TEXT
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id         INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      machine_id         INTEGER REFERENCES machines(id),
      machine_type       TEXT,
      machine_confidence REAL,
      machine_image_path TEXT,
      muscle_group       TEXT,
      weight_kg          REAL,
      weight_confidence  REAL,
      weight_image_path  TEXT,
      sets               INTEGER,
      reps               INTEGER,
      notes              TEXT,
      created_at         TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migrationer för befintlig databas
  try { db.execSync(`ALTER TABLE sessions ADD COLUMN city TEXT`); } catch {}
  try { db.execSync(`ALTER TABLE sessions ADD COLUMN gym TEXT`); } catch {}
  try { db.execSync(`ALTER TABLE machines ADD COLUMN gym TEXT`); } catch {}
  try { db.execSync(`ALTER TABLE exercises ADD COLUMN machine_id INTEGER REFERENCES machines(id)`); } catch {}
  try { db.execSync(`ALTER TABLE exercises ADD COLUMN muscle_group TEXT`); } catch {}
}

// ── Machines ──────────────────────────────────────────────
export function saveMachine(data: Omit<Machine, 'id' | 'created_at'>): Machine {
  const result = db.runSync(
    `INSERT INTO machines (name, image_path, city, gym, muscle_group) VALUES (?, ?, ?, ?, ?)`,
    [data.name, data.image_path ?? null, data.city ?? null, data.gym ?? null, data.muscle_group ?? null]
  );
  return db.getFirstSync<Machine>('SELECT * FROM machines WHERE id = ?', [result.lastInsertRowId])!;
}

export function getAllMachines(): Machine[] {
  return db.getAllSync<Machine>('SELECT * FROM machines ORDER BY city, gym, muscle_group, name');
}

export function getCities(): string[] {
  const rows = db.getAllSync<{ city: string }>('SELECT DISTINCT city FROM machines WHERE city IS NOT NULL ORDER BY city');
  return rows.map(r => r.city);
}

export function getGymsForCity(city: string): string[] {
  const rows = db.getAllSync<{ gym: string }>(
    'SELECT DISTINCT gym FROM machines WHERE city = ? AND gym IS NOT NULL ORDER BY gym',
    [city]
  );
  return rows.map(r => r.gym);
}

export function getLastExerciseForMachine(machineId: number): Exercise | null {
  return db.getFirstSync<Exercise>(
    'SELECT * FROM exercises WHERE machine_id = ? ORDER BY created_at DESC LIMIT 1',
    [machineId]
  ) ?? null;
}

// ── Sessions ──────────────────────────────────────────────
export function getTodaySession(): Session | null {
  const today = new Date().toISOString().split('T')[0];
  return db.getFirstSync<Session>('SELECT * FROM sessions WHERE date = ?', [today]) ?? null;
}

export function createSession(city?: string, gym?: string): Session {
  const today = new Date().toISOString().split('T')[0];
  const now   = new Date().toISOString();
  const result = db.runSync(
    'INSERT INTO sessions (date, city, gym, started_at) VALUES (?, ?, ?, ?)',
    [today, city ?? null, gym ?? null, now]
  );
  return db.getFirstSync<Session>('SELECT * FROM sessions WHERE id = ?', [result.lastInsertRowId])!;
}

export function getLastCity(): string | null {
  const row = db.getFirstSync<{ city: string }>(
    'SELECT city FROM sessions WHERE city IS NOT NULL ORDER BY id DESC LIMIT 1'
  );
  return row?.city ?? null;
}

export function getLastGym(city: string): string | null {
  const row = db.getFirstSync<{ gym: string }>(
    'SELECT gym FROM sessions WHERE city = ? AND gym IS NOT NULL ORDER BY id DESC LIMIT 1',
    [city]
  );
  return row?.gym ?? null;
}

export function getAllSessions(): Session[] {
  return db.getAllSync<Session>('SELECT * FROM sessions ORDER BY date DESC LIMIT 50');
}

// ── Exercises ─────────────────────────────────────────────
export function getExercisesForSession(sessionId: number): Exercise[] {
  return db.getAllSync<Exercise>(
    'SELECT * FROM exercises WHERE session_id = ? ORDER BY created_at ASC',
    [sessionId]
  );
}

export function addExercise(data: Omit<Exercise, 'id' | 'created_at'>): void {
  db.runSync(
    `INSERT INTO exercises
      (session_id, machine_id, machine_type, machine_confidence, machine_image_path,
       muscle_group, weight_kg, weight_confidence, weight_image_path, sets, reps, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.session_id,
      data.machine_id    ?? null,
      data.machine_type  ?? null,
      data.machine_confidence ?? null,
      data.machine_image_path ?? null,
      data.muscle_group  ?? null,
      data.weight_kg     ?? null,
      data.weight_confidence ?? null,
      data.weight_image_path ?? null,
      data.sets  ?? null,
      data.reps  ?? null,
      data.notes ?? null,
    ]
  );
}

// ── Types ─────────────────────────────────────────────────
export type Machine = {
  id: number;
  name: string;
  image_path: string | null;
  city: string | null;
  gym: string | null;
  muscle_group: string | null;
  created_at: string;
};

export type Session = {
  id: number;
  date: string;
  city: string | null;
  gym: string | null;
  started_at: string;
  ended_at: string | null;
};

export type Exercise = {
  id: number;
  session_id: number;
  machine_id: number | null;
  machine_type: string | null;
  machine_confidence: number | null;
  machine_image_path: string | null;
  muscle_group: string | null;
  weight_kg: number | null;
  weight_confidence: number | null;
  weight_image_path: string | null;
  sets: number | null;
  reps: number | null;
  notes: string | null;
  created_at: string;
};
