/**
 * SQLite via sql.js (WASM). Money = integer paise. File in Electron userData/data/.
 */
import initSqlJs from 'sql.js';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let SQL = null;
let rawDb = null;
let dbPath = null;
let persistTimer = null;

export function getDb() {
  if (!rawDb) throw new Error('Database not initialised');
  return api;
}

export function getDbPath() {
  return dbPath;
}

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try { persistNow(); } catch (e) { console.error('DB persist failed:', e); }
  }, 60);
}

function persistNow() {
  if (!rawDb || !dbPath) return;
  const data = rawDb.export();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dbPath, Buffer.from(data));
}

/** Normalize params: undefined → null (sql.js rejects undefined) */
function normParams(params) {
  if (!params || !params.length) return [];
  return params.map((v) => (v === undefined ? null : v));
}

function stmtAll(sql, params = []) {
  const p = normParams(params);
  const stmt = rawDb.prepare(sql);
  try {
    if (p.length) stmt.bind(p);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    return rows;
  } finally {
    stmt.free();
  }
}

function stmtGet(sql, params = []) {
  const rows = stmtAll(sql, params);
  return rows[0];
}

function stmtRun(sql, params = []) {
  const p = normParams(params);
  try {
    if (p.length) rawDb.run(sql, p);
    else rawDb.run(sql);
  } catch (e) {
    console.error('SQL run error:', sql, p, e);
    throw new Error(e.message || String(e));
  }
  let lastInsertRowid = 0;
  let changes = 0;
  try {
    const idRow = rawDb.exec('SELECT last_insert_rowid() AS id');
    const chRow = rawDb.exec('SELECT changes() AS c');
    lastInsertRowid = Number(idRow[0]?.values?.[0]?.[0] ?? 0);
    changes = Number(chRow[0]?.values?.[0]?.[0] ?? 0);
  } catch (_) {}
  schedulePersist();
  return { lastInsertRowid, changes };
}

const api = {
  prepare(sql) {
    return {
      all(...params) { return stmtAll(sql, params); },
      get(...params) { return stmtGet(sql, params); },
      run(...params) { return stmtRun(sql, params); }
    };
  },
  exec(sql) {
    try {
      rawDb.exec(sql);
      schedulePersist();
    } catch (e) {
      console.error('SQL exec error:', e);
      throw new Error(e.message || String(e));
    }
  },
  transaction(fn) {
    return (...args) => {
      rawDb.run('BEGIN');
      try {
        const result = fn(...args);
        rawDb.run('COMMIT');
        persistNow();
        return result;
      } catch (e) {
        try { rawDb.run('ROLLBACK'); } catch (_) {}
        throw e;
      }
    };
  },
  pragma() {}
};

function findWasmPath() {
  const candidates = [
    path.join(path.dirname(require.resolve('sql.js')), 'sql-wasm.wasm'),
    path.join(process.resourcesPath || '', 'sql-wasm.wasm'),
    path.join(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm')
  ];
  for (const c of candidates) if (c && fs.existsSync(c)) return c;
  return undefined;
}

export async function initDatabase() {
  const wasmPath = findWasmPath();
  if (!wasmPath) console.warn('sql-wasm.wasm not found — sql.js may fail to load');
  SQL = await initSqlJs({
    locateFile: (file) => (file.endsWith('.wasm') && wasmPath ? wasmPath : file)
  });

  const dbDir = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  dbPath = path.join(dbDir, 'alif_pos.db');

  if (fs.existsSync(dbPath)) {
    rawDb = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    rawDb = new SQL.Database();
  }
  try { rawDb.run('PRAGMA foreign_keys = ON'); } catch (_) {}
  runMigrations();
  persistNow();
  return api;
}

function runMigrations() {
  rawDb.run(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  const applied = new Set(stmtAll('SELECT version FROM schema_migrations').map((r) => r.version));

  if (!applied.has(1)) {
    rawDb.run('BEGIN');
    try {
      rawDb.exec(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_code TEXT UNIQUE,
          name TEXT NOT NULL,
          category TEXT,
          unit TEXT DEFAULT 'piece',
          purchase_cost_paise INTEGER NOT NULL DEFAULT 0,
          wholesale_price_paise INTEGER NOT NULL DEFAULT 0,
          retail_price_paise INTEGER NOT NULL DEFAULT 0,
          opening_stock REAL NOT NULL DEFAULT 0,
          current_stock REAL NOT NULL DEFAULT 0,
          min_stock_level REAL NOT NULL DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          is_demo INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS invoices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_number TEXT NOT NULL UNIQUE,
          invoice_date TEXT NOT NULL,
          billing_mode TEXT NOT NULL CHECK (billing_mode IN ('wholesale','retail')),
          customer_id INTEGER,
          customer_name TEXT,
          subtotal_paise INTEGER NOT NULL DEFAULT 0,
          discount_paise INTEGER NOT NULL DEFAULT 0,
          total_paise INTEGER NOT NULL DEFAULT 0,
          amount_received_paise INTEGER NOT NULL DEFAULT 0,
          balance_due_paise INTEGER NOT NULL DEFAULT 0,
          notes TEXT,
          is_demo INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS invoice_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
          product_id INTEGER NOT NULL REFERENCES products(id),
          product_name TEXT NOT NULL,
          quantity REAL NOT NULL,
          unit_price_paise INTEGER NOT NULL,
          amount_paise INTEGER NOT NULL,
          wholesale_price_paise INTEGER,
          retail_price_paise INTEGER
        );
        CREATE TABLE IF NOT EXISTS stock_movements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL REFERENCES products(id),
          movement_type TEXT NOT NULL,
          quantity REAL NOT NULL,
          reference_type TEXT,
          reference_id INTEGER,
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS invoice_sequences (
          mode TEXT PRIMARY KEY,
          last_number INTEGER NOT NULL DEFAULT 0
        );
        INSERT OR IGNORE INTO invoice_sequences (mode, last_number) VALUES ('wholesale', 0);
        INSERT OR IGNORE INTO invoice_sequences (mode, last_number) VALUES ('retail', 0);
        CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
        CREATE INDEX IF NOT EXISTS idx_products_code ON products(product_code);
        CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
        CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
        CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
      `);
      rawDb.run('INSERT INTO schema_migrations (version) VALUES (1)');
      rawDb.run('COMMIT');
      console.log('Migration 1 applied');
    } catch (e) {
      try { rawDb.run('ROLLBACK'); } catch (_) {}
      throw e;
    }
  }

  if (!applied.has(2)) {
    rawDb.run('BEGIN');
    try {
      rawDb.exec(`
        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone TEXT,
          address TEXT,
          outstanding_paise INTEGER NOT NULL DEFAULT 0,
          advance_paise INTEGER NOT NULL DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          is_demo INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER REFERENCES customers(id),
          invoice_id INTEGER REFERENCES invoices(id),
          amount_paise INTEGER NOT NULL,
          payment_type TEXT NOT NULL DEFAULT 'receipt',
          notes TEXT,
          payment_date TEXT NOT NULL DEFAULT (datetime('now')),
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS ledger_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL REFERENCES customers(id),
          entry_type TEXT NOT NULL,
          amount_paise INTEGER NOT NULL,
          balance_after_paise INTEGER NOT NULL DEFAULT 0,
          reference_type TEXT,
          reference_id INTEGER,
          notes TEXT,
          entry_date TEXT NOT NULL DEFAULT (datetime('now')),
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
        CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
        CREATE INDEX IF NOT EXISTS idx_ledger_customer ON ledger_entries(customer_id);
        CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
      `);
      try {
        const cols = stmtAll('PRAGMA table_info(invoices)');
        if (!cols.some((c) => c.name === 'customer_id')) {
          rawDb.run('ALTER TABLE invoices ADD COLUMN customer_id INTEGER');
        }
      } catch (_) {}
      rawDb.run('INSERT INTO schema_migrations (version) VALUES (2)');
      rawDb.run('COMMIT');
      console.log('Migration 2 applied');
    } catch (e) {
      try { rawDb.run('ROLLBACK'); } catch (_) {}
      throw e;
    }
  }
}

export function toPaise(amount) {
  if (amount === null || amount === undefined || amount === '') return 0;
  const n = typeof amount === 'string' ? parseFloat(String(amount).replace(/,/g, '')) : Number(amount);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function fromPaise(paise) {
  return (Number(paise) || 0) / 100;
}

export function formatMoney(paise) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: 0, maximumFractionDigits: 2
  }).format(fromPaise(paise));
}

export function backupDatabase(targetDir) {
  persistNow();
  if (!dbPath || !fs.existsSync(dbPath)) throw new Error('Database file not found');
  const dir = targetDir || path.join(app.getPath('userData'), 'backups');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dest = path.join(dir, `alif_pos_backup_${stamp}.db`);
  fs.copyFileSync(dbPath, dest);
  return dest;
}

export function restoreDatabase(backupFilePath) {
  if (!backupFilePath || !fs.existsSync(backupFilePath)) {
    throw new Error('Backup file not found');
  }
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(dbPath)) fs.copyFileSync(dbPath, dbPath + '.pre_restore');
  fs.copyFileSync(backupFilePath, dbPath);
  rawDb = new SQL.Database(fs.readFileSync(dbPath));
  try { rawDb.run('PRAGMA foreign_keys = ON'); } catch (_) {}
  return true;
}
