import { getDb, toPaise, fromPaise } from './db.js';

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    customerId: row.customer_id,
    productId: row.product_id,
    price: fromPaise(row.price_paise),
    customerName: row.customer_name || null,
    productName: row.product_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function listPersonalPrices(filters = {}) {
  const db = getDb();
  let sql = `
    SELECT pp.*, c.name AS customer_name, p.name AS product_name
    FROM personal_prices pp
    JOIN customers c ON c.id = pp.customer_id
    JOIN products p ON p.id = pp.product_id
    WHERE 1=1
  `;
  const params = [];
  if (filters.customerId) {
    sql += ' AND pp.customer_id = ?';
    params.push(Number(filters.customerId));
  }
  if (filters.productId) {
    sql += ' AND pp.product_id = ?';
    params.push(Number(filters.productId));
  }
  if (filters.search && String(filters.search).trim()) {
    sql += ' AND (LOWER(c.name) LIKE ? OR LOWER(p.name) LIKE ?)';
    const q = `%${String(filters.search).trim().toLowerCase()}%`;
    params.push(q, q);
  }
  sql += ' ORDER BY c.name COLLATE NOCASE, p.name COLLATE NOCASE';
  return db.prepare(sql).all(...params).map(mapRow);
}

export function getPersonalPrice(customerId, productId) {
  const db = getDb();
  const row = db.prepare(
    'SELECT pp.*, c.name AS customer_name, p.name AS product_name FROM personal_prices pp JOIN customers c ON c.id = pp.customer_id JOIN products p ON p.id = pp.product_id WHERE pp.customer_id = ? AND pp.product_id = ?'
  ).get(Number(customerId), Number(productId));
  return mapRow(row);
}

export function mapForCustomer(customerId) {
  const db = getDb();
  const rows = db.prepare(
    'SELECT product_id, price_paise FROM personal_prices WHERE customer_id = ?'
  ).all(Number(customerId));
  const out = {};
  for (const r of rows) out[r.product_id] = fromPaise(r.price_paise);
  return out;
}

export function upsertPersonalPrice(data) {
  const db = getDb();
  const customerId = Number(data.customerId);
  const productId = Number(data.productId);
  if (!customerId || !productId) throw new Error('Customer and product are required');
  const price = Number(data.price);
  if (Number.isNaN(price) || price < 0) throw new Error('Invalid price');
  const cust = db.prepare('SELECT id FROM customers WHERE id = ?').get(customerId);
  if (!cust) throw new Error('Customer not found');
  const prod = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
  if (!prod) throw new Error('Product not found');
  const paise = toPaise(price);
  const existing = db.prepare(
    'SELECT id FROM personal_prices WHERE customer_id = ? AND product_id = ?'
  ).get(customerId, productId);
  if (existing) {
    db.prepare(
      `UPDATE personal_prices SET price_paise = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(paise, existing.id);
    return getPersonalPrice(customerId, productId);
  }
  db.prepare(
    `INSERT INTO personal_prices (customer_id, product_id, price_paise) VALUES (?,?,?)`
  ).run(customerId, productId, paise);
  return getPersonalPrice(customerId, productId);
}

export function deletePersonalPrice(id) {
  const db = getDb();
  const row = db.prepare('SELECT id FROM personal_prices WHERE id = ?').get(Number(id));
  if (!row) throw new Error('Personal price not found');
  db.prepare('DELETE FROM personal_prices WHERE id = ?').run(Number(id));
  return { ok: true };
}
