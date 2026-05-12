import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'debate-master.db');

// Ensure data directory exists
import fs from 'fs';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ===== Schema =====

db.exec(`
  -- Users
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('teacher', 'student')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Classes (created by teachers)
  CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    teacher_id INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Class members
  CREATE TABLE IF NOT EXISTS class_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    joined_at TEXT DEFAULT (datetime('now')),
    UNIQUE(class_id, user_id)
  );

  -- Debate records (saved after each practice)
  CREATE TABLE IF NOT EXISTS debate_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    topic TEXT NOT NULL,
    format_name TEXT NOT NULL,
    user_side TEXT NOT NULL,
    mode TEXT NOT NULL,
    record_json TEXT NOT NULL,
    messages_json TEXT NOT NULL,
    verdicts_json TEXT,
    analysis_json TEXT,
    scores_json TEXT,
    duration_sec INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Drafts (student manuscripts)
  CREATE TABLE IF NOT EXISTS drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    review_json TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Annotations (teacher comments on drafts)
  CREATE TABLE IF NOT EXISTS annotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    draft_id INTEGER NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
    teacher_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    position INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Practice tasks (assigned by teachers)
  CREATE TABLE IF NOT EXISTS practice_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    topic TEXT,
    due_date TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Online debate rooms
  CREATE TABLE IF NOT EXISTS debate_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_code TEXT UNIQUE NOT NULL,
    topic TEXT NOT NULL,
    format_id TEXT NOT NULL,
    host_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT DEFAULT 'waiting' CHECK(status IN ('waiting', 'running', 'finished')),
    config_json TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Room participants
  CREATE TABLE IF NOT EXISTS room_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL REFERENCES debate_rooms(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    side TEXT CHECK(side IN ('pro', 'con', 'spectator')),
    position INTEGER,
    role TEXT DEFAULT 'player' CHECK(role IN ('player', 'spectator')),
    UNIQUE(room_id, user_id)
  );
`);

export default db;
