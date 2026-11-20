import { getDb, toPaise, fromPaise } from './db.js';

function mapCustomer(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    outstanding: fromPaise(row.outstanding_paise),
    advance: fromPaise(row.advance_paise),
    isActive: !!row.is_active,
    isDemo: !!row.is_demo,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function listCustomers(filters = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM customers WHERE 1=1';
  const params = [];
  if (filters.activeOnly !== false) sql += ' AND is_active = 1';
  if (filters.search) {
    sql += ' AND (name LIKE ? OR phone LIKE ?)';
    const q = `%${filters.search}%`;
    params.push(q, q);
  }
  sql += ' ORDER BY name ASC';
  return db.prepare(sql).all(...params).map(mapCustomer);
}

export function getCustomer(id) {
  return mapCustomer(getDb().prepare('SELECT * FROM customers WHERE id = ?').get(id));
}

export function createCustomer(data) {
  const db = getDb();
  if (!data.name?.trim()) throw new Error('Customer name is required');
  const result = db.prepare(`
    INSERT INTO customers (name, phone, address, outstanding_paise, advance_paise, is_active, is_demo)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `).run(
    data.name.trim(),
    data.phone?.trim() || null,
    data.address?.trim() || null,
    toPaise(data.outstanding || 0),
    toPaise(data.advance || 0),
    data.isDemo ? 1 : 0
  );
  const id = result.lastInsertRowid;
  if ((data.outstanding || 0) > 0) {
    db.prepare(`
      INSERT INTO ledger_entries (customer_id, entry_type, amount_paise, balance_after_paise, reference_type, notes)
      VALUES (?, 'opening', ?, ?, 'opening', 'Opening outstanding')
    `).run(id, toPaise(data.outstanding), toPaise(data.outstanding));
  }
  return getCustomer(id);
}

export function updateCustomer(id, data) {
  const db = getDb();
  if (!getCustomer(id)) throw new Error('Customer not found');
  if (!data.name?.trim()) throw new Error('Customer name is required');
  db.prepare(`
    UPDATE customers SET name=?, phone=?, address=?, updated_at=datetime('now') WHERE id=?
  `).run(data.name.trim(), data.phone?.trim() || null, data.address?.trim() || null, id);
  return getCustomer(id);
}

export function setCustomerActive(id, active) {
  getDb().prepare(`UPDATE customers SET is_active=?, updated_at=datetime('now') WHERE id=?`).run(active ? 1 : 0, id);
  return getCustomer(id);
}

export function getLedger(customerId, limit = 100) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM ledger_entries WHERE customer_id = ? ORDER BY id DESC LIMIT ?
  `).all(customerId, limit).map((r) => ({
    id: r.id,
    customerId: r.customer_id,
    entryType: r.entry_type,
    amount: fromPaise(r.amount_paise),
    balanceAfter: fromPaise(r.balance_after_paise),
    referenceType: r.reference_type,
    referenceId: r.reference_id,
    notes: r.notes,
    entryDate: r.entry_date
  }));
}

/** Collect payment against outstanding (independent of a new sale). */
export function collectPayment(data) {
  const db = getDb();
  const customer = getCustomer(data.customerId);
  if (!customer) throw new Error('Customer not found');
  const amountPaise = toPaise(data.amount);
  if (amountPaise <= 0) throw new Error('Payment amount must be positive');

  return db.transaction(() => {
    const cust = db.prepare('SELECT * FROM customers WHERE id = ?').get(data.customerId);
    let outstanding = cust.outstanding_paise || 0;
    let advance = cust.advance_paise || 0;
    let applied = Math.min(amountPaise, outstanding);
    let toAdvance = amountPaise - applied;
    outstanding -= applied;
    advance += toAdvance;

    db.prepare(`UPDATE customers SET outstanding_paise=?, advance_paise=?, updated_at=datetime('now') WHERE id=?`)
      .run(outstanding, advance, data.customerId);

    const pay = db.prepare(`
      INSERT INTO payments (customer_id, amount_paise, payment_type, notes, payment_date)
      VALUES (?, ?, 'receipt', ?, datetime('now'))
    `).run(data.customerId, amountPaise, data.notes || 'Payment collection');

    db.prepare(`
      INSERT INTO ledger_entries (customer_id, entry_type, amount_paise, balance_after_paise, reference_type, reference_id, notes)
      VALUES (?, 'payment', ?, ?, 'payment', ?, ?)
    `).run(data.customerId, -amountPaise, outstanding, pay.lastInsertRowid, data.notes || 'Payment received');

    return {
      paymentId: pay.lastInsertRowid,
      applied: fromPaise(applied),
      advanceAdded: fromPaise(toAdvance),
      outstanding: fromPaise(outstanding),
      advance: fromPaise(advance)
    };
  })();
}
