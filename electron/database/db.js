/**
 * SQLite via sql.js (WASM). Money = integer paise. File in Electron userData/data/.
 */
import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

let SQL = null;
let rawDb = null;
let dbPath = null;

function toPaise(rupees) {
  if (rupees == null || rupees === '') return 0;
  return Math.round(Number(rupees) * 100);
}
function fromPaise(paise) {
  return (Number(paise) || 0) / 100;
}

function stmtAll(sql, params = []) {
  const stmt = rawDb.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function stmtGet(sql, params = []) {
  const rows = stmtAll(sql, params);
  return rows[0] || null;
}

function stmtRun(sql, params = []) {
  rawDb.run(sql, params);
  return { changes: rawDb.getRowsModified(), lastInsertRowid: rawDb.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] };
}

function wrapDb() {
  return {
    prepare(sql) {
      return {
        all(...params) { return stmtAll(sql, params); },
        get(...params) { return stmtGet(sql, params); },
        run(...params) {
          const r = stmtRun(sql, params);
          return { changes: r.changes, lastInsertRowid: r.lastInsertRowid };
        }
      };
    },
    exec(sql) { rawDb.run(sql); },
    transaction(fn) {
      return (...args) => {
        rawDb.run('BEGIN');
        try {
          const result = fn(...args);
          rawDb.run('COMMIT');
          persist();
          return result;
        } catch (e) {
          try { rawDb.run('ROLLBACK'); } catch (_) {}
          throw e;
        }
      };
    }
  };
}

function persist() {
  if (!rawDb || !dbPath) return;
  try {
    const data = rawDb.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  } catch (e) {
    console.error('DB persist failed', e);
  }
}

export { toPaise, fromPaise };

export function getDb() {
  if (!rawDb) throw new Error('Database not initialized');
  return wrapDb();
}

export async function initDatabase() {
  if (rawDb) return getDb();
  SQL = await initSqlJs();
  const userData = app.getPath('userData');
  const dataDir = path.join(userData, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  dbPath = path.join(dataDir, 'alif_pos.db');
  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    rawDb = new SQL.Database(buf);
  } else {
    rawDb = new SQL.Database();
  }
  migrate();
  persist();
  return getDb();
}

function migrate() {
  rawDb.run(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY
  )`);
  const applied = new Set(stmtAll('SELECT version FROM schema_migrations').map((r) => r.version));

  if (!applied.has(1)) {
    rawDb.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          product_code TEXT,
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
        )
      `);
    rawDb.run(`
        CREATE TABLE IF NOT EXISTS invoices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_number TEXT NOT NULL UNIQUE,
          invoice_date TEXT NOT NULL,
          billing_mode TEXT NOT NULL,
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
        )
      `);
    rawDb.run(`
        CREATE TABLE IF NOT EXISTS invoice_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          product_name TEXT NOT NULL,
          quantity REAL NOT NULL,
          unit_price_paise INTEGER NOT NULL,
          amount_paise INTEGER NOT NULL,
          wholesale_price_paise INTEGER,
          retail_price_paise INTEGER
        )
      `);
    rawDb.run(`
        CREATE TABLE IF NOT EXISTS stock_movements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          movement_type TEXT NOT NULL,
          quantity REAL NOT NULL,
          reference_type TEXT,
          reference_id INTEGER,
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
    rawDb.run(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        )
      `);
    rawDb.run(`
        CREATE TABLE IF NOT EXISTS invoice_sequences (
          mode TEXT PRIMARY KEY,
          last_number INTEGER NOT NULL DEFAULT 0
        )
      `);
    rawDb.run('INSERT INTO schema_migrations (version) VALUES (1)');
  }

  if (!applied.has(2)) {
    rawDb.run(`
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
        )
      `);
    rawDb.run(`
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          invoice_id INTEGER,
          amount_paise INTEGER NOT NULL,
          payment_type TEXT NOT NULL DEFAULT 'receipt',
          notes TEXT,
          payment_date TEXT NOT NULL DEFAULT (datetime('now')),
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
    rawDb.run(`
        CREATE TABLE IF NOT EXISTS ledger_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          entry_type TEXT NOT NULL,
          amount_paise INTEGER NOT NULL,
          balance_after_paise INTEGER NOT NULL,
          reference_type TEXT,
          reference_id INTEGER,
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
    rawDb.run('CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id)');
    rawDb.run('INSERT INTO schema_migrations (version) VALUES (2)');
  }

  if (!applied.has(3)) {
    rawDb.run(`
        CREATE TABLE IF NOT EXISTS invoice_period_sequences (
          mode TEXT NOT NULL,
          period TEXT NOT NULL,
          series TEXT NOT NULL DEFAULT 'AA',
          last_number INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (mode, period)
        )
      `);
    rawDb.run('INSERT INTO schema_migrations (version) VALUES (3)');

    if (!applied.has(4)) {
      rawDb.run(`
        CREATE TABLE IF NOT EXISTS personal_prices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          price_paise INTEGER NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(customer_id, product_id)
        )
      `);
      rawDb.run('CREATE INDEX IF NOT EXISTS idx_pp_customer ON personal_prices(customer_id)');
      rawDb.run('CREATE INDEX IF NOT EXISTS idx_pp_product ON personal_prices(product_id)');
      rawDb.run('INSERT INTO schema_migrations (version) VALUES (4)');
    }
  }
}

export function closeDatabase() {
  if (rawDb) {
    persist();
    rawDb.close();
    rawDb = null;
  }
}
