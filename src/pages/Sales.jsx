import { useState, useEffect, useCallback } from 'react';
import { Eye, Search } from 'lucide-react';
import DateRangeFilter from '../components/DateRangeFilter';
import { api } from '../utils/api';
import { formatINR } from '../utils/money';
import { rangePreset, dayStart, dayEnd } from '../utils/dateRange';

const initialRange = rangePreset('month');

export default function Sales({ showToast }) {
  const [rows, setRows] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('');
  const [detail, setDetail] = useState(null);
  const [datePreset, setDatePreset] = useState(initialRange.id);
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);

  const load = useCallback(async () => {
    try {
      setRows(
        await api.invoices.list({
          customerSearch: customerSearch.trim() || undefined,
          search: search.trim() || undefined,
          mode: mode || undefined,
          fromDate: fromDate ? dayStart(fromDate) : undefined,
          toDate: toDate ? dayEnd(toDate) : undefined
        })
      );
    } catch (e) {
      showToast(e.message, 'error');
    }
  }, [customerSearch, search, mode, fromDate, toDate, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const open = async (id) => {
    try {
      setDetail(await api.invoices.get(id));
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  function onDateChange({ preset, from, to }) {
    setDatePreset(preset);
    setFromDate(from || '');
    setToDate(to || '');
  }

  return (
    <div className="flex flex-col h-full">
      <div className="page-toolbar">
        <h1>Sales History</h1>
        <div className="search-field" style={{ maxWidth: 180, flex: '1 1 140px' }}>
          <input
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            placeholder="Customer…"
          />
          <Search size={15} className="search-ico" />
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
                      <td>{it.productName}</td>
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
