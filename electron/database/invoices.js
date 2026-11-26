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
