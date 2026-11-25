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
    advanceApplied: fromPaise(row.advance_applied_paise),
    returnCredit: fromPaise(row.return_credit_paise),
    notes: row.notes,
    isDemo: !!row.is_demo,
    createdAt: row.created_at
  };
}

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
      priceMode: lineMode,
      verified: item.verified ? 1 : 0
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
      INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price_paise, amount_paise, wholesale_price_paise, retail_price_paise, verified)
      VALUES (?,?,?,?,?,?,?,?,?)
    `);
    const updateStock = db.prepare(`UPDATE products SET current_stock = current_stock - ?, updated_at = datetime('now') WHERE id = ?`);
    const insertMovement = db.prepare(`
      INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, notes)
      VALUES (?,?,?,?,?,?)
    `);

    if (existingId) {
      const existing = db.prepare('SELECT * FROM invoices WHERE id = ?').get(existingId);
      if (!existing) throw new Error('Invoice not found');
      const returnCount = db.prepare('SELECT COUNT(*) AS count FROM invoice_returns WHERE source_invoice_id = ?').get(existingId)?.count || 0;
      if (returnCount) throw new Error('This bill has saved returns and cannot be edited. Create a new bill for further sales.');
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
        insertItem.run(existingId, item.productId, item.productName, item.quantity, item.unitPricePaise, item.amountPaise, item.wholesalePricePaise, item.retailPricePaise, item.verified);
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
      insertItem.run(invoiceId, item.productId, item.productName, item.quantity, item.unitPricePaise, item.amountPaise, item.wholesalePricePaise, item.retailPricePaise, item.verified);
      updateStock.run(item.quantity, item.productId);
      insertMovement.run(item.productId, 'sale', -item.quantity, 'invoice', invoiceId, `Sale ${invoiceNumber}`);
    }

    let customerOutstandingPaise = null;
    let customerAdvancePaise = null;
    let appliedAdvancePaise = 0;

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
        if (data.applyAdvance && advance > 0 && outstanding > 0) {
          const useAdv = Math.min(advance, outstanding);
          appliedAdvancePaise = useAdv;
          advance -= useAdv;
          outstanding -= useAdv;
          db.prepare(`
            INSERT INTO ledger_entries (customer_id, entry_type, amount_paise, balance_after_paise, reference_type, reference_id, notes)
            VALUES (?, 'advance_applied', ?, ?, 'invoice', ?, ?)
          `).run(data.customerId, -useAdv, outstanding, invoiceId, `Advance applied ${invoiceNumber}`);
        }
        if (amountReceivedPaise > 0) {
          const payAgainst = Math.min(amountReceivedPaise, outstanding);
          const excess = amountReceivedPaise - payAgainst;
          outstanding -= payAgainst;
          if (excess > 0 && asAdvance) {
            advance += excess;
            db.prepare(`
              INSERT INTO ledger_entries (customer_id, entry_type, amount_paise, balance_after_paise, reference_type, reference_id, notes)
              VALUES (?, 'advance', ?, ?, 'invoice', ?, ?)
            `).run(data.customerId, excess, outstanding, invoiceId, `Advance from ${invoiceNumber}`);
          }
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
        db.prepare('UPDATE invoices SET advance_applied_paise = ? WHERE id = ?').run(appliedAdvancePaise, invoiceId);
        customerOutstandingPaise = outstanding;
        customerAdvancePaise = advance;
      }
    }

    return {
      id: invoiceId,
      invoiceNumber,
      total: fromPaise(totalPaise),
      balanceDue: fromPaise(balanceDuePaise),
      updated: false,
      customerOutstanding: customerOutstandingPaise != null ? fromPaise(customerOutstandingPaise) : undefined,
      customerAdvance: customerAdvancePaise != null ? fromPaise(customerAdvancePaise) : undefined
    };
  })();
}

export function getInvoice(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  if (!row) return null;
  const items = db.prepare(`
    SELECT ii.*, p.category AS product_category
    FROM invoice_items ii
    LEFT JOIN products p ON p.id = ii.product_id
    WHERE ii.invoice_id = ?
  `).all(id).map((it) => ({
    id: it.id,
    productId: it.product_id,
    productName: it.product_name,
    category: (it.product_category && String(it.product_category).trim()) || null,
    quantity: it.quantity,
    unitPrice: fromPaise(it.unit_price_paise),
    amount: fromPaise(it.amount_paise),
    wholesalePrice: fromPaise(it.wholesale_price_paise),
    retailPrice: fromPaise(it.retail_price_paise),
    verified: !!it.verified,
    returnedQty: Number(db.prepare(`
      SELECT COALESCE(SUM(iri.quantity), 0) AS quantity
      FROM invoice_return_items iri JOIN invoice_returns ir ON ir.id = iri.return_id
      WHERE ir.source_invoice_id = ? AND iri.invoice_item_id = ?
    `).get(id, it.id)?.quantity || 0)
  }));
  return { ...mapInvoice(row), items };
}

export function getInvoiceByNumber(invoiceNumber) {
  const db = getDb();
  const num = String(invoiceNumber || '').trim();
  if (!num) return null;
  let row = db.prepare(
    'SELECT * FROM invoices WHERE lower(invoice_number) = lower(?) ORDER BY created_at DESC LIMIT 1'
  ).get(num);
  if (!row) {
    row = db.prepare(
      'SELECT * FROM invoices WHERE invoice_number LIKE ? ORDER BY created_at DESC LIMIT 1'
    ).get(`%${num}%`);
  }
  if (!row) return null;
  return getInvoice(row.id);
}

export function listInvoices(filters = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM invoices WHERE 1=1';
  const params = [];
  if (filters.mode) { sql += ' AND billing_mode = ?'; params.push(filters.mode); }
  if (filters.customerId) { sql += ' AND customer_id = ?'; params.push(Number(filters.customerId)); }
  const hasSearch = !!filters.search;
  if (hasSearch) {
    sql += ` AND (invoice_number LIKE ? OR customer_name LIKE ? OR id IN (
      SELECT invoice_id FROM invoice_items WHERE product_name LIKE ?
    ))`;
    const q = `%${filters.search}%`;
    params.push(q, q, q);
  }
  if (filters.fromDate) { sql += ' AND invoice_date >= ?'; params.push(filters.fromDate); }
  if (filters.toDate) { sql += ' AND invoice_date <= ?'; params.push(filters.toDate); }
  if (hasSearch) {
    const q = `%${filters.search}%`;
    sql += ` ORDER BY CASE WHEN invoice_number LIKE ? THEN 0 WHEN customer_name LIKE ? THEN 1 ELSE 2 END, created_at DESC LIMIT 300`;
    params.push(q, q);
  } else sql += ' ORDER BY created_at DESC LIMIT 300';
  return db.prepare(sql).all(...params).map(mapInvoice);
}

export function getReturnableInvoice(id) {
  const invoice = getInvoice(id);
  if (!invoice) return null;
  const db = getDb();
  const returned = db.prepare(`
    SELECT iri.invoice_item_id, COALESCE(SUM(iri.quantity), 0) AS quantity
    FROM invoice_return_items iri
    JOIN invoice_returns ir ON ir.id = iri.return_id
    WHERE ir.source_invoice_id = ? GROUP BY iri.invoice_item_id
  `).all(id);
  const returnedByItem = new Map(returned.map((r) => [Number(r.invoice_item_id), Number(r.quantity) || 0]));
  return {
    ...invoice,
    items: invoice.items.map((item) => ({ ...item, returnedQty: returnedByItem.get(Number(item.id)) || 0 }))
  };
}

export function searchReturnableInvoices(filters = {}) {
  const db = getDb();
  const q = String(filters.search || '').trim();
  let sql = `SELECT DISTINCT i.* FROM invoices i
    LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
    WHERE 1=1`;
  const params = [];
  if (filters.customerId) { sql += ' AND i.customer_id = ?'; params.push(Number(filters.customerId)); }
  if (q) {
    const like = `%${q}%`;
    sql += ` AND (i.invoice_number LIKE ? OR i.customer_name LIKE ? OR ii.product_name LIKE ?)
      ORDER BY CASE WHEN i.invoice_number LIKE ? THEN 0 WHEN i.customer_name LIKE ? THEN 1 ELSE 2 END, i.created_at DESC LIMIT 300`;
    params.push(like, like, like, like, like);
  } else sql += ' ORDER BY i.created_at DESC LIMIT 300';
  return db.prepare(sql).all(...params).map(mapInvoice);
}

export function saveReturn(data) {
  const db = getDb();
  const invoiceId = Number(data?.invoiceId);
  const customerId = Number(data?.customerId);
  if (!invoiceId || !customerId || !Array.isArray(data?.items) || !data.items.length) throw new Error('A customer and returned items are required');
  return db.transaction(() => {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND customer_id = ?').get(invoiceId, customerId);
    if (!invoice) throw new Error('Bill not found for this customer');
    const validated = [];
    let totalPaise = 0;
    for (const requested of data.items) {
      const qty = Number(requested.quantity) || 0;
      if (qty <= 0) continue;
      const item = db.prepare('SELECT * FROM invoice_items WHERE id = ? AND invoice_id = ?').get(Number(requested.invoiceItemId), invoiceId);
      if (!item) throw new Error('Returned item no longer exists on this bill');
      const used = db.prepare('SELECT COALESCE(SUM(iri.quantity), 0) AS quantity FROM invoice_return_items iri JOIN invoice_returns ir ON ir.id = iri.return_id WHERE ir.source_invoice_id = ? AND iri.invoice_item_id = ?').get(invoiceId, item.id).quantity || 0;
      if (qty > Number(item.quantity) - Number(used)) throw new Error(`Return quantity exceeds sold quantity for ${item.product_name}`);
      const amountPaise = Math.round(item.unit_price_paise * qty);
      totalPaise += amountPaise;
      validated.push({ item, qty, amountPaise });
    }
    if (!validated.length) throw new Error('Enter at least one return quantity');
    const ret = db.prepare('INSERT INTO invoice_returns (source_invoice_id, customer_id, total_paise, notes) VALUES (?,?,?,?)').run(invoiceId, customerId, totalPaise, data.notes || `Return from ${invoice.invoice_number}`);
    const returnId = ret.lastInsertRowid;
    db.prepare('UPDATE invoices SET return_credit_paise = COALESCE(return_credit_paise, 0) + ? WHERE id = ?').run(totalPaise, invoiceId);
    for (const entry of validated) {
      db.prepare('INSERT INTO invoice_return_items (return_id, invoice_item_id, product_id, quantity, unit_price_paise, amount_paise) VALUES (?,?,?,?,?,?)').run(returnId, entry.item.id, entry.item.product_id, entry.qty, entry.item.unit_price_paise, entry.amountPaise);
      db.prepare("UPDATE products SET current_stock = current_stock + ?, updated_at = datetime('now') WHERE id = ?").run(entry.qty, entry.item.product_id);
      db.prepare("INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, notes) VALUES (?, 'return', ?, 'return', ?, ?)").run(entry.item.product_id, entry.qty, returnId, `Return from ${invoice.invoice_number}`);
    }
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
    const advance = (customer.advance_paise || 0) + totalPaise;
    db.prepare("UPDATE customers SET advance_paise = ?, updated_at = datetime('now') WHERE id = ?").run(advance, customerId);
    db.prepare("INSERT INTO ledger_entries (customer_id, entry_type, amount_paise, balance_after_paise, reference_type, reference_id, notes) VALUES (?, 'return_credit', ?, ?, 'return', ?, ?)").run(customerId, totalPaise, customer.outstanding_paise || 0, returnId, `Return credit from ${invoice.invoice_number}`);
    return { id: returnId, customerId, amount: fromPaise(totalPaise), customerAdvance: fromPaise(advance) };
  })();
}
