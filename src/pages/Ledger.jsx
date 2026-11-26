import { useState, useEffect, useRef, useMemo } from 'react';
import DateRangeFilter from '../components/DateRangeFilter';
import { api } from '../utils/api';
import { formatINR } from '../utils/money';
import { rangePreset, isInRange } from '../utils/dateRange';

/**
 * Customer Ledger — view only.
 * Record payment lives on Customers (Receive payment / F9).
 */
export default function Ledger({ showToast }) {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [showCustList, setShowCustList] = useState(false);
  const [custHighlight, setCustHighlight] = useState(0);
  const [entries, setEntries] = useState([]);
  const [customer, setCustomer] = useState(null);
  const initialRange = rangePreset('all');
  const [datePreset, setDatePreset] = useState(initialRange.id);
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  const custInputRef = useRef(null);

  useEffect(() => {
    api.customers.list({ activeOnly: true }).then(setCustomers).catch(() => {});
  }, []);

  useEffect(() => {
    if (!customerId) {
      setEntries([]);
      setCustomer(null);
      return;
    }
    Promise.all([
      api.customers.get(Number(customerId)),
      api.customers.ledger(Number(customerId), 100)
    ])
      .then(([c, led]) => {
        setCustomer(c);
        setEntries(led);
      })
      .catch((e) => showToast(e.message, 'error'));
  }, [customerId, showToast]);

  const q = (customerQuery || '').trim().toLowerCase();
  const matches = customers
    .filter((c) => {
      if (!q) return true;
      return (c.name || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q);
    })
    .slice(0, 20);

  const filteredEntries = useMemo(
    () => entries.filter((e) => isInRange(e.entryDate || e.createdAt || e.date, fromDate || '', toDate || '')),
    [entries, fromDate, toDate]
  );

  function onDateChange({ preset, from, to }) {
    setDatePreset(preset);
    setFromDate(from || '');
    setToDate(to || '');
  }

  function selectCustomer(c) {
    if (!c) {
      setCustomerId('');
      setCustomerQuery('');
      setCustomer(null);
      setEntries([]);
      return;
    }
    setCustomerId(String(c.id));
    setCustomerQuery(c.name || '');
    setShowCustList(false);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="page-toolbar">
        <h1>Customer Ledger</h1>
        <div className="relative w-64">
          <input
            ref={custInputRef}
            type="text"
            className="field bg-white w-full"
            placeholder="Search customer…"
            value={customerQuery}
            onChange={(e) => {
              setCustomerQuery(e.target.value);
              setCustomerId('');
              setCustomer(null);
              setEntries([]);
              setShowCustList(true);
              setCustHighlight(0);
            }}
            onFocus={() => {
              setShowCustList(true);
              setCustHighlight(0);
            }}
            onBlur={() => setTimeout(() => setShowCustList(false), 160)}
            onKeyDown={(e) => {
              if (!showCustList && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                setShowCustList(true);
                e.preventDefault();
                return;
              }
              if (!showCustList) return;
              const max = Math.max(0, matches.length - 1);
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setCustHighlight((h) => Math.min(h + 1, max));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCustHighlight((h) => Math.max(h - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                const c = matches[custHighlight] || matches[0];
                if (c) selectCustomer(c);
              } else if (e.key === 'Escape') {
                setShowCustList(false);
              }
            }}
          />
          {showCustList && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-auto">
              {matches.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-500">No customers match</div>
              ) : (
                matches.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm border-b border-slate-50 last:border-0 ${
                      i === custHighlight ? 'bg-blue-100' : 'hover:bg-blue-50'
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectCustomer(c);
                    }}
                    onMouseEnter={() => setCustHighlight(i)}
                  >
                    <div className="font-medium text-black">{c.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {c.phone || '—'}
                      {c.outstanding > 0 ? ` · Old Balance ${formatINR(c.outstanding)}` : ''}
                      {c.advance > 0 ? ` · Advance ${formatINR(c.advance)}` : ''}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {customer && (
          <>
            <span className="badge badge-amber">Old Balance {formatINR(customer.outstanding)}</span>
            <span className="badge badge-green">Advance {formatINR(customer.advance)}</span>
          </>
        )}
      </div>
      {customerId && (
        <div className="px-4 py-2 border-b border-slate-200 bg-white shrink-0 flex flex-wrap items-center gap-2">
          <DateRangeFilter preset={datePreset} from={fromDate} to={toDate} onChange={onDateChange} />
          <span className="text-[11px] text-slate-400 ml-auto">{filteredEntries.length} entr{filteredEntries.length === 1 ? 'y' : 'ies'}</span>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        {!customerId ? (
          <div className="text-center text-slate-400 py-16 text-sm">Search and select a customer to view ledger</div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="pos-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th className="text-right num">Amount (₹)</th>
                  <th className="text-right num">Balance (₹)</th>
                  <th>Reference</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((e) => (
                  <tr key={e.id}>
                    <td className="text-slate-600 text-xs whitespace-nowrap">
                      {e.createdAt || e.entryDate || e.date || '—'}
                    </td>
                    <td className="font-medium text-black capitalize">{(e.entryType || e.type || '—').replace(/_/g, ' ')}</td>
                    <td className="text-right num font-semibold">{formatINR(e.amount)}</td>
                    <td className="text-right num text-slate-600">{formatINR(e.balanceAfter ?? e.balance)}</td>
                    <td className="text-xs text-slate-500">{e.reference || e.referenceType || '—'}</td>
                    <td className="text-xs text-slate-500 max-w-[200px] truncate">{e.notes || '—'}</td>
                  </tr>
                ))}
                {!filteredEntries.length && (
                  <tr>
                    <td colSpan={6} className="text-center text-slate-400 py-10">
                      No ledger entries
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
