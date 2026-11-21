import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Trash2, Printer, Save, Plus, X, MessageCircle, UserPlus } from 'lucide-react';
import { api } from '../utils/api';
import { formatINR, roundMoney } from '../utils/money';
import { loadBillingSession, saveBillingSession } from '../utils/billingPersist';

let tabSeq = 1;
let rowSeq = 1;
let walkInSeq = 1;
let lastSavedInvoiceId = null;
let lastSavedInvoiceNumber = null;

function emptyRow() {
  return { rowKey: `r${rowSeq++}`, productId: null, productName: '', category: null, stock: null, wholesalePrice: 0, retailPrice: 0, quantity: '', rateOverride: '', verified: false, hasPersonalPrice: false };
}

function newTab() {
  return {
    id: `t${tabSeq++}`, walkInNo: walkInSeq++, invoiceNo: '', savedInvoiceId: null, customerId: null, customerName: '', customerQuery: '', customerPhone: '',
    customerOutstanding: 0, customerAdvance: 0, billMode: 'wholesale', items: [emptyRow()], discount: 0, amountReceived: '', amountEdited: false, treatExcessAsAdvance: false, notes: '', payMethod: 'cash', cashAmount: '', upiAmount: ''
  };
}

/** Tab label: customer name, else Walk-in #n, else saved invoice number. */
function tabLabel(t) {
  const name = (t.customerName || '').trim();
  if (name) return name;
  if (t.savedInvoiceId && t.invoiceNo) return t.invoiceNo;
  return `Walk-in #${t.walkInNo || 1}`;
}

function migrateItems(items) {
  if (!Array.isArray(items) || !items.length) return [emptyRow()];
  return items.map((it) => ({
    rowKey: it.rowKey || `r${rowSeq++}`, productId: it.productId ?? null, productName: it.productName || '', category: (it.category && String(it.category).trim()) || null,
    stock: it.stock ?? null, wholesalePrice: it.wholesalePrice ?? 0, retailPrice: it.retailPrice ?? 0,
    quantity: it.quantity === 0 || it.quantity ? it.quantity : '', rateOverride: it.rateOverride != null && it.rateOverride !== '' ? it.rateOverride : '', verified: !!it.verified, hasPersonalPrice: !!it.hasPersonalPrice
  }));
}

function initFromStorage() {
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
        amountReceived: t.amountReceived != null ? t.amountReceived : '',
        amountEdited: !!t.amountEdited,
        treatExcessAsAdvance: !!t.treatExcessAsAdvance,
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

export default function Billing({ showToast }) {
  const initial = useRef(null);
  if (!initial.current) initial.current = initFromStorage();
  const [tabs, setTabs] = useState(initial.current.tabs);
  const [activeId, setActiveId] = useState(initial.current.activeId);
  const [showCust, setShowCust] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [saving, setSaving] = useState(false);
  // NOTE: Full component body continues in follow-up if truncated — use artifacts/Billing_v2.4.1.jsx
  return (<div className="p-6"><p>Billing loading… If you see this, copy artifacts/Billing_v2.4.1.jsx over src/pages/Billing.jsx</p></div>);
}
