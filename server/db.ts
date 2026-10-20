import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

function resolveSqlJsLocateFile(file: string): string {
  const candidates = [
    path.join(process.cwd(), 'server', 'node_modules', 'sql.js', 'dist', file),
    path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
    path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file),
    path.join('/var/task/server/node_modules/sql.js/dist', file),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  try {
    return require.resolve(`sql.js/dist/${file}`);
  } catch {
    return file;
  }
}

function resolveDbPath(): string {
  if (process.env.VERITY_DB_PATH) {
    return process.env.VERITY_DB_PATH;
  }

  const cwd = process.cwd();
  const workspaceRoot = path.basename(cwd).toLowerCase() === 'server'
    ? path.resolve(cwd, '..')
    : cwd;

  // Use VERITY_DB_FILE if provided, or default to verity.db
  let dbFileName = process.env.VERITY_DB_FILE;
  if (!dbFileName) {
    dbFileName = fs.existsSync(path.join(workspaceRoot, 'verity.db'))
      ? 'verity.db'
      : 'verity.db';
  }

  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tempDir = process.env.TMPDIR || '/tmp';
    return path.join(tempDir, dbFileName);
  }

  return path.join(workspaceRoot, dbFileName);
}

const DB_PATH = resolveDbPath();

let db: Database;

function addColumnIfMissing(table: string, definition: string): void {
  try {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  } catch {
    // Column likely already exists.
  }
}

function ensureOwnerScopedTable(table: string, createSql: string, copySql: string): void {
  const info = db.exec(`PRAGMA table_info(${table})`);
  const columns = info[0]?.values.map(row => row[1]) ?? [];

  if (columns.length === 0) {
    db.run(createSql);
    return;
  }

  if (columns.includes('owner_id')) return;

  db.run(`ALTER TABLE ${table} RENAME TO ${table}_legacy`);
  db.run(createSql);
  db.run(copySql);
  db.run(`DROP TABLE ${table}_legacy`);
}

export async function initDb(): Promise<Database> {
  const SQL = await (initSqlJs as any)({
    locateFile: resolveSqlJsLocateFile,
  });

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS habits (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      area       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (date('now')),
      target_days TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]'
    )
  `);

  addColumnIfMissing('habits', "target_days TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]'");
  addColumnIfMissing('habits', "owner_id TEXT NOT NULL DEFAULT 'guest_legacy'");

  db.run(`
    CREATE TABLE IF NOT EXISTS checkins (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id  TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      date      TEXT NOT NULL,
      UNIQUE(habit_id, date)
    )
  `);
  addColumnIfMissing('checkins', "owner_id TEXT NOT NULL DEFAULT 'guest_legacy'");


  ensureOwnerScopedTable(
    'areas',
    `CREATE TABLE areas (
      owner_id TEXT NOT NULL,
      name  TEXT NOT NULL,
      color TEXT NOT NULL,
      PRIMARY KEY(owner_id, name)
    )`,
    "INSERT INTO areas (owner_id, name, color) SELECT 'guest_legacy', name, color FROM areas_legacy"
  );

  // Seed default area colors if empty
  const areaCount = db.prepare("SELECT COUNT(*) as c FROM areas WHERE owner_id = 'guest_legacy'");
  areaCount.step();
  const count = (areaCount.getAsObject() as any).c;
  areaCount.free();

  if (count === 0) {
    const defaults = [
      ['play', '#58a6ff'],
      ['health', '#3fb950'],
      ['mind', '#bc8cff'],
      ['social', '#f0883e'],
    ];
    for (const [name, color] of defaults) {
      db.run("INSERT INTO areas (owner_id, name, color) VALUES ('guest_legacy', ?, ?)", [name, color]);
    }
    saveDb();
  }

  // Health tables
  ensureOwnerScopedTable(
    'health_checkins',
    `CREATE TABLE health_checkins (
      owner_id    TEXT NOT NULL,
      id          TEXT NOT NULL,
      date        TEXT NOT NULL,
      hrv         INTEGER,
      sleep_hours REAL,
      sleep_quality INTEGER,
      resting_hr  INTEGER,
      steps       INTEGER,
      energy_level INTEGER,
      mood_score  INTEGER,
      notes       TEXT DEFAULT '',
      PRIMARY KEY(owner_id, id),
      UNIQUE(owner_id, date)
    )`,
    "INSERT INTO health_checkins (owner_id, id, date, hrv, sleep_hours, sleep_quality, resting_hr, steps, energy_level, mood_score, notes) SELECT 'guest_legacy', id, date, hrv, sleep_hours, sleep_quality, resting_hr, steps, energy_level, mood_score, notes FROM health_checkins_legacy"
  );

  db.run(`
    CREATE TABLE IF NOT EXISTS bio_markers (
      id          TEXT PRIMARY KEY,
      date        TEXT NOT NULL,
      vo2_max     REAL,
      grip_kg     REAL,
      waist_cm    REAL,
      weight_kg   REAL,
      body_fat    REAL,
      resting_hr_avg INTEGER
    )
  `);
  addColumnIfMissing('bio_markers', "owner_id TEXT NOT NULL DEFAULT 'guest_legacy'");

  return db;
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

export function saveDb(): void {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}
