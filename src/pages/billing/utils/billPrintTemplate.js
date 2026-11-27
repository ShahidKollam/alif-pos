import { formatINR } from '../../../utils/money';

/**
 * Shared WhatsApp + thermal/print bill layout.
 * Labels match Bill summary: Subtotal, Discount, Bill Amount, Old Balance,
 * Total Amount, Paid Amount, Balance Amount.
 *
 * Sections:
 *   A. Bill information
 *   B. Product details
 *   C. Bill calculation
 *   D. Customer account details
 */

export function formatDrCr(amount) {
  const n = Number(amount) || 0;
  if (n > 0) return `${formatINR(n)} Dr`;
  if (n < 0) return `${formatINR(Math.abs(n))} Cr`;
  return formatINR(0);
}

/**
 * @param {object} ctx — tab, filledItems, totals, rateOf, itemAmount
 */
export function buildWhatsAppText(ctx) {
  const {
    tab,
    filledItems,
    subtotal,
    discountType,
    discountVal,
    billAmount,
    oldBalance,
    totalAmount,
    paidAmount,
    balanceAmount,
    appliedAdvance = 0,
    excess = 0,
    rateOf,
    itemAmount,
  } = ctx;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB');
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const lines = [];

  // A. Bill information
  lines.push(`*Bill ${tab.invoiceNo || ''}*`);
  lines.push(`Date & Time: ${dateStr} ${timeStr}`);
  lines.push(`Mode: ${tab.billMode === 'retail' ? 'Retail' : 'Wholesale'}`);
  if (tab.customerName) lines.push(`Customer Name: ${tab.customerName}`);
  if (tab.customerPhone) lines.push(`Customer Mobile: ${tab.customerPhone}`);
  lines.push('');

  // B. Product details
  lines.push('*Products*');
  if (filledItems.length) {
    filledItems.forEach((it, idx) => {
      const mark = it.verified ? '✓' : '○';
      lines.push(
        `${idx + 1}. ${mark} ${it.productName} × ${it.quantity} @ ${formatINR(rateOf(it))} = ${formatINR(itemAmount(it))}`
      );
    });
  } else {
    lines.push('(No products — balance payment)');
  }
  lines.push('');

  // C. Bill calculation
  lines.push('*Bill calculation*');
  lines.push(`Subtotal: ${formatINR(subtotal)}`);
  {
    const discNote =
      discountType === 'percent' && discountVal > 0
        ? ` (${Number(tab.discount) || 0}%)`
        : '';
    lines.push(`Discount${discNote}: ${formatINR(discountVal)}`);
  }
  lines.push(`Bill Amount: ${formatINR(billAmount)}`);
  lines.push('');

  // D. Customer account details
  lines.push('*Customer account*');
  lines.push(`Old Balance: ${tab.customerId ? formatDrCr(oldBalance) : formatINR(0)}`);
  lines.push(`Bill Amount: ${formatINR(billAmount)}`);
  lines.push(`Total Amount: ${formatINR(totalAmount)}`);
  if (appliedAdvance > 0) {
    lines.push(`Applied Advance: − ${formatINR(appliedAdvance)}`);
  }
  const pm = tab.payMethod || 'cash';
  if (pm === 'both') {
    lines.push(
      `Paid Amount: Cash ${formatINR(Number(tab.cashAmount) || 0)} + UPI ${formatINR(Number(tab.upiAmount) || 0)}`
    );
  } else if (pm === 'upi') {
    lines.push(`Paid Amount (UPI): ${formatINR(paidAmount)}`);
  } else {
    lines.push(`Paid Amount (Cash): ${formatINR(paidAmount)}`);
  }
  lines.push(`Balance Amount: ${formatDrCr(balanceAmount)}`);
  if (excess > 0 && tab.treatExcessAsAdvance) {
    lines.push(`Extra as advance: ${formatINR(excess)}`);
  }
  if (tab.notes) {
    lines.push('');
    lines.push(tab.notes);
  }
  return lines.join('\n');
}

/**
 * Open a compact ~80 mm receipt HTML and trigger the system print dialog.
 */
export function printBillHtml(ctx) {
  const {
    tab,
    filledItems,
    subtotal,
    discountType,
    discountVal,
    billAmount,
    oldBalance,
    totalAmount,
    paidAmount,
    balanceAmount,
    appliedAdvance = 0,
    excess = 0,
    rateOf,
    itemAmount,
  } = ctx;

  if (!tab?.savedInvoiceId) return { ok: false, error: 'Save the bill first, then print' };

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB');
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const esc = (s) => String(s ?? '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
  const money = (n) => esc(formatINR(n));
  const drCr = (n) => esc(formatDrCr(n));

  const productRows = filledItems.length
    ? filledItems
        .map((it, idx) => {
          const mark = it.verified ? '✓' : '○';
          return `<tr>
            <td class="c">${idx + 1}</td>
            <td>${esc(mark)} ${esc(it.productName)}</td>
            <td class="r">${esc(it.quantity)}</td>
            <td class="r">${money(rateOf(it))}</td>
            <td class="r">${money(itemAmount(it))}</td>
          </tr>`;
        })
        .join('')
    : '<tr><td colspan="5" class="muted">(No products — balance payment)</td></tr>';

  const pm = tab.payMethod || 'cash';
  let paidLine = '';
  if (pm === 'both') {
    paidLine = `Cash ${money(Number(tab.cashAmount) || 0)} + UPI ${money(Number(tab.upiAmount) || 0)}`;
  } else if (pm === 'upi') {
    paidLine = `${money(paidAmount)} (UPI)`;
  } else {
    paidLine = `${money(paidAmount)} (Cash)`;
  }

  const discNote =
    discountType === 'percent' && discountVal > 0
      ? ` (${Number(tab.discount) || 0}%)`
      : '';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Bill ${esc(tab.invoiceNo || '')}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-size: 12px; color: #0a0a0a; padding: 12px; max-width: 80mm; }
  h1 { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
  .sec { margin-top: 10px; padding-top: 8px; border-top: 1px dashed #999; }
  .sec-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #444; margin-bottom: 4px; }
  .row { display: flex; justify-content: space-between; gap: 8px; padding: 1px 0; }
  .row strong { font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th, td { padding: 2px 2px; vertical-align: top; }
  th { font-size: 10px; text-align: left; border-bottom: 1px solid #ccc; }
  td.r, th.r { text-align: right; }
  td.c, th.c { text-align: center; width: 18px; }
  .muted { color: #666; font-style: italic; }
  .grand { font-weight: 700; font-size: 13px; margin-top: 2px; }
  .notes { margin-top: 8px; white-space: pre-wrap; font-size: 11px; }
  @media print {
    body { padding: 0; max-width: none; }
    @page { margin: 4mm; }
  }
</style></head><body>
  <h1>Bill ${esc(tab.invoiceNo || '')}</h1>
  <div class="row"><span>Date & Time</span><span>${esc(dateStr)} ${esc(timeStr)}</span></div>
  <div class="row"><span>Mode</span><span>${tab.billMode === 'retail' ? 'Retail' : 'Wholesale'}</span></div>
  ${tab.customerName ? `<div class="row"><span>Customer Name</span><span>${esc(tab.customerName)}</span></div>` : ''}
  ${tab.customerPhone ? `<div class="row"><span>Customer Mobile</span><span>${esc(tab.customerPhone)}</span></div>` : ''}

  <div class="sec">
    <div class="sec-title">Product details</div>
    <table>
      <thead><tr><th class="c">#</th><th>Product</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
      <tbody>${productRows}</tbody>
    </table>
  </div>

  <div class="sec">
    <div class="sec-title">Bill calculation</div>
    <div class="row"><span>Subtotal</span><span>${money(subtotal)}</span></div>
    <div class="row"><span>Discount${esc(discNote)}</span><span>${money(discountVal)}</span></div>
    <div class="row"><span>Bill Amount</span><strong>${money(billAmount)}</strong></div>
  </div>

  <div class="sec">
    <div class="sec-title">Customer account</div>
    <div class="row"><span>Old Balance</span><span>${tab.customerId ? drCr(oldBalance) : money(0)}</span></div>
    <div class="row"><span>Bill Amount</span><span>${money(billAmount)}</span></div>
    <div class="row grand"><span>Total Amount</span><span>${money(totalAmount)}</span></div>
    ${appliedAdvance > 0 ? `<div class="row"><span>Applied Advance</span><span>− ${money(appliedAdvance)}</span></div>` : ''}
    <div class="row"><span>Paid Amount</span><span>${paidLine}</span></div>
    <div class="row grand"><span>Balance Amount</span><span>${drCr(balanceAmount)}</span></div>
    ${excess > 0 && tab.treatExcessAsAdvance ? `<div class="row"><span>Extra as advance</span><span>${money(excess)}</span></div>` : ''}
  </div>

  ${tab.notes ? `<div class="notes">${esc(tab.notes)}</div>` : ''}
</body></html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      try {
        w.print();
      } catch (_) {}
    }, 250);
  }
  return { ok: true };
}
