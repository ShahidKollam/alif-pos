import { getDb, toPaise, fromPaise } from './db.js';

function mapInvoice(row) {
  if (!row) return null;
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    billingMode: row.billing_mode,
    customerId: row.customer_id,
    customerName: row.customer_name,
    subtotal: fromPaise(row.subtotal_paise),
    discount: fromPaise(row.discount_paise),
    total: fromPaise(row.total_paise),
    amountReceived: fromPaise(row.amount_received_paise),
    balanceDue: fromPaise(row.balance_due_paise),
    notes: row.notes,
    isDemo: !!row.is_demo,
    createdAt: row.created_at
  };
}

/** YY-MM from bill date (local) */
export function periodFromDate(invoiceDate) {
  let d;
  if (invoiceDate) {
    const s = String(invoiceDate).replace(' ', 'T');
    d = new Date(s);
    if (Number.isNaN(d.getTime())) d = new Date();
  } else {
    d = new Date();
  }
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return { yy, mm, period: `${yy}-${mm}` };
}

/** AA → AB … ZZ → AAA → AAB … */
export function incrementSeries(series) {
  const arr = String(series || 'AA').split('').map((c) => c.charCodeAt(0) - 65);
  let i = arr.length - 1;
  while (i >= 0) {
    arr[i] += 1;
    if (arr[i] < 26) break;
    arr[i] = 0;
    i -= 1;
  }
  if (i < 0) return 'A'.repeat(arr.length + 1);
  return arr.map((n) => String.fromCharCode(65 + n)).join('');
}

function formatInvoiceNumber(mode, yy, mm, series, num) {
  const prefix = mode === 'retail' ? 'R' : 'W';
  return `${prefix}-${yy}-${mm}-${series}-${String(num).padStart(3, '0')}`;
}

/** Peek next number without consuming (for UI). */
export function getNextInvoiceNumber(mode, invoiceDate) {
  const m = mode === 'retail' ? 'retail' : 'wholesale';
  const { yy, mm, period } = periodFromDate(invoiceDate);
  const db = getDb();
  const row = db
    .prepare('SELECT series, last_number FROM invoice_period_sequences WHERE mode = ? AND period = ?')
    .get(m, period);
  if (!row) {
    return formatInvoiceNumber(m, yy, mm, 'AA', 1);
  }
  if (row.last_number < 999) {
    return formatInvoiceNumber(m, yy, mm, row.series, row.last_number + 1);
  }
  const nextSer = incrementSeries(row.series);
  return formatInvoiceNumber(m, yy, mm, nextSer, 1);
}

/** Allocate next number atomically inside an open transaction. */
function allocateInvoiceNumber(db, mode, invoiceDate) {
  const m = mode === 'retail' ? 'retail' : 'wholesale';
  const { yy, mm, period } = periodFromDate(invoiceDate);
  let row = db
    .prepare('SELECT series, last_number FROM invoice_period_sequences WHERE mode = ? AND period = ?')
    .get(m, period);
  let series;
  let num;
  if (!row) {
    series = 'AA';
    num = 1;
    db.prepare(
      'INSERT INTO invoice_period_sequences (mode, period, series, last_number) VALUES (?,?,?,?)'
    ).run(m, period, series, num);
  } else if (row.last_number < 999) {
    series = row.series;
    num = row.last_number + 1;
    db.prepare(
      'UPDATE invoice_period_sequences SET last_number = ? WHERE mode = ? AND period = ?'
    ).run(num, m, period);
  } else {
    series = incrementSeries(row.series);
    num = 1;
    db.prepare(
      'UPDATE invoice_period_sequences SET series = ?, last_number = ? WHERE mode = ? AND period = ?'
    ).run(series, num, m, period);
  }
  const invoiceNumber = formatInvoiceNumber(m, yy, mm, series, num);
  if (db.prepare('SELECT id FROM invoices WHERE invoice_number = ?').get(invoiceNumber)) {
    throw new Error('Invoice number conflict. Please try again.');
  }
  return invoiceNumber;
}

export function saveInvoice(data) {
  const db = getDb();
  if (!data.items?.length) throw new Error('Invoice must have at least one item');
  if (data.billingMode && !['wholesale', 'retail', 'auto'].includes(data.billingMode)) throw new Error('Invalid billing mode');

  const validatedItems = [];
  let subtotalPaise = 0;
  let retailCount = 0;
  let wholesaleCount = 0;
  for (const item of data.items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(item.productId);
    if (!product) throw new Error(`Product not found or inactive: ${item.productName || item.productId}`);
    if (item.quantity <= 0) throw new Error(`Invalid quantity for ${product.name}`);
    const lineMode = item.priceMode === 'retail' ? 'retail' : 'wholesale';
    if (lineMode === 'retail') retailCount += 1;
    else wholesaleCount += 1;
    let unitPricePaise = lineMode === 'wholesale'
      ? product.wholesale_price_paise
      : product.retail_price_paise;
    if (item.unitPrice != null && item.unitPrice !== '' && !Number.isNaN(Number(item.unitPrice))) {
      unitPricePaise = Math.round(Number(item.unitPrice) * 100);
    }
    const amountPaise = Math.round(unitPricePaise * item.quantity);
    subtotalPaise += amountPaise;
    validatedItems.push({
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      unitPricePaise,
      amountPaise,
      wholesalePricePaise: product.wholesale_price_paise,
      retailPricePaise: product.retail_price_paise,
      priceMode: lineMode
    });
  }
  if (!data.billingMode || data.billingMode === 'auto') {
    data.billingMode = retailCount > 0 && wholesaleCount === 0 ? 'retail' : 'wholesale';
  }

  const discountPaise = toPaise(data.discount || 0);
  if (discountPaise < 0 || discountPaise > subtotalPaise) throw new Error('Invalid discount amount');
  const totalPaise = subtotalPaise - discountPaise;
  const amountReceivedPaise = toPaise(data.amountReceived || 0);
  if (amountReceivedPaise < 0) throw new Error('Amount received cannot be negative');
  const balanceDuePaise = Math.max(0, totalPaise - amountReceivedPaise);
  const excessPaise = Math.max(0, amountReceivedPaise - totalPaise);
  const asAdvance = !!data.treatExcessAsAdvance;
  const invoiceDate = data.invoiceDate || new Date().toISOString().slice(0, 19).replace('T', ' ');
  const existingId = data.invoiceId ? Number(data.invoiceId) : null;

  return db.transaction(() => {
    const insertItem = db.prepare(`
      INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price_paise, amount_paise, wholesale_price_paise, retail_price_paise)
      VALUES (?,?,?,?,?,?,?,?)
    `);
    const updateStock = db.prepare(`UPDATE products SET current_stock = current_stock - ?, updated_at = datetime('now') WHERE id = ?`);
    const insertMovement = db.prepare(`
      INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, notes)
      VALUES (?,?,?,?,?,?)
    `);

    if (existingId) {
      const existing = db.prepare('SELECT * FROM invoices WHERE id = ?').get(existingId);
      if (!existing) throw new Error('Invoice not found');
      const invoiceNumber = existing.invoice_number;
      const oldItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(existingId);
      for (const oi of oldItems) {
        db.prepare(`UPDATE products SET current_stock = current_stock + ?, updated_at = datetime('now') WHERE id = ?`).run(oi.quantity, oi.product_id);
        insertMovement.run(oi.product_id, 'adjustment', oi.quantity, 'invoice', existingId, `Reverse before update ${invoiceNumber}`);
      }
      db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(existingId);
      db.prepare(`DELETE FROM stock_movements WHERE reference_type = 'invoice' AND reference_id = ? AND movement_type = 'sale'`).run(existingId);

      db.prepare(`
        UPDATE invoices SET
          invoice_date = ?, customer_id = ?, customer_name = ?,
          subtotal_paise = ?, discount_paise = ?, total_paise = ?,
          amount_received_paise = ?, balance_due_paise = ?, notes = ?,
          billing_mode = ?
        WHERE id = ?
      `).run(
        invoiceDate,
        data.customerId || null,
        data.customerName?.trim() || null,
        subtotalPaise, discountPaise, totalPaise, amountReceivedPaise, balanceDuePaise,
        data.notes || null,
        data.billingMode,
        existingId
      );

      for (const item of validatedItems) {
        insertItem.run(existingId, item.productId, item.productName, item.quantity, item.unitPricePaise, item.amountPaise, item.wholesalePricePaise, item.retailPricePaise);
        updateStock.run(item.quantity, item.productId);
        insertMovement.run(item.productId, 'sale', -item.quantity, 'invoice', existingId, `Sale ${invoiceNumber}`);
      }

      return {
        id: existingId,
        invoiceNumber,
        total: fromPaise(totalPaise),
        balanceDue: fromPaise(balanceDuePaise),
        updated: true
      };
    }

    const invoiceNumber = allocateInvoiceNumber(db, data.billingMode, invoiceDate);

    const invResult = db.prepare(`
      INSERT INTO invoices (
        invoice_number, invoice_date, billing_mode, customer_id, customer_name,
        subtotal_paise, discount_paise, total_paise, amount_received_paise, balance_due_paise, notes, is_demo
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      invoiceNumber,
      invoiceDate,
      data.billingMode,
      data.customerId || null,
      data.customerName?.trim() || null,
      subtotalPaise, discountPaise, totalPaise, amountReceivedPaise, balanceDuePaise,
      data.notes || null,
      data.isDemo ? 1 : 0
    );
    const invoiceId = invResult.lastInsertRowid;

    for (const item of validatedItems) {
      insertItem.run(invoiceId, item.productId, item.productName, item.quantity, item.unitPricePaise, item.amountPaise, item.wholesalePricePaise, item.retailPricePaise);
      updateStock.run(item.quantity, item.productId);
      insertMovement.run(item.productId, 'sale', -item.quantity, 'invoice', invoiceId, `Sale ${invoiceNumber}`);
    }

    if (data.customerId) {
      const cust = db.prepare('SELECT * FROM customers WHERE id = ?').get(data.customerId);
      if (cust) {
        let outstanding = cust.outstanding_paise || 0;
        let advance = cust.advance_paise || 0;
        outstanding += totalPaise;
        db.prepare(`
          INSERT INTO ledger_entries (customer_id, entry_type, amount_paise, balance_after_paise, reference_type, reference_id, notes)
          VALUES (?, 'sale', ?, ?, 'invoice', ?, ?)
        `).run(data.customerId, totalPaise, outstanding, invoiceId, `Invoice ${invoiceNumber}`);
        if (amountReceivedPaise > 0) {
          let payAgainst = Math.min(amountReceivedPaise, outstanding);
          let excess = amountReceivedPaise - payAgainst;
          outstanding -= payAgainst;
          if (excess > 0 && asAdvance) advance += excess;
          try {
            db.prepare(`
              INSERT INTO payments (customer_id, invoice_id, amount_paise, payment_type, notes)
              VALUES (?, ?, ?, 'receipt', ?)
            `).run(data.customerId, invoiceId, amountReceivedPaise, `Payment for ${invoiceNumber}`);
          } catch (_) {}
          db.prepare(`
            INSERT INTO ledger_entries (customer_id, entry_type, amount_paise, balance_after_paise, reference_type, reference_id, notes)
            VALUES (?, 'payment', ?, ?, 'invoice', ?, ?)
          `).run(data.customerId, -amountReceivedPaise, outstanding, invoiceId, `Payment ${invoiceNumber}`);
        }
        db.prepare(`UPDATE customers SET outstanding_paise=?, advance_paise=?, updated_at=datetime('now') WHERE id=?`)
          .run(outstanding, advance, data.customerId);
      }
    }

    return {
      id: invoiceId,
      invoiceNumber,
      total: fromPaise(totalPaise),
      balanceDue: fromPaise(balanceDuePaise),
      updated: false
    };
  })();
}

export function getInvoice(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  if (!row) return null;
  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id).map((it) => ({
    id: it.id,
    productId: it.product_id,
    productName: it.product_name,
    quantity: it.quantity,
    unitPrice: fromPaise(it.unit_price_paise),
    amount: fromPaise(it.amount_paise),
    wholesalePrice: fromPaise(it.wholesale_price_paise),
    retailPrice: fromPaise(it.retail_price_paise)
  }));
  return { ...mapInvoice(row), items };
}

export function listInvoices(filters = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM invoices WHERE 1=1';
  const params = [];
  if (filters.mode) { sql += ' AND billing_mode = ?'; params.push(filters.mode); }
  if (filters.search) {
    sql += ' AND (invoice_number LIKE ? OR customer_name LIKE ?)';
    const q = `%${filters.search}%`;
    params.push(q, q);
  }
  if (filters.fromDate) { sql += ' AND invoice_date >= ?'; params.push(filters.fromDate); }
  if (filters.toDate) { sql += ' AND invoice_date <= ?'; params.push(filters.toDate); }
  sql += ' ORDER BY created_at DESC LIMIT 300';
  return db.prepare(sql).all(...params).map(mapInvoice);
}
