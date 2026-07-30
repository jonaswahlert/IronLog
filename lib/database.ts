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

  try { db.execSync(`ALTER TABLE sessions ADD COLUMN city TEXT`); } catch {}
  try { db.execSync(`ALTER TABLE sessions ADD COLUMN gym TEXT`); } catch {}
  try { db.execSync(`ALTER TABLE machines ADD COLUMN gym TEXT`); } catch {}
  try { db.execSync(`ALTER TABLE exercises ADD COLUMN machine_id INTEGER REFERENCES machines(id)`); } catch {}
  try { db.execSync(`ALTER TABLE exercises ADD COLUMN muscle_group TEXT`); } catch {}
}

// ── Machines ──────────────────────────────────────────────
export function updateMachine(id: number, data: Partial<Pick<Machine, 'name' | 'muscle_group' | 'city' | 'gym'>>): void {
  const fields: string[] = [];
  const values: (string | null)[] = [];
  if (data.name !== undefined)         { fields.push('name = ?');         values.push(data.name); }
  if (data.muscle_group !== undefined) { fields.push('muscle_group = ?'); values.push(data.muscle_group); }
  if (data.city !== undefined)         { fields.push('city = ?');         values.push(data.city); }
  if (data.gym !== undefined)          { fields.push('gym = ?');          values.push(data.gym); }
  if (fields.length === 0) return;
  values.push(String(id));
  db.runSync(`UPDATE machines SET ${fields.join(', ')} WHERE id = ?`, values);
}

export function deleteMachine(id: number): void {
  db.runSync('DELETE FROM machines WHERE id = ?', [id]);
}

export function machineExists(name: string, city: string | null, gym: string | null): boolean {
  const row = db.getFirstSync<{ id: number }>(
    `SELECT id FROM machines WHERE lower(name) = lower(?) AND city IS ? AND gym IS ?`,
    [name, city, gym]
  );
  return row !== null;
}

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

export function getMachineImageByName(name: string): string | null {
  const row = db.getFirstSync<{ image_path: string | null }>(
    `SELECT image_path FROM machines
     WHERE lower(name) = lower(?)
        OR lower(name) LIKE '%' || lower(?) || '%'
        OR lower(?) LIKE '%' || lower(name) || '%'
     ORDER BY CASE WHEN lower(name) = lower(?) THEN 0 ELSE 1 END
     LIMIT 1`,
    [name, name, name, name]
  );
  return row?.image_path ?? null;
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
  return db.getFirstSync<Session>('SELECT * FROM sessions WHERE date = ? AND ended_at IS NULL', [today]) ?? null;
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

export function getSessionById(id: number): Session | null {
  return db.getFirstSync<Session>('SELECT * FROM sessions WHERE id = ?', [id]) ?? null;
}

export function endSession(id: number): void {
  db.runSync('UPDATE sessions SET ended_at = ? WHERE id = ?', [new Date().toISOString(), id]);
}

export function deleteSession(id: number): void {
  db.runSync('DELETE FROM sessions WHERE id = ?', [id]);
}

export function updateSession(id: number, data: { city?: string | null; gym?: string | null }): void {
  const fields: string[] = [];
  const values: (string | null | number)[] = [];
  if (data.city !== undefined) { fields.push('city = ?'); values.push(data.city); }
  if (data.gym  !== undefined) { fields.push('gym = ?');  values.push(data.gym); }
  if (fields.length === 0) return;
  values.push(id);
  db.runSync(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`, values);
}

// ── Exercises ─────────────────────────────────────────────
export function getExercisesForSession(sessionId: number): Exercise[] {
  return db.getAllSync<Exercise>(
    'SELECT * FROM exercises WHERE session_id = ? ORDER BY created_at ASC',
    [sessionId]
  );
}

export function updateExercise(id: number, data: Partial<Pick<Exercise, 'machine_type' | 'muscle_group' | 'weight_kg' | 'sets' | 'reps' | 'notes'>>): void {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (data.machine_type !== undefined) { fields.push('machine_type = ?'); values.push(data.machine_type); }
  if (data.muscle_group !== undefined) { fields.push('muscle_group = ?'); values.push(data.muscle_group); }
  if (data.weight_kg !== undefined)    { fields.push('weight_kg = ?');    values.push(data.weight_kg); }
  if (data.sets !== undefined)         { fields.push('sets = ?');          values.push(data.sets); }
  if (data.reps !== undefined)         { fields.push('reps = ?');          values.push(data.reps); }
  if (data.notes !== undefined)        { fields.push('notes = ?');         values.push(data.notes); }
  if (fields.length === 0) return;
  values.push(id);
  db.runSync(`UPDATE exercises SET ${fields.join(', ')} WHERE id = ?`, values);
}

export function deleteExercise(id: number): void {
  db.runSync('DELETE FROM exercises WHERE id = ?', [id]);
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

// ── Saved programs ────────────────────────────────────────
export type SavedProgram = {
  id: number;
  name: string;
  goal: string | null;
  data: string;
  is_active: number;
  created_at: string;
};

function ensureProgramsTable(): void {
  db.execSync(`CREATE TABLE IF NOT EXISTS saved_programs (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL DEFAULT 'Träningsprogram',
    goal       TEXT,
    data       TEXT NOT NULL DEFAULT '',
    is_active  INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  try { db.execSync(`ALTER TABLE saved_programs ADD COLUMN name TEXT NOT NULL DEFAULT 'Träningsprogram'`); } catch {}
  try { db.execSync(`ALTER TABLE saved_programs ADD COLUMN goal TEXT`); } catch {}
  try { db.execSync(`ALTER TABLE saved_programs ADD COLUMN is_active INTEGER NOT NULL DEFAULT 0`); } catch {}
  const active = db.getFirstSync<{ c: number }>(`SELECT COUNT(*) as c FROM saved_programs WHERE is_active = 1`);
  if (!active || active.c === 0) {
    const first = db.getFirstSync<{ id: number }>(`SELECT id FROM saved_programs ORDER BY id LIMIT 1`);
    if (first) db.runSync(`UPDATE saved_programs SET is_active = 1 WHERE id = ?`, [first.id]);
  }
}

export function getAllPrograms(): SavedProgram[] {
  ensureProgramsTable();
  return db.getAllSync<SavedProgram>(`SELECT * FROM saved_programs ORDER BY is_active DESC, created_at DESC`);
}

export function getActiveProgram(): SavedProgram | null {
  ensureProgramsTable();
  return db.getFirstSync<SavedProgram>(`SELECT * FROM saved_programs WHERE is_active = 1 LIMIT 1`) ?? null;
}

export function createProgram(name: string, goal: string | null, json: string): void {
  ensureProgramsTable();
  db.runSync(`UPDATE saved_programs SET is_active = 0`);
  db.runSync(
    `INSERT INTO saved_programs (name, goal, data, is_active, created_at) VALUES (?, ?, ?, 1, datetime('now'))`,
    [name, goal ?? null, json]
  );
}

export function setActiveProgram(id: number): void {
  ensureProgramsTable();
  db.runSync(`UPDATE saved_programs SET is_active = 0`);
  db.runSync(`UPDATE saved_programs SET is_active = 1 WHERE id = ?`, [id]);
}

export function deleteProgramById(id: number): void {
  ensureProgramsTable();
  const prog = db.getFirstSync<{ is_active: number }>(`SELECT is_active FROM saved_programs WHERE id = ?`, [id]);
  db.runSync(`DELETE FROM saved_programs WHERE id = ?`, [id]);
  if (prog?.is_active) {
    const next = db.getFirstSync<{ id: number }>(`SELECT id FROM saved_programs ORDER BY created_at DESC LIMIT 1`);
    if (next) db.runSync(`UPDATE saved_programs SET is_active = 1 WHERE id = ?`, [next.id]);
  }
}

export function renameProgramById(id: number, name: string): void {
  ensureProgramsTable();
  db.runSync(`UPDATE saved_programs SET name = ? WHERE id = ?`, [name, id]);
}

export function loadProgram(): string | null {
  return getActiveProgram()?.data ?? null;
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
