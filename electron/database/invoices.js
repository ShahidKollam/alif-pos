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

export function getNextInvoiceNumber(mode) {
  const seq = getDb().prepare('SELECT last_number FROM invoice_sequences WHERE mode = ?').get(mode);
  const next = (seq?.last_number || 0) + 1;
  return `${mode === 'wholesale' ? 'W' : 'R'}-${String(next).padStart(6, '0')}`;
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
    // Per-line W/R (default wholesale). Stock may go negative.
    const lineMode = item.priceMode === 'retail' ? 'retail' : 'wholesale';
    if (lineMode === 'retail') retailCount += 1;
    else wholesaleCount += 1;
    let unitPricePaise = lineMode === 'wholesale'
      ? product.wholesale_price_paise
      : product.retail_price_paise;
    // Optional cashier rate override (₹)
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
  // Invoice number series: all-retail → R, otherwise W
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
  // treatExcessAsAdvance: boolean from UI
  const asAdvance = !!data.treatExcessAsAdvance;

  return db.transaction(() => {
    const seq = db.prepare('SELECT last_number FROM invoice_sequences WHERE mode = ?').get(data.billingMode);
    const nextNum = (seq?.last_number || 0) + 1;
    const prefix = data.billingMode === 'wholesale' ? 'W' : 'R';
    const invoiceNumber = `${prefix}-${String(nextNum).padStart(6, '0')}`;
    if (db.prepare('SELECT id FROM invoices WHERE invoice_number = ?').get(invoiceNumber)) {
      throw new Error('Invoice number conflict. Please try again.');
    }

    const invResult = db.prepare(`
      INSERT INTO invoices (
        invoice_number, invoice_date, billing_mode, customer_id, customer_name,
        subtotal_paise, discount_paise, total_paise, amount_received_paise, balance_due_paise, notes, is_demo
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      invoiceNumber,
      data.invoiceDate || new Date().toISOString().slice(0, 19).replace('T', ' '),
      data.billingMode,
      data.customerId || null,
      data.customerName?.trim() || null,
      subtotalPaise, discountPaise, totalPaise, amountReceivedPaise, balanceDuePaise,
      data.notes || null,
      data.isDemo ? 1 : 0
    );
    const invoiceId = invResult.lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price_paise, amount_paise, wholesale_price_paise, retail_price_paise)
      VALUES (?,?,?,?,?,?,?,?)
    `);
    const updateStock = db.prepare(`UPDATE products SET current_stock = current_stock - ?, updated_at = datetime('now') WHERE id = ?`);
    const insertMovement = db.prepare(`
      INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, notes)
      VALUES (?,'sale',?,'invoice',?,?)
    `);

    for (const item of validatedItems) {
      insertItem.run(invoiceId, item.productId, item.productName, item.quantity, item.unitPricePaise, item.amountPaise, item.wholesalePricePaise, item.retailPricePaise);
      updateStock.run(item.quantity, item.productId);
      insertMovement.run(item.productId, -item.quantity, invoiceId, `Sale ${invoiceNumber}`);
    }

    db.prepare('UPDATE invoice_sequences SET last_number = ? WHERE mode = ?').run(nextNum, data.billingMode);

    // Customer outstanding / advance
    if (data.customerId) {
      const cust = db.prepare('SELECT * FROM customers WHERE id = ?').get(data.customerId);
      if (cust) {
        let outstanding = cust.outstanding_paise || 0;
        let advance = cust.advance_paise || 0;

        // Sale increases outstanding by total
        outstanding += totalPaise;
        db.prepare(`
          INSERT INTO ledger_entries (customer_id, entry_type, amount_paise, balance_after_paise, reference_type, reference_id, notes)
          VALUES (?, 'sale', ?, ?, 'invoice', ?, ?)
        `).run(data.customerId, totalPaise, outstanding, invoiceId, `Invoice ${invoiceNumber}`);

        // Payment reduces outstanding
        if (amountReceivedPaise > 0) {
          let payAgainst = Math.min(amountReceivedPaise, outstanding);
          let excess = amountReceivedPaise - payAgainst;
          outstanding -= payAgainst;
          if (excess > 0 && asAdvance) {
            advance += excess;
          }
          // if excess and not advance, it is change — not stored on customer

          db.prepare(`
            INSERT INTO payments (customer_id, invoice_id, amount_paise, payment_type, notes)
            VALUES (?, ?, ?, 'receipt', ?)
          `).run(data.customerId, invoiceId, amountReceivedPaise, `Payment for ${invoiceNumber}`);

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
      excess: fromPaise(excessPaise),
      amountReceived: fromPaise(amountReceivedPaise)
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
