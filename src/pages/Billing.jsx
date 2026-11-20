import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, Trash2, Printer, Save, Plus, X } from 'lucide-react';
import { api } from '../utils/api';
import { formatINR, roundMoney } from '../utils/money';
import { loadBillingSession, saveBillingSession } from '../utils/billingPersist';

let tabSeq = 1;

function newTab() {
  return {
    id: `t${tabSeq++}`,
    invoiceNo: '',
    customerId: null,
    customerName: '',
    customerQuery: '',
    customerOutstanding: 0,
    customerAdvance: 0,
    search: '',
    items: [],
    discount: 0,
    amountReceived: '',
    amountEdited: false,
    treatExcessAsAdvance: false,
    notes: ''
  };
}

function initFromStorage() {
  const saved = loadBillingSession();
  if (saved?.tabs?.length) {
    const maxNum = saved.tabs.reduce((m, t) => {
      const n = parseInt(String(t.id).replace(/\D/g, ''), 10);
      return Number.isFinite(n) ? Math.max(m, n) : m;
    }, 0);
    tabSeq = Math.max(tabSeq, maxNum + 1);
    // migrate old tabs that had global mode
    const tabs = saved.tabs.map((t) => ({
      ...newTab(),
      ...t,
      items: (t.items || []).map((it) => ({
        ...it,
        priceMode: it.priceMode === 'retail' ? 'retail' : 'wholesale'
      }))
    }));
    return {
      tabs,
      activeId:
        saved.activeId && tabs.some((x) => x.id === saved.activeId)
          ? saved.activeId
          : tabs[0].id
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
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [showCust, setShowCust] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [pendingQty, setPendingQty] = useState('1');
  const [pendingRate, setPendingRate] = useState('');
  const [pendingMode, setPendingMode] = useState('wholesale'); // W default
  const searchRef = useRef(null);
  const qtyRef = useRef(null);
  const rateRef = useRef(null);
  const [pendingProduct, setPendingProduct] = useState(null);
  const listBoxRef = useRef(null);
  const [highlight, setHighlight] = useState(-1);
  const highlightRef = useRef(-1);
  const suggestionsRef = useRef([]);

  const tab = tabs.find((t) => t.id === activeId) || tabs[0];

  useEffect(() => {
    suggestionsRef.current = suggestions;
  }, [suggestions]);
  useEffect(() => {
    highlightRef.current = highlight;
  }, [highlight]);
  useEffect(() => {
    if (highlight < 0 || !listBoxRef.current) return;
    const el = listBoxRef.current.querySelector(`[data-sug-idx="${highlight}"]`);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlight]);

  useEffect(() => {
    saveBillingSession(tabs, activeId);
  }, [tabs, activeId]);

  const updateTab = useCallback((id, patch) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const loadInvoiceNo = useCallback(
    async (id) => {
      try {
        const num = await api.invoices.nextNumber('wholesale');
        updateTab(id, { invoiceNo: num });
      } catch {
        updateTab(id, { invoiceNo: 'W-000001' });
      }
    },
    [updateTab]
  );

  useEffect(() => {
    if (tab && !tab.invoiceNo) loadInvoiceNo(tab.id);
  }, [tab?.id]);

  useEffect(() => {
    api.customers.list({ activeOnly: true }).then(setCustomers).catch(() => {});
  }, []);

  useEffect(() => {
    const onNew = () => addTab();
    const onSave = () => saveBill();
    window.addEventListener('alif:new-bill', onNew);
    window.addEventListener('alif:save-bill', onSave);
    const key = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        addTab();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('alif:save-bill'));
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('alif:new-bill', onNew);
      window.removeEventListener('alif:save-bill', onSave);
      window.removeEventListener('keydown', key);
    };
  }, [tab?.id, tab?.items, saving]);

  useEffect(() => {
    let cancelled = false;
    const q = (tab?.search || '').trim();
    const timer = setTimeout(async () => {
      try {
        const list = await api.products.search(q);
        if (cancelled) return;
        const rows = Array.isArray(list) ? list.slice(0, 20) : [];
        setSuggestions(rows);
        setHighlight(rows.length ? 0 : -1);
        if (q.length > 0) setShowSug(true);
      } catch (err) {
        if (!cancelled) {
          setSuggestions([]);
          setHighlight(-1);
        }
      }
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tab?.search, tab?.id]);

  function addTab() {
    const t = newTab();
    setTabs((prev) => [...prev, t]);
    setActiveId(t.id);
    loadInvoiceNo(t.id);
    setTimeout(() => searchRef.current?.focus(), 50);
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

  function addProduct(product, opts = {}) {
    if (!tab || !product) return;
    const mode = opts.priceMode || pendingMode || 'wholesale';
    const qty = Math.max(0, Number(opts.quantity != null ? opts.quantity : pendingQty) || 1);
    let rateOverride = opts.rate;
    if (rateOverride === '' || rateOverride == null) rateOverride = pendingRate;
    const rateNum = rateOverride !== '' && rateOverride != null ? Number(rateOverride) : null;

    const items = [...tab.items];
    const existing = items.find((i) => i.productId === product.id && (i.priceMode || 'wholesale') === mode);
    if (existing && rateNum == null) {
      existing.quantity = roundMoney(existing.quantity + qty);
    } else if (existing && rateNum != null) {
      existing.quantity = roundMoney(existing.quantity + qty);
      existing.rateOverride = rateNum;
    } else {
      const row = {
        productId: product.id,
        productName: product.name,
        productCode: product.productCode || '',
        stock: product.currentStock,
        wholesalePrice: product.wholesalePrice,
        retailPrice: product.retailPrice,
        quantity: qty,
        priceMode: mode
      };
      if (rateNum != null && !Number.isNaN(rateNum)) row.rateOverride = rateNum;
      items.push(row);
    }
    updateTab(tab.id, { items, search: '' });
    setPendingQty('1');
    setPendingRate('');
    setPendingProduct(null);
    setSuggestions([]);
    setHighlight(-1);
    setShowSug(false);
    requestAnimationFrame(() => searchRef.current?.focus());
  }


  function selectProductForEntry(product) {
    if (!product) return;
    setPendingProduct(product);
    setPendingRate(
      String(pendingMode === 'retail' ? product.retailPrice : product.wholesalePrice)
    );
    updateTab(tab.id, {
      search: product.name || product.productCode || ''
    });
    setShowSug(false);
    setHighlight(-1);
    setSuggestions([]);
    requestAnimationFrame(() => {
      qtyRef.current?.focus();
      qtyRef.current?.select?.();
    });
  }

  function addFromBar() {
    const list = suggestionsRef.current || [];
    const hi = highlightRef.current;
    const product =
      pendingProduct ||
      (hi >= 0 && list[hi]) ||
      list[0] ||
      null;
    if (!product) {
      showToast('Search and select a product first', 'error');
      return;
    }
    addProduct(product, {
      quantity: pendingQty,
      rate: pendingRate,
      priceMode: pendingMode
    });
    setPendingProduct(null);
  }

  function updateQty(productId, qty) {
    const n = parseFloat(qty);
    const items = tab.items.map((i) => {
      if (i.productId !== productId) return i;
      if (isNaN(n) || n < 0) return i;
      return { ...i, quantity: n };
    });
    updateTab(tab.id, { items });
  }

  function setLineMode(productId, priceMode) {
    const items = tab.items.map((i) =>
      i.productId === productId ? { ...i, priceMode } : i
    );
    updateTab(tab.id, { items });
  }

  function removeItem(productId) {
    updateTab(tab.id, { items: tab.items.filter((i) => i.productId !== productId) });
  }

  function selectCustomer(c) {
    if (!c) {
      updateTab(tab.id, {
        customerId: null,
        customerName: '',
        customerQuery: '',
        customerOutstanding: 0,
        customerAdvance: 0
      });
      return;
    }
    updateTab(tab.id, {
      customerId: c.id,
      customerName: c.name,
      customerQuery: c.name,
      customerOutstanding: c.outstanding || 0,
      customerAdvance: c.advance || 0
    });
  }

  const rateOf = (item) => {
    if (item.rateOverride != null && item.rateOverride !== '') return Number(item.rateOverride);
    return item.priceMode === 'retail' ? item.retailPrice : item.wholesalePrice;
  };
  const itemAmount = (item) => roundMoney(rateOf(item) * item.quantity);

  const subtotal = useMemo(
    () => roundMoney((tab?.items || []).reduce((s, i) => s + itemAmount(i), 0)),
    [tab?.items]
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
    if (String(tab.amountReceived ?? '') !== next) {
      updateTab(tab.id, { amountReceived: next });
    }
  }, [billTotal, tab?.id, tab?.amountEdited]);

  async function saveBill() {
    if (!tab.items.length) {
      showToast('Add at least one product', 'error');
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const result = await api.invoices.save({
        billingMode: 'auto',
        customerId: tab.customerId,
        customerName: tab.customerName,
        discount: discountVal,
        amountReceived: received,
        treatExcessAsAdvance: tab.treatExcessAsAdvance,
        notes: tab.notes,
        items: tab.items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          priceMode: i.priceMode === 'retail' ? 'retail' : 'wholesale',
          unitPrice: i.rateOverride != null && i.rateOverride !== '' ? Number(i.rateOverride) : undefined
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

  function onSearchKey(e) {
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
      const listNow = suggestionsRef.current || [];
      const hi = highlightRef.current;
      const product = (hi >= 0 && listNow[hi]) || listNow[0] || pendingProduct;
      if (product) selectProductForEntry(product);
    } else if (e.key === 'Escape') {
      setShowSug(false);
      setHighlight(-1);
    }
  }

  if (!tab) return null;
  const invoiceDate = new Date().toLocaleDateString('en-GB');

  return (
    <div className="flex flex-col h-full bg-[#eef2f7]">
      {/* Multi-bill tabs */}
      <div className="tab-bar shrink-0 bg-[#e8eef5]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab ${t.id === activeId ? 'active' : ''}`}
            onClick={() => setActiveId(t.id)}
          >
            <span className="truncate">
              {t.invoiceNo || 'New bill'}
              {t.items?.length ? ` · ${t.items.length}` : ''}
            </span>
            {tabs.length > 1 && (
              <span className="close" onClick={(e) => closeTab(t.id, e)}>
                <X size={12} />
              </span>
            )}
          </button>
        ))}
        <button
          type="button"
          className="ml-1 px-2.5 py-1.5 text-slate-500 hover:text-blue-600 self-center rounded-lg hover:bg-white/80"
          title="New bill (Ctrl+T / F8)"
          onClick={addTab}
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* LEFT: bill workspace */}
        <div className="flex-1 min-w-0 overflow-auto px-3 py-2">
          {/* Meta row: Customer / Date / Bill No */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
            <div>
              <label className="block text-[11px] font-bold text-black mb-0.5">Customer</label>
              <div className="relative">
                <input
                  type="text"
                  className="field bg-white"
                  placeholder="Search name or phone…"
                  value={tab.customerQuery != null ? tab.customerQuery : tab.customerName || ''}
                  onChange={(e) => {
                    updateTab(tab.id, {
                      customerQuery: e.target.value,
                      customerId: null,
                      customerName: '',
                      customerOutstanding: 0,
                      customerAdvance: 0
                    });
                    setShowCust(true);
                  }}
                  onFocus={() => setShowCust(true)}
                  onBlur={() => setTimeout(() => setShowCust(false), 180)}
                />
                {showCust && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-auto">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 border-b"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectCustomer(null);
                        setShowCust(false);
                      }}
                    >
                      Walk-in / none
                    </button>
                    {customers
                      .filter((c) => {
                        const q = (tab.customerQuery || '').trim().toLowerCase();
                        if (!q) return true;
                        return (
                          (c.name || '').toLowerCase().includes(q) ||
                          (c.phone || '').toLowerCase().includes(q)
                        );
                      })
                      .slice(0, 15)
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-slate-50 last:border-0"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectCustomer(c);
                            setShowCust(false);
                          }}
                        >
                          <div className="font-medium">{c.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {c.phone || '—'}
                            {c.outstanding > 0 ? ` · due ${formatINR(c.outstanding)}` : ''}
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-black mb-0.5">Bill date</label>
              <input className="field bg-white" value={invoiceDate} readOnly />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-black mb-0.5">Bill no.</label>
              <input
                className="field bg-slate-50 font-mono font-semibold text-slate-700"
                value={tab.invoiceNo || '…'}
                readOnly
              />
            </div>
          </div>

          {/* Product entry row — Product | Qty | Rate | W/R | Add Item */}
          <div className="mb-2 relative">
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 md:col-span-5 relative">
                <label className="block text-[11px] font-bold text-black mb-0.5">Product</label>
                <div className="relative">
                  <input
                    ref={searchRef}
                    value={tab.search}
                    onChange={(e) => {
                      updateTab(tab.id, { search: e.target.value });
                      setShowSug(true);
                      setPendingRate('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        addFromBar();
                        return;
                      }
                      onSearchKey(e);
                    }}
                    onFocus={async () => {
                      setShowSug(true);
                      try {
                        const list = await api.products.search((tab.search || '').trim());
                        const rows = Array.isArray(list) ? list.slice(0, 20) : [];
                        setSuggestions(rows);
                        setHighlight(rows.length ? 0 : -1);
                      } catch (_) {}
                    }}
                    onBlur={() => setTimeout(() => setShowSug(false), 180)}
                    placeholder="Search product by name, code or barcode…"
                    className="field bg-white pr-9 h-[38px] text-slate-900"
                    autoFocus
                  />
                  <Search
                    size={15}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>
              <div className="col-span-4 md:col-span-2">
                <label className="block text-[11px] font-bold text-black mb-0.5">Qty</label>
                <input
                  ref={qtyRef}
                  type="number"
                  min="0"
                  step="1"
                  value={pendingQty}
                  onChange={(e) => setPendingQty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addFromBar();
                    }
                  }}
                  className="field bg-white text-black h-[38px] text-center"
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <label className="block text-[11px] font-bold text-black mb-0.5">Rate (₹)</label>
                <input
                  ref={rateRef}
                  type="number"
                  min="0"
                  step="0.01"
                  value={pendingRate}
                  onChange={(e) => setPendingRate(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addFromBar();
                    }
                  }}
                  placeholder="Auto"
                  className="field bg-white text-black h-[38px] text-right"
                />
              </div>
              <div className="col-span-4 md:col-span-1">
                <label className="block text-[11px] font-bold text-black mb-0.5">W / R</label>
                <div className="flex rounded-md border border-slate-200 overflow-hidden h-[38px]">
                  <button
                    type="button"
                    onClick={() => setPendingMode('wholesale')}
                    className={`flex-1 text-xs font-bold ${pendingMode !== 'retail' ? 'bg-[#1d4ed8] text-white' : 'bg-white text-black'}`}
                  >
                    W
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingMode('retail')}
                    className={`flex-1 text-xs font-bold border-l border-slate-200 ${pendingMode === 'retail' ? 'bg-[#1d4ed8] text-white' : 'bg-white text-black'}`}
                  >
                    R
                  </button>
                </div>
              </div>
              <div className="col-span-12 md:col-span-2">
                <label className="block text-[11px] font-bold text-transparent mb-0.5 select-none">Add</label>
                <button
                  type="button"
                  onClick={addFromBar}
                  className="btn btn-primary w-full h-[38px] font-semibold"
                >
                  Add Item
                </button>
              </div>
            </div>

            {showSug && (
              <div className="absolute left-0 right-0 md:right-[42%] top-full z-40 pt-1">
                <div
                  ref={listBoxRef}
                  className="bg-white border border-slate-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto ring-1 ring-black/5"
                  role="listbox"
                >
                  {suggestions.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-slate-500 text-center">
                      {(tab.search || '').trim()
                        ? 'No products match'
                        : 'Type a product name or code'}
                    </div>
                  ) : (
                    suggestions.map((p, idx) => (
                      <button
                        key={p.id}
                        type="button"
                        data-sug-idx={idx}
                        role="option"
                        aria-selected={idx === highlight}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectProductForEntry(p);
                        }}
                        onMouseEnter={() => {
                          setHighlight(idx);
                          setPendingRate(
                            String(
                              pendingMode === 'retail' ? p.retailPrice : p.wholesalePrice
                            )
                          );
                        }}
                        className={`w-full text-left px-3 py-2 text-sm flex justify-between gap-3 border-b border-slate-50 last:border-0 ${
                          idx === highlight
                            ? 'bg-blue-100 ring-1 ring-inset ring-blue-200'
                            : 'hover:bg-blue-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{p.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {p.productCode || '—'}
                          </div>
                        </div>
                        <div className="text-right text-xs text-slate-700 shrink-0">
                          <div>
                            Stock <strong className="text-slate-900">{p.currentStock}</strong>
                          </div>
                          <div className="text-slate-600">
                            W {formatINR(p.wholesalePrice)} · R {formatINR(p.retailPrice)}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Items table */}
          <div className="soft-card overflow-hidden mb-2">
            <table className="pos-table text-slate-900" style={{ border: 'none' }}>
              <thead>
                <tr>
                  <th className="">Product</th>
                  <th className="">Code</th>
                  <th className="text-right num">Stock</th>
                  <th className="text-center">W / R</th>
                  <th className="text-center">Qty</th>
                  <th className="text-right num">Rate (₹)</th>
                  <th className="text-right num">Amount (₹)</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {tab.items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-slate-400 py-12">
                      Search and add products to this bill
                    </td>
                  </tr>
                ) : (
                  tab.items.map((item) => (
                    <tr key={item.productId}>
                      <td className="font-semibold text-black">{item.productName}</td>
                      <td className="text-xs font-mono text-black">{item.productCode || '—'}</td>
                      <td className="text-right num text-black">{item.stock}</td>
                      <td className="text-center">
                        <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
                          <button
                            type="button"
                            title="Wholesale"
                            onClick={() => setLineMode(item.productId, 'wholesale')}
                            className={`px-2.5 py-1 ${
                              item.priceMode !== 'retail'
                                ? 'bg-[#1d4ed8] text-white'
                                : 'bg-white text-black hover:bg-slate-50'
                            }`}
                          >
                            W
                          </button>
                          <button
                            type="button"
                            title="Retail"
                            onClick={() => setLineMode(item.productId, 'retail')}
                            className={`px-2.5 py-1 border-l border-slate-200 ${
                              item.priceMode === 'retail'
                                ? 'bg-[#1d4ed8] text-white'
                                : 'bg-white text-black hover:bg-slate-50'
                            }`}
                          >
                            R
                          </button>
                        </div>
                      </td>
                      <td className="text-center">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => updateQty(item.productId, e.target.value)}
                          className="w-12 text-center field py-0.5 mx-auto"
                        />
                      </td>
                      <td className="text-right num font-medium">{formatINR(rateOf(item))}</td>
                      <td className="text-right num font-semibold">{formatINR(itemAmount(item))}</td>
                      <td className="text-center">
                        <button
                          type="button"
                          title="Remove"
                          onClick={() => removeItem(item.productId)}
                          className="inline-flex p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>


          <div className="mb-2">
            <label className="block text-[11px] font-bold text-black mb-0.5">Notes</label>
            <textarea
              className="field bg-white min-h-[64px] resize-y"
              placeholder="Thank you for your business!"
              value={tab.notes || ''}
              onChange={(e) => updateTab(tab.id, { notes: e.target.value })}
            />
          </div>
          <p className="text-[10px] text-black/45 pb-2">
            F8 / Ctrl+T new tab · Enter adds product · Ctrl+S save · F11 full screen · W/R per line
          </p>
        </div>

        {/* RIGHT: full-height money panel */}
        <aside className="w-[300px] xl:w-[320px] shrink-0 border-l border-[#cbd5e1] bg-white flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-[#cbd5e1] bg-[#dbe7f8]">
            <div className="text-[11px] font-bold text-black uppercase tracking-wide">Bill summary</div>
            <div className="text-xs text-black/70 font-medium truncate">{tab.invoiceNo || 'New bill'}</div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="totals-card border-0 rounded-none shadow-none">
              <div className="t-row">
                <span className="t-label">Discount</span>
                <input
                  type="number"
                  min="0"
                  value={tab.discount}
                  onChange={(e) =>
                    updateTab(tab.id, { discount: e.target.value, amountEdited: false })
                  }
                  className="field rounded-md"
                />
              </div>
              <div className="t-row">
                <span className="t-label">Total</span>
                <span className="t-value">{formatINR(billTotal)}</span>
              </div>
              {tab.customerId ? (
                <div className="t-row">
                  <span className="t-label">Previous balance</span>
                  <span className="t-value">{formatINR(previousBalance)}</span>
                </div>
              ) : (
                <div className="t-row">
                  <span className="t-label">Previous balance</span>
                  <span className="t-value">—</span>
                </div>
              )}
              <div className="t-row t-grand">
                <span className="t-label">Grand total</span>
                <span className="t-value">{formatINR(grandTotal)}</span>
              </div>
              <div className="t-row">
                <span className="t-label">Amount paying now</span>
                <input
                  type="number"
                  min="0"
                  value={tab.amountReceived}
                  onChange={(e) =>
                    updateTab(tab.id, {
                      amountReceived: e.target.value,
                      amountEdited: true
                    })
                  }
                  className="field"
                />
              </div>
              <div className="t-row">
                <span className="t-label">Still due on this bill</span>
                <span className="t-value">{formatINR(stillDue)}</span>
              </div>
              {excess > 0 && (
                <div className="t-row">
                  <label className="flex items-center gap-2 text-xs text-black font-medium">
                    <input
                      type="checkbox"
                      checked={tab.treatExcessAsAdvance}
                      onChange={(e) =>
                        updateTab(tab.id, { treatExcessAsAdvance: e.target.checked })
                      }
                    />
                    Extra {formatINR(excess)} as advance
                  </label>
                </div>
              )}
            </div>
          </div>
          <div className="p-3 border-t border-[#cbd5e1] space-y-2 bg-[#f8fafc]">
            <button
              type="button"
              className="btn btn-primary w-full py-2.5"
              onClick={saveBill}
              disabled={saving || !tab.items.length}
            >
              <Save size={15} /> Save Bill
            </button>
            <button
              type="button"
              className="btn btn-ghost w-full"
              onClick={() =>
                showToast(
                  'Printer: install in Windows first — see docs/PRINTER_SETUP.md',
                  'info'
                )
              }
            >
              <Printer size={15} /> Print Preview
            </button>
            <p className="text-[10px] text-black/50 text-center leading-snug">
              F8 / Ctrl+T new tab · F11 full screen · Ctrl+S save
            </p>
          </div>
        </aside>

      </div>
    </div>
  );
}
