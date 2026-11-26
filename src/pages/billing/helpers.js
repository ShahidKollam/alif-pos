import { loadBillingSession } from '../../utils/billingPersist';

let tabSeq = 1;
let rowSeq = 1;
let walkInSeq = 1;

export let lastSavedInvoiceId = null;
export let lastSavedInvoiceNumber = null;

export function setLastSaved(id, number) {
  lastSavedInvoiceId = id;
  lastSavedInvoiceNumber = number;
}

export function getLastSavedId() {
  return lastSavedInvoiceId;
}

export function resetWalkInSeq() {
  walkInSeq = 1;
}

export function nextRowKey() {
  return `r${rowSeq++}`;
}

export function nextTabId() {
  return `t${tabSeq++}`;
}

export function emptyRow() {
  return { rowKey: `r${rowSeq++}`, productId: null, productName: '', category: null, stock: null, wholesalePrice: 0, retailPrice: 0, mrp: 0, quantity: '', rateOverride: '', verified: false, hasPersonalPrice: false };
}

export function newTab() {
  return {
    id: `t${tabSeq++}`, walkInNo: walkInSeq++, invoiceNo: '', savedInvoiceId: null, customerId: null, customerName: '', customerQuery: '', customerPhone: '',
    customerOutstanding: 0, customerAdvance: 0, billMode: 'wholesale', items: [emptyRow()], discount: 0, discountType: 'amount', amountReceived: '', amountEdited: false, treatExcessAsAdvance: true, applyAdvance: false, notes: '', payMethod: 'cash', cashAmount: '', upiAmount: ''
  };
}

/** Tab label: customer name only, or Walk-in N (no counts / saved / invoice no). */
export function tabLabel(t) {
  const name = (t.customerName || '').trim();
  if (name) return name;
  return `Walk-in ${t.walkInNo || 1}`;
}

export function migrateItems(items) {
  if (!Array.isArray(items) || !items.length) return [emptyRow()];
  return items.map((it) => ({
    rowKey: it.rowKey || `r${rowSeq++}`, productId: it.productId ?? null, productName: it.productName || '', category: (it.category && String(it.category).trim()) || null,
    stock: it.stock ?? null, wholesalePrice: it.wholesalePrice ?? 0, retailPrice: it.retailPrice ?? 0, mrp: it.mrp ?? 0,
    quantity: it.quantity === 0 || it.quantity ? it.quantity : '', rateOverride: it.rateOverride != null && it.rateOverride !== '' ? it.rateOverride : '', verified: !!it.verified, hasPersonalPrice: !!it.hasPersonalPrice
  }));
}

export function initFromStorage() {
  const saved = loadBillingSession();
  if (saved?.tabs?.length) {
    const maxNum = saved.tabs.reduce((m, t) => { const n = parseInt(String(t.id).replace(/\D/g, ''), 10); return Number.isFinite(n) ? Math.max(m, n) : m; }, 0);
    tabSeq = Math.max(tabSeq, maxNum + 1);
    let maxWalk = saved.tabs.reduce((m, t) => Math.max(m, Number(t.walkInNo) || 0), 0);
    const tabs = saved.tabs.map((t) => {
      const walkInNo = Number(t.walkInNo) || (++maxWalk);
      const base = {
        id: t.id || `t${tabSeq++}`,
        walkInNo,
        invoiceNo: t.savedInvoiceId ? (t.invoiceNo || '') : (t.invoiceNo || ''),
        savedInvoiceId: t.savedInvoiceId || null,
        customerId: t.customerId ?? null,
        customerName: t.customerName || '',
        customerQuery: t.customerQuery != null ? t.customerQuery : (t.customerName || ''),
        customerPhone: t.customerPhone || '',
        customerOutstanding: t.customerOutstanding || 0,
        customerAdvance: t.customerAdvance || 0,
        billMode: t.billMode === 'retail' ? 'retail' : 'wholesale',
        items: migrateItems(t.items),
        discount: t.discount || 0,
        discountType: t.discountType === 'percent' ? 'percent' : 'amount',
        amountReceived: t.amountReceived != null ? t.amountReceived : '',
        amountEdited: !!t.amountEdited,
        treatExcessAsAdvance: !!t.treatExcessAsAdvance,
        applyAdvance: !!t.applyAdvance,
        notes: t.notes || '',
        payMethod: t.payMethod || 'cash',
        cashAmount: t.cashAmount || '',
        upiAmount: t.upiAmount || ''
      };
      if (!base.savedInvoiceId) base.invoiceNo = '';
      const last = base.items[base.items.length - 1];
      if (last?.productId) base.items = [...base.items, emptyRow()];
      return base;
    });
    walkInSeq = Math.max(walkInSeq, maxWalk + 1);
    return { tabs, activeId: saved.activeId && tabs.some((x) => x.id === saved.activeId) ? saved.activeId : tabs[0].id };
  }
  const t = newTab();
  return { tabs: [t], activeId: t.id };
}
