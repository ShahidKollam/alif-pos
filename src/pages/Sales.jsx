import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Eye, Search } from 'lucide-react';
import DateRangeFilter from '../components/DateRangeFilter';
import { api } from '../utils/api';
import { formatINR } from '../utils/money';
import { rangePreset, dayStart, dayEnd } from '../utils/dateRange';

const initialRange = rangePreset('month');

export default function Sales({ showToast }) {
  const [rows, setRows] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerId, setCustomerId] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [showCustomers, setShowCustomers] = useState(false);
  const [customerHighlight, setCustomerHighlight] = useState(0);
  const customerListRef = useRef(null);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('');
  const [detail, setDetail] = useState(null);
  const [datePreset, setDatePreset] = useState(initialRange.id);
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);

  const load = useCallback(async () => {
    try {
      let list = await api.invoices.list({
        customerId: customerId || undefined,
        search: search.trim() || undefined,
        mode: mode || undefined,
        fromDate: fromDate ? dayStart(fromDate) : undefined,
        toDate: toDate ? dayEnd(toDate) : undefined
      });
      const cq = customerSearch.trim().toLowerCase();
      if (cq && !customerId) {
        list = list.filter((r) => (r.customerName || '').toLowerCase().includes(cq));
      }
      setRows(list);
    } catch (e) {
      showToast(e.message, 'error');
    }
  }, [customerSearch, customerId, search, mode, fromDate, toDate, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => { api.customers.list({ activeOnly: true }).then(setCustomers).catch(() => {}); }, []);
  const customerMatches = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    return customers.filter((c) => !q || (c.name || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q)).slice(0, 20);
  }, [customers, customerSearch]);
  useEffect(() => {
    customerListRef.current?.querySelector(`[data-customer-index="${customerHighlight}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [customerHighlight]);

  const open = async (id) => {
    try {
      setDetail({ ...(await api.invoices.get(id)), productSearch: search.trim() });
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  function onDateChange({ preset, from, to }) {
    setDatePreset(preset);
    setFromDate(from || '');
    setToDate(to || '');
  }

  function highlightProductName(name, query) {
    const text = String(name || '');
    const term = String(query || '').trim();
    if (!term || !text.toLowerCase().includes(term.toLowerCase())) return text;
    const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'));
    return parts.map((part, index) => part.toLowerCase() === term.toLowerCase()
      ? <mark key={index} className="rounded bg-amber-200 px-0.5 font-semibold text-black">{part}</mark>
      : part);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="page-toolbar">
        <h1>Sales History</h1>
        <div className="search-field relative" style={{ maxWidth: 220, flex: '1 1 160px' }}>
          <input
            value={customerSearch}
            onChange={(e) => { setCustomerSearch(e.target.value); setCustomerId(null); setShowCustomers(true); setCustomerHighlight(0); }}
            onFocus={() => { setShowCustomers(true); setCustomerHighlight(0); }}
            onBlur={() => setTimeout(() => setShowCustomers(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setShowCustomers(true); setCustomerHighlight((i) => Math.min(i + 1, Math.max(0, customerMatches.length - 1))); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setShowCustomers(true); setCustomerHighlight((i) => Math.max(0, i - 1)); }
              else if (e.key === 'Enter' && showCustomers && customerMatches[customerHighlight]) { e.preventDefault(); const c = customerMatches[customerHighlight]; setCustomerSearch(c.name); setCustomerId(c.id); setShowCustomers(false); }
              else if (e.key === 'Escape') setShowCustomers(false);
            }}
            placeholder="Customer name or mobile…"
          />
          <Search size={15} className="search-ico" />
          {showCustomers && <div ref={customerListRef} className="absolute left-0 right-0 top-full mt-1 z-30 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
            {customerMatches.map((c, i) => <button key={c.id} data-customer-index={i} type="button" onMouseDown={(e) => { e.preventDefault(); setCustomerSearch(c.name); setCustomerId(c.id); setShowCustomers(false); }} onMouseEnter={() => setCustomerHighlight(i)} className={`w-full px-3 py-2 text-left border-b border-slate-100 last:border-0 ${i === customerHighlight ? 'bg-blue-50' : 'hover:bg-slate-50'}`}><span className="block text-sm font-medium text-black">{c.name}</span><span className="block text-xs text-slate-500">{c.phone || 'No mobile number'}</span></button>)}
            {!customerMatches.length && <div className="px-3 py-2 text-xs text-slate-500">No matching customer</div>}
          </div>}
        </div>
        <div className="search-field" style={{ maxWidth: 220, flex: '1 1 160px' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Invoice or product…"
          />
          <Search size={15} className="search-ico" />
        </div>
        <select className="field w-36 shrink-0" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="">All modes</option>
          <option value="wholesale">Wholesale</option>
          <option value="retail">Retail</option>
        </select>
      </div>
      <div className="px-4 py-2 border-b border-slate-200 bg-white shrink-0 flex flex-wrap items-center gap-2">
        <DateRangeFilter preset={datePreset} from={fromDate} to={toDate} onChange={onDateChange} />
        <span className="text-[11px] text-slate-400 ml-auto">
          {rows.length} bill{rows.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="flex-1 overflow-auto px-4 py-2">
        <div className="pos-table-wrap">
          <table className="pos-table">
            <thead>
              <tr>
                <th className="text-center" style={{ width: 40 }}>#</th>
                <th>Invoice</th>
                <th>Date</th>
                <th>Mode</th>
                <th>Customer</th>
                <th className="text-right">Total Amount</th>
                <th className="text-right">Paid Amount</th>
                <th className="text-right">Balance Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.id}>
                  <td className="text-center text-slate-500 font-medium">{idx + 1}</td>
                  <td className="font-mono font-medium text-black">{r.invoiceNumber}</td>
                  <td className="text-xs text-slate-500">{r.invoiceDate}</td>
                  <td>
                    <span className={`badge ${r.billingMode === 'wholesale' ? 'badge-blue' : 'badge-slate'}`}>{r.billingMode}</span>
                  </td>
                  <td>{r.customerName || '—'}</td>
                  <td className="text-right font-semibold">{formatINR(r.total)}</td>
                  <td className="text-right text-emerald-700">{formatINR(r.amountReceived)}</td>
                  <td className="text-right text-amber-700">{formatINR(r.balanceDue)}</td>
                  <td>
                    <button type="button" className="p-1 text-slate-400 hover:text-blue-600" onClick={() => open(r.id)}>
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={9} className="text-center text-slate-400 py-10">
                    No sales match these filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-5 py-3 border-b">
              <div>
                <div className="font-semibold">{detail.invoiceNumber}</div>
                <div className="text-xs text-slate-500">
                  {detail.invoiceDate} · {detail.billingMode}
                  {detail.customerName ? ` · ${detail.customerName}` : ''}
                </div>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setDetail(null)}>Close</button>
            </div>
            <div className="px-5 py-3 max-h-72 overflow-auto">
              <table className="pos-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Rate</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.items || []).map((it) => (
                    <tr key={it.id}>
                      <td>{highlightProductName(it.productName, detail.productSearch)}</td>
                      <td className="text-right">{it.quantity}</td>
                      <td className="text-right">{formatINR(it.unitPrice)}</td>
                      <td className="text-right font-medium">{formatINR(it.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t text-sm space-y-1">
              <div className="flex justify-between"><span>Bill Amount</span><strong>{formatINR(detail.total)}</strong></div>
              <div className="flex justify-between text-emerald-700"><span>Paid</span><strong>{formatINR(detail.amountReceived)}</strong></div>
              <div className="flex justify-between text-amber-700"><span>Balance</span><strong>{formatINR(detail.balanceDue)}</strong></div>
              {detail.notes ? <div className="text-xs text-slate-500 pt-1">Notes: {detail.notes}</div> : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
