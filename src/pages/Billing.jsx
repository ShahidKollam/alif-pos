import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Trash2, Printer, Save, Plus, X, MessageCircle } from 'lucide-react';
import { api } from '../utils/api';
import { formatINR, roundMoney } from '../utils/money';
import { loadBillingSession, saveBillingSession } from '../utils/billingPersist';

let tabSeq = 1;
let rowSeq = 1;

function emptyRow() {
  return {
    rowKey: `r${rowSeq++}`,
    productId: null,
    productName: '',
    stock: null,
    wholesalePrice: 0,
    retailPrice: 0,
    quantity: '',
    rateOverride: '',
    verified: false
  };
}

function newTab() {
  return {
    id: `t${tabSeq++}`,
    invoiceNo: '',
    customerId: null,
    customerName: '',
    customerQuery: '',
    customerPhone: '',
    customerOutstanding: 0,
    customerAdvance: 0,
    billMode: 'wholesale',
    items: [emptyRow()],
    discount: 0,
    amountReceived: '',
    amountEdited: false,
    treatExcessAsAdvance: false,
    notes: ''
  };
}

function migrateItems(items) {
  if (!Array.isArray(items) || !items.length) return [emptyRow()];
  return items.map((it) => ({
    rowKey: it.rowKey || `r${rowSeq++}`,
    productId: it.productId ?? null,
    productName: it.productName || '',
    stock: it.stock ?? null,
    wholesalePrice: it.wholesalePrice ?? 0,
    retailPrice: it.retailPrice ?? 0,
    quantity: it.quantity === 0 || it.quantity ? it.quantity : '',
    rateOverride: it.rateOverride != null && it.rateOverride !== '' ? it.rateOverride : '',
    verified: !!it.verified
  }));
}

function initFromStorage() {
  const saved = loadBillingSession();
  if (saved?.tabs?.length) {
    const maxNum = saved.tabs.reduce((m, t) => {
      const n = parseInt(String(t.id).replace(/\D/g, ''), 10);
      return Number.isFinite(n) ? Math.max(m, n) : m;
    }, 0);
    tabSeq = Math.max(tabSeq, maxNum + 1);
    const tabs = saved.tabs.map((t) => {
      const base = { ...newTab(), ...t };
      base.billMode = t.billMode === 'retail' ? 'retail' : 'wholesale';
      base.items = migrateItems(t.items);
      const last = base.items[base.items.length - 1];
      if (last?.productId) base.items = [...base.items, emptyRow()];
      return base;
    });
    return {
      tabs,
      activeId: saved.activeId && tabs.some((x) => x.id === saved.activeId) ? saved.activeId : tabs[0].id
    };
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
  const [activeRowKey, setActiveRowKey] = useState(null);
  const [rowQuery, setRowQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const suggestionsRef = useRef([]);
  const highlightRef = useRef(-1);
  const listBoxRef = useRef(null);
  const productInputRefs = useRef({});
  const qtyInputRefs = useRef({});
  const wrRef = useRef(null);

  const tab = tabs.find((t) => t.id === activeId) || tabs[0];

  useEffect(() => { suggestionsRef.current = suggestions; }, [suggestions]);
  useEffect(() => { highlightRef.current = highlight; }, [highlight]);
  useEffect(() => {
    if (highlight < 0 || !listBoxRef.current) return;
    const el = listBoxRef.current.querySelector(`[data-sug-idx="${highlight}"]`);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlight]);
  useEffect(() => { saveBillingSession(tabs, activeId); }, [tabs, activeId]);

  const updateTab = useCallback((id, patch) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const loadInvoiceNo = useCallback(async (id) => {
    try {
      const num = await api.invoices.nextNumber('wholesale');
      updateTab(id, { invoiceNo: num });
    } catch {
      updateTab(id, { invoiceNo: 'W-000001' });
    }
  }, [updateTab]);

  useEffect(() => { if (tab && !tab.invoiceNo) loadInvoiceNo(tab.id); }, [tab?.id]);
  useEffect(() => { api.customers.list({ activeOnly: true }).then(setCustomers).catch(() => {}); }, []);
  useEffect(() => {
    if (!tab) return;
    const firstEmpty = (tab.items || []).find((i) => !i.productId);
    const key = firstEmpty?.rowKey || tab.items?.[0]?.rowKey;
    if (!key) return;
    const t = setTimeout(() => { productInputRefs.current[key]?.focus(); }, 60);
    return () => clearTimeout(t);
  }, [tab?.id]);

  useEffect(() => {
    const onNew = () => addTab();
    const onSave = () => saveBill();
    window.addEventListener('alif:new-bill', onNew);
    window.addEventListener('alif:save-bill', onSave);
    const key = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') { e.preventDefault(); addTab(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); window.dispatchEvent(new CustomEvent('alif:save-bill')); }
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('alif:new-bill', onNew);
      window.removeEventListener('alif:save-bill', onSave);
      window.removeEventListener('keydown', key);
    };
  }, [tab?.id, tab?.items, saving]);

  useEffect(() => {
    if (!showSug) return;
    let cancelled = false;
    const q = (rowQuery || '').trim();
    const timer = setTimeout(async () => {
      try {
        const list = await api.products.search(q);
        if (cancelled) return;
        const rows = Array.isArray(list) ? list.slice(0, 20) : [];
        setSuggestions(rows);
        setHighlight(rows.length ? 0 : -1);
      } catch {
        if (!cancelled) { setSuggestions([]); setHighlight(-1); }
      }
    }, 80);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [rowQuery, showSug, activeRowKey]);

  function addTab() {
    const t = newTab();
    setTabs((prev) => [...prev, t]);
    setActiveId(t.id);
    loadInvoiceNo(t.id);
  }

  function closeTab(id, e) {
    e?.stopPropagation();
    setTabs((prev) => {
      if (prev.length === 1) return prev;
      const next = prev.filter((x) => x.id !== id);
      if (activeId === id) setActiveId(next[next.length - 1].id);
      return next;
    });
  }

  function selectCustomer(c) {
    if (!c) {
      updateTab(tab.id, { customerId: null, customerName: '', customerQuery: '', customerPhone: '', customerOutstanding: 0, customerAdvance: 0 });
      return;
    }
    updateTab(tab.id, {
      customerId: c.id, customerName: c.name, customerQuery: c.name, customerPhone: c.phone || '',
      customerOutstanding: c.outstanding || 0, customerAdvance: c.advance || 0
    });
    setTimeout(() => wrRef.current?.focus(), 40);
  }

  function setItems(items) { updateTab(tab.id, { items }); }

  function updateRow(rowKey, patch) {
    const items = tab.items.map((r) => (r.rowKey === rowKey ? { ...r, ...patch } : r));
    const hasEmpty = items.some((r) => !r.productId);
    setItems(hasEmpty ? items : [...items, emptyRow()]);
  }

  function applyProductToRow(rowKey, product) {
    if (!product) return;
    const items = tab.items.map((r) =>
      r.rowKey === rowKey
        ? {
            ...r,
            productId: product.id,
            productName: product.name,
            stock: product.currentStock,
            wholesalePrice: product.wholesalePrice,
            retailPrice: product.retailPrice,
            quantity: r.quantity === '' || r.quantity == null ? 1 : r.quantity,
            rateOverride: '',
            verified: r.verified
          }
        : r
    );
    const hasEmpty = items.some((r) => !r.productId);
    setItems(hasEmpty ? items : [...items, emptyRow()]);
    setShowSug(false);
    setSuggestions([]);
    setHighlight(-1);
    setActiveRowKey(null);
    setRowQuery('');
    requestAnimationFrame(() => {
      qtyInputRefs.current[rowKey]?.focus();
      qtyInputRefs.current[rowKey]?.select?.();
    });
  }

  function removeRow(rowKey) {
    let items = tab.items.filter((r) => r.rowKey !== rowKey);
    if (!items.length || items.every((r) => r.productId)) items = [...items, emptyRow()];
    setItems(items);
  }

  const rateOf = (item) => {
    if (item.rateOverride !== '' && item.rateOverride != null && !Number.isNaN(Number(item.rateOverride))) {
      return Number(item.rateOverride);
    }
    return tab.billMode === 'retail' ? item.retailPrice : item.wholesalePrice;
  };

  const itemAmount = (item) => {
    if (!item.productId) return 0;
    return roundMoney(rateOf(item) * (Number(item.quantity) || 0));
  };

  const filledItems = useMemo(() => (tab?.items || []).filter((i) => i.productId), [tab?.items]);

  const subtotal = useMemo(
    () => roundMoney(filledItems.reduce((s, i) => s + itemAmount(i), 0)),
    [filledItems, tab?.billMode, tab?.items]
  );
  const discountVal = Math.min(Number(tab?.discount) || 0, subtotal);
  const billTotal = roundMoney(subtotal - discountVal);
  const previousBalance = tab?.customerOutstanding || 0;
  const grandTotal = roundMoney(billTotal + previousBalance);
  const received = Number(tab?.amountReceived) || 0;
  const stillDue = roundMoney(Math.max(0, billTotal - received));
  const excess = roundMoney(Math.max(0, received - billTotal));

  useEffect(() => {
    if (!tab) return;
    if (tab.amountEdited) return;
    const next = billTotal > 0 ? String(billTotal) : '';
    if (String(tab.amountReceived ?? '') !== next) updateTab(tab.id, { amountReceived: next });
  }, [billTotal, tab?.id, tab?.amountEdited]);

  async function saveBill() {
    if (!filledItems.length) { showToast('Add at least one product', 'error'); return; }
    if (saving) return;
    setSaving(true);
    try {
      const result = await api.invoices.save({
        billingMode: tab.billMode === 'retail' ? 'retail' : 'wholesale',
        customerId: tab.customerId,
        customerName: tab.customerName,
        discount: discountVal,
        amountReceived: received,
        treatExcessAsAdvance: tab.treatExcessAsAdvance,
        notes: tab.notes,
        items: filledItems.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: Number(i.quantity) || 0,
          priceMode: tab.billMode === 'retail' ? 'retail' : 'wholesale',
          unitPrice: i.rateOverride !== '' && i.rateOverride != null ? Number(i.rateOverride) : undefined
        }))
      });
      showToast(`Saved ${result.invoiceNumber} · ${formatINR(result.total)}`, 'success');
      const fresh = newTab();
      fresh.id = tab.id;
      setTabs((prev) => prev.map((t) => (t.id === tab.id ? fresh : t)));
      loadInvoiceNo(tab.id);
      api.customers.list({ activeOnly: true }).then(setCustomers).catch(() => {});
    } catch (err) {
      showToast(err.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  function buildWhatsAppText() {
    const lines = [];
    lines.push(`*Bill ${tab.invoiceNo || ''}*`);
    lines.push(`Date: ${new Date().toLocaleDateString('en-GB')}`);
    lines.push(`Mode: ${tab.billMode === 'retail' ? 'Retail' : 'Wholesale'}`);
    if (tab.customerName) lines.push(`Customer: ${tab.customerName}`);
    lines.push('');
    filledItems.forEach((it, idx) => {
      const mark = it.verified ? '✓' : '○';
      lines.push(`${idx + 1}. ${mark} ${it.productName} × ${it.quantity} @ ${formatINR(rateOf(it))} = ${formatINR(itemAmount(it))}`);
    });
    lines.push('');
    lines.push(`Total: ${formatINR(billTotal)}`);
    if (previousBalance > 0) lines.push(`Previous: ${formatINR(previousBalance)}`);
    lines.push(`*Grand total: ${formatINR(grandTotal)}*`);
    if (tab.notes) { lines.push(''); lines.push(tab.notes); }
    return lines.join('\n');
  }

  function shareWhatsApp() {
    if (!filledItems.length) { showToast('Add items before sharing', 'error'); return; }
    const text = encodeURIComponent(buildWhatsAppText());
    let phone = (tab.customerPhone || '').replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone;
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  }

  function onProductKey(e, row) {
    const list = suggestionsRef.current || [];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!list.length) return;
      setShowSug(true);
      setHighlight((h) => (h < 0 ? 0 : Math.min(h + 1, list.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!list.length) return;
      setShowSug(true);
      setHighlight((h) => (h <= 0 ? 0 : h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hi = highlightRef.current;
      const product = (hi >= 0 && list[hi]) || list[0];
      if (product) applyProductToRow(row.rowKey, product);
    } else if (e.key === 'Escape') {
      setShowSug(false);
      setHighlight(-1);
    } else if (e.key === 'Tab' && !e.shiftKey && row.productId) {
      e.preventDefault();
      qtyInputRefs.current[row.rowKey]?.focus();
    }
  }

  function onQtyKey(e, row, idx) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const items = tab.items;
      let next = items[idx + 1];
      if (!next) {
        const withEmpty = [...items, emptyRow()];
        setItems(withEmpty);
        next = withEmpty[withEmpty.length - 1];
      }
      requestAnimationFrame(() => { productInputRefs.current[next.rowKey]?.focus(); });
    }
  }

  if (!tab) return null;
  const invoiceDate = new Date().toLocaleDateString('en-GB');

  return (
    <div className="flex flex-col h-full bg-[#eef2f7] min-h-0">
      <div className="tab-bar shrink-0 bg-[#e8eef5]">
        {tabs.map((t) => (
          <button key={t.id} type="button" className={`tab ${t.id === activeId ? 'active' : ''}`} onClick={() => setActiveId(t.id)}>
            <span className="truncate">
              {t.invoiceNo || 'New bill'}
              {(t.items || []).filter((i) => i.productId).length ? ` · ${(t.items || []).filter((i) => i.productId).length}` : ''}
            </span>
            {tabs.length > 1 && (<span className="close" onClick={(e) => closeTab(t.id, e)}><X size={12} /></span>)}
          </button>
        ))}
        <button type="button" className="ml-1 px-2.5 py-1.5 text-slate-500 hover:text-blue-600 self-center rounded-lg hover:bg-white/80" title="New bill (Ctrl+T / F8)" onClick={addTab}><Plus size={16} /></button>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="flex-1 min-w-0 flex flex-col min-h-0 px-3 py-2">
          <div className="grid grid-cols-12 gap-2 mb-2 shrink-0">
            <div className="col-span-12 md:col-span-4">
              <label className="block text-[11px] font-bold text-black mb-0.5">Customer</label>
              <div className="relative">
                <input type="text" className="field bg-white" placeholder="Search name or phone…"
                  value={tab.customerQuery != null ? tab.customerQuery : tab.customerName || ''}
                  onChange={(e) => {
                    updateTab(tab.id, { customerQuery: e.target.value, customerId: null, customerName: '', customerPhone: '', customerOutstanding: 0, customerAdvance: 0 });
                    setShowCust(true);
                  }}
                  onFocus={() => setShowCust(true)} onBlur={() => setTimeout(() => setShowCust(false), 180)} />
                {showCust && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-auto">
                    <button type="button" className="w-full text-left px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 border-b"
                      onMouseDown={(e) => { e.preventDefault(); selectCustomer(null); setShowCust(false); }}>Walk-in / none</button>
                    {customers.filter((c) => {
                      const q = (tab.customerQuery || '').trim().toLowerCase();
                      if (!q) return true;
                      return (c.name || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q);
                    }).slice(0, 15).map((c) => (
                      <button key={c.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-slate-50 last:border-0"
                        onMouseDown={(e) => { e.preventDefault(); selectCustomer(c); setShowCust(false); }}>
                        <div className="font-medium text-black">{c.name}</div>
                        <div className="text-[11px] text-slate-500">{c.phone || '—'}{c.outstanding > 0 ? ` · due ${formatINR(c.outstanding)}` : ''}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="col-span-4 md:col-span-2">
              <label className="block text-[11px] font-bold text-black mb-0.5">W / R</label>
              <div ref={wrRef} tabIndex={0} className="flex rounded-md border border-slate-200 overflow-hidden h-[34px] bg-white focus:ring-2 focus:ring-blue-200 outline-none">
                <button type="button" onClick={() => updateTab(tab.id, { billMode: 'wholesale' })}
                  className={`flex-1 text-xs font-bold ${tab.billMode !== 'retail' ? 'bg-[#1d4ed8] text-white' : 'bg-white text-black'}`}>W</button>
                <button type="button" onClick={() => updateTab(tab.id, { billMode: 'retail' })}
                  className={`flex-1 text-xs font-bold border-l border-slate-200 ${tab.billMode === 'retail' ? 'bg-[#1d4ed8] text-white' : 'bg-white text-black'}`}>R</button>
              </div>
            </div>
            <div className="col-span-4 md:col-span-3">
              <label className="block text-[11px] font-bold text-black mb-0.5">Bill date</label>
              <input className="field bg-white" value={invoiceDate} readOnly />
            </div>
            <div className="col-span-4 md:col-span-3">
              <label className="block text-[11px] font-bold text-black mb-0.5">Bill no.</label>
              <input className="field bg-slate-50 font-mono font-semibold text-slate-700" value={tab.invoiceNo || '…'} readOnly />
            </div>
          </div>

          <div className="pos-table-wrap flex-1 min-h-0 overflow-auto mb-2 relative">
            <table className="pos-table">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="text-center" style={{ width: 40 }}>#</th>
                  <th>Product</th>
                  <th className="text-center" style={{ width: 44 }} title="Verified with customer">✓</th>
                  <th className="text-center" style={{ width: 72 }}>Qty</th>
                  <th className="text-right num" style={{ width: 100 }}>Rate (₹)</th>
                  <th className="text-right num" style={{ width: 110 }}>Amount (₹)</th>
                  <th className="text-center" style={{ width: 44 }}></th>
                </tr>
              </thead>
              <tbody>
                {tab.items.map((row, idx) => {
                  const isActive = activeRowKey === row.rowKey && showSug;
                  const serial = row.productId ? filledItems.findIndex((f) => f.rowKey === row.rowKey) + 1 : '·';
                  return (
                    <tr key={row.rowKey}>
                      <td className="text-center text-slate-500 font-medium">{serial}</td>
                      <td className="relative">
                        <input
                          ref={(el) => { if (el) productInputRefs.current[row.rowKey] = el; }}
                          className="w-full bg-transparent border-0 outline-none font-semibold text-black text-[13px] py-0.5 px-0"
                          placeholder="Type product name…"
                          value={activeRowKey === row.rowKey && showSug ? rowQuery : row.productName || ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setActiveRowKey(row.rowKey);
                            setRowQuery(v);
                            setShowSug(true);
                            if (row.productId) updateRow(row.rowKey, { productId: null, productName: v, stock: null });
                            else updateRow(row.rowKey, { productName: v });
                          }}
                          onFocus={() => { setActiveRowKey(row.rowKey); setRowQuery(row.productName || ''); setShowSug(true); }}
                          onBlur={() => setTimeout(() => setShowSug(false), 160)}
                          onKeyDown={(e) => onProductKey(e, row)}
                        />
                        {isActive && (
                          <div ref={listBoxRef} className="absolute left-0 right-0 top-full z-30 mt-0.5 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto" role="listbox">
                            {suggestions.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-slate-500">{(rowQuery || '').trim() ? 'No match' : 'Type to search'}</div>
                            ) : (
                              suggestions.map((p, si) => (
                                <button key={p.id} type="button" data-sug-idx={si}
                                  className={`w-full text-left px-3 py-1.5 text-sm border-b border-slate-50 last:border-0 ${si === highlight ? 'bg-blue-100' : 'hover:bg-blue-50'}`}
                                  onMouseDown={(e) => { e.preventDefault(); applyProductToRow(row.rowKey, p); }}
                                  onMouseEnter={() => setHighlight(si)}>
                                  <span className="font-semibold text-black">{p.name}</span>
                                  <span className="text-[11px] text-slate-500 ml-2">
                                    Stk {p.currentStock} · {tab.billMode === 'retail' ? formatINR(p.retailPrice) : formatINR(p.wholesalePrice)}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </td>
                      <td className="text-center">
                        <input type="checkbox" className="w-4 h-4 accent-blue-600" disabled={!row.productId}
                          checked={!!row.verified} onChange={(e) => updateRow(row.rowKey, { verified: e.target.checked })} title="Verified with customer" />
                      </td>
                      <td className="text-center">
                        <input ref={(el) => { if (el) qtyInputRefs.current[row.rowKey] = el; }}
                          type="number" min="0" step="1" disabled={!row.productId} value={row.quantity}
                          onChange={(e) => updateRow(row.rowKey, { quantity: e.target.value })}
                          onKeyDown={(e) => onQtyKey(e, row, idx)}
                          className="w-14 text-center field py-0.5 mx-auto text-black" />
                      </td>
                      <td className="text-right num">
                        {row.productId ? (
                          <input type="number" min="0" step="0.01"
                            value={row.rateOverride !== '' && row.rateOverride != null ? row.rateOverride : rateOf(row)}
                            onChange={(e) => updateRow(row.rowKey, { rateOverride: e.target.value })}
                            className="w-24 text-right field py-0.5 ml-auto text-black font-medium" />
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="text-right num font-semibold text-black">{row.productId ? formatINR(itemAmount(row)) : '—'}</td>
                      <td className="text-center">
                        {row.productId ? (
                          <button type="button" title="Remove" onClick={() => removeRow(row.rowKey)}
                            className="inline-flex p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="shrink-0 mb-1">
            <label className="block text-[11px] font-bold text-black mb-0.5">Notes</label>
            <textarea className="field bg-white min-h-[48px] resize-y" placeholder="Thank you for your business!"
              value={tab.notes || ''} onChange={(e) => updateTab(tab.id, { notes: e.target.value })} />
          </div>
          <p className="text-[10px] text-black/45 shrink-0 pb-1">Enter on Qty → next product · Tab between fields · Ctrl+S save · ✓ = verified with customer</p>
        </div>

        <aside className="w-[300px] xl:w-[320px] shrink-0 border-l border-[#cbd5e1] bg-white flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-[#cbd5e1] bg-[#dbe7f8]">
            <div className="text-[11px] font-bold text-black uppercase tracking-wide">Bill summary</div>
            <div className="text-xs text-black/70 font-medium truncate">{tab.invoiceNo || 'New bill'} · {tab.billMode === 'retail' ? 'Retail' : 'Wholesale'}</div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="totals-card border-0 rounded-none shadow-none">
              <div className="t-row"><span className="t-label">Discount</span>
                <input type="number" min="0" value={tab.discount} onChange={(e) => updateTab(tab.id, { discount: e.target.value, amountEdited: false })} className="field rounded-md" />
              </div>
              <div className="t-row"><span className="t-label">Total</span><span className="t-value">{formatINR(billTotal)}</span></div>
              <div className="t-row"><span className="t-label">Previous balance</span><span className="t-value">{tab.customerId ? formatINR(previousBalance) : '—'}</span></div>
              <div className="t-row t-grand"><span className="t-label">Grand total</span><span className="t-value">{formatINR(grandTotal)}</span></div>
              <div className="t-row"><span className="t-label">Amount paying now</span>
                <input type="number" min="0" value={tab.amountReceived} onChange={(e) => updateTab(tab.id, { amountReceived: e.target.value, amountEdited: true })} className="field" />
              </div>
              <div className="t-row"><span className="t-label">Still due on this bill</span><span className="t-value">{formatINR(stillDue)}</span></div>
              {excess > 0 && (
                <div className="t-row">
                  <label className="flex items-center gap-2 text-xs text-black font-medium">
                    <input type="checkbox" checked={tab.treatExcessAsAdvance} onChange={(e) => updateTab(tab.id, { treatExcessAsAdvance: e.target.checked })} />
                    Extra {formatINR(excess)} as advance
                  </label>
                </div>
              )}
            </div>
          </div>
          <div className="p-3 border-t border-[#cbd5e1] space-y-2 bg-[#f8fafc]">
            <button type="button" className="btn btn-primary w-full py-2.5" onClick={saveBill} disabled={saving || !filledItems.length}><Save size={15} /> Save Bill</button>
            <button type="button" className="btn btn-ghost w-full" onClick={shareWhatsApp} disabled={!filledItems.length}><MessageCircle size={15} /> WhatsApp Bill</button>
            <button type="button" className="btn btn-ghost w-full" disabled={!filledItems.length}
              onClick={() => {
                const text = buildWhatsAppText().replace(/\*/g, '');
                const w = window.open('', '_blank');
                if (w) {
                  w.document.write(`<pre style="font:14px/1.4 system-ui;padding:24px;color:#0a0a0a">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`);
                  w.document.close();
                  w.print();
                }
              }}><Printer size={15} /> Print Bill</button>
            <p className="text-[10px] text-black/50 text-center leading-snug">Ctrl+T new tab · Ctrl+S save · ✓ on lines = verified</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
