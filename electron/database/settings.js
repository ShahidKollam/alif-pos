import { getDb, backupDatabase, restoreDatabase, getDbPath } from './db.js';
import { createProduct } from './products.js';
import { createCustomer } from './customers.js';
import { app, dialog } from 'electron';
import path from 'path';
import fs from 'fs';

export function getSetting(key) {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

export function setSetting(key, value) {
  getDb().prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, String(value));
  return true;
}

const DEMO_PRODUCTS = [
  { name: 'Lux Soap 100g', category: 'Soaps and personal care', unit: 'piece', purchaseCost: 30, wholesalePrice: 34, retailPrice: 40, openingStock: 100, minStockLevel: 20, productCode: 'SOAP-LUX-100' },
  { name: 'Lifebuoy Soap', category: 'Soaps and personal care', unit: 'piece', purchaseCost: 25, wholesalePrice: 29, retailPrice: 35, openingStock: 80, minStockLevel: 15, productCode: 'SOAP-LIFE' },
  { name: 'Dove Soap', category: 'Soaps and personal care', unit: 'piece', purchaseCost: 45, wholesalePrice: 50, retailPrice: 60, openingStock: 50, minStockLevel: 10, productCode: 'SOAP-DOVE' },
  { name: 'Britannia Good Day', category: 'Biscuits and snacks', unit: 'packet', purchaseCost: 10, wholesalePrice: 12, retailPrice: 15, openingStock: 100, minStockLevel: 25, productCode: 'BIS-GD' },
  { name: 'Britannia Marie Gold', category: 'Biscuits and snacks', unit: 'packet', purchaseCost: 10, wholesalePrice: 12, retailPrice: 15, openingStock: 100, minStockLevel: 25, productCode: 'BIS-MG' },
  { name: 'Parle-G Biscuit', category: 'Biscuits and snacks', unit: 'packet', purchaseCost: 5, wholesalePrice: 6, retailPrice: 10, openingStock: 150, minStockLevel: 30, productCode: 'BIS-PG' },
  { name: 'Classmate Notebook', category: 'Stationery', unit: 'piece', purchaseCost: 35, wholesalePrice: 40, retailPrice: 50, openingStock: 60, minStockLevel: 15, productCode: 'STA-NB' },
  { name: 'Apsara Pencil', category: 'Stationery', unit: 'piece', purchaseCost: 4, wholesalePrice: 5, retailPrice: 6, openingStock: 200, minStockLevel: 50, productCode: 'STA-PEN' },
  { name: 'Nataraj Eraser', category: 'Stationery', unit: 'piece', purchaseCost: 3, wholesalePrice: 4, retailPrice: 5, openingStock: 150, minStockLevel: 40, productCode: 'STA-ERA' },
  { name: 'Fevicol MR', category: 'Stationery', unit: 'piece', purchaseCost: 25, wholesalePrice: 30, retailPrice: 35, openingStock: 40, minStockLevel: 10, productCode: 'STA-FEV' },
  { name: 'Surf Excel Small Pack', category: 'Cleaning products', unit: 'packet', purchaseCost: 20, wholesalePrice: 23, retailPrice: 27, openingStock: 60, minStockLevel: 15, productCode: 'CLN-SE' },
  { name: 'Vim Dishwash Bar', category: 'Cleaning products', unit: 'piece', purchaseCost: 10, wholesalePrice: 12, retailPrice: 15, openingStock: 70, minStockLevel: 20, productCode: 'CLN-VIM' },
  { name: 'Tata Salt 1kg', category: 'Grocery', unit: 'packet', purchaseCost: 22, wholesalePrice: 25, retailPrice: 28, openingStock: 80, minStockLevel: 20, productCode: 'GRO-SALT' },
  { name: 'Fortune Oil 1L', category: 'Grocery', unit: 'bottle', purchaseCost: 140, wholesalePrice: 155, retailPrice: 175, openingStock: 40, minStockLevel: 10, productCode: 'GRO-OIL' },
  { name: 'Harpic 500ml', category: 'Household items', unit: 'bottle', purchaseCost: 75, wholesalePrice: 85, retailPrice: 99, openingStock: 35, minStockLevel: 8, productCode: 'HH-HAR' }
];

const DEMO_CUSTOMERS = [
  { name: 'Rahim Traders', phone: '9876543210', outstanding: 1200, advance: 0 },
  { name: 'Walk-in Customer', phone: '', outstanding: 0, advance: 0 },
  { name: 'City Super Mart', phone: '9988776655', outstanding: 500, advance: 200 }
];

export function loadDemoData() {
  const db = getDb();
  const existing = db.prepare('SELECT COUNT(*) AS c FROM products WHERE is_demo = 1').get();
  const count = Number(existing?.c ?? 0);
  if (count > 0) return { alreadyLoaded: true, count };

  const run = db.transaction(() => {
    for (const p of DEMO_PRODUCTS) createProduct({ ...p, isDemo: true });
    for (const c of DEMO_CUSTOMERS) createCustomer({ ...c, isDemo: true });
    setSetting('demo_loaded', '1');
    setSetting('demo_loaded_at', new Date().toISOString());
  });
  run();
  return { alreadyLoaded: false, count: DEMO_PRODUCTS.length };
}

export function resetDemoData() {
  const db = getDb();
  db.transaction(() => {
    db.prepare(`DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE is_demo = 1)`).run();
    db.prepare('DELETE FROM invoices WHERE is_demo = 1').run();
    db.prepare(`DELETE FROM stock_movements WHERE product_id IN (SELECT id FROM products WHERE is_demo = 1)`).run();
    db.prepare('DELETE FROM products WHERE is_demo = 1').run();
    db.prepare(`DELETE FROM ledger_entries WHERE customer_id IN (SELECT id FROM customers WHERE is_demo = 1)`).run();
    db.prepare(`DELETE FROM payments WHERE customer_id IN (SELECT id FROM customers WHERE is_demo = 1)`).run();
    db.prepare('DELETE FROM customers WHERE is_demo = 1').run();
    setSetting('demo_loaded', '0');
  })();
  return { reset: true };
}

export function createBackup() {
  const dir = path.join(app.getPath('userData'), 'backups');
  const dest = backupDatabase(dir);
  setSetting('last_backup_at', new Date().toISOString());
  setSetting('last_backup_path', dest);
  return { path: dest, at: new Date().toISOString() };
}

export function listBackups() {
  const dir = path.join(app.getPath('userData'), 'backups');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.db'))
    .map((f) => {
      const full = path.join(dir, f);
      const st = fs.statSync(full);
      return { name: f, path: full, size: st.size, mtime: st.mtime.toISOString() };
    })
    .sort((a, b) => b.mtime.localeCompare(a.mtime));
}

export function restoreFromBackup(filePath) {
  restoreDatabase(filePath);
  return { ok: true, path: filePath };
}

export function getDataPaths() {
  return {
    database: getDbPath(),
    backups: path.join(app.getPath('userData'), 'backups'),
    userData: app.getPath('userData')
  };
}
