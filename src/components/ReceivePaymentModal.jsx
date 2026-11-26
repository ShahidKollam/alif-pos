import { useState, useEffect, useRef } from 'react';
import { X, IndianRupee } from 'lucide-react';
import { api } from '../utils/api';
import { formatINR } from '../utils/money';

/**
 * Global “Record payment” modal — receive payment against a customer account.
 * Opened from Sidebar; uses existing customers.collectPayment.
 */
export default function ReceivePaymentModal({ open, showToast, onClose, onSaved }) {
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState('');
  const [showList, setShowList] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [selected, setSelected] = useState(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const amountRef = useRef(null);
  const custInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSelected(null);
    setAmount('');
    setNotes('');
    setShowList(false);
    setHighlight(0);
    setSaving(false);
    api.customers.list({ activeOnly: true }).then(setCustomers).catch(() => setCustomers([]));
    const t = setTimeout(() => custInputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const q = (query || '').trim().toLowerCase();
  const matches = customers.filter((c) => {
    if (!q) return true;
    return (c.name || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q);
  }).slice(0, 20);

  function pickCustomer(c) {
    setSelected(c);
    setQuery(c.name || '');
    setShowList(false);
    setTimeout(() => amountRef.current?.focus(), 40);
  }

  function clearCustomer() {
    setSelected(null);
    setQuery('');
    setShowList(true);
    custInputRef.current?.focus();
  }

  async function save() {
    if (!selected?.id) {
      showToast('Select a customer', 'error');
      custInputRef.current?.focus();
      return;
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      showToast('Enter a valid payment amount', 'error');
      amountRef.current?.focus();
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const res = await api.customers.collectPayment({
        customerId: selected.id,
        amount: amt,
        notes: (notes || '').trim() || 'Payment collection'
      });
      showToast(
        `Payment recorded · ${selected.name} · outstanding ${formatINR(res.outstanding ?? res.customerOutstanding ?? 0)}`,
        'success'
      );
      onSaved?.(res, selected);
      onClose();
    } catch (e) {
      showToast(e.message || 'Could not record payment', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <IndianRupee size={16} />
            </span>
            <div>
              <div className="font-bold text-black text-[15px]">Record payment</div>
              <div className="text-[11px] text-slate-500">Receive payment against customer account</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Close">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold text-black mb-0.5">Customer</label>
            <div className="relative">
              <input
                ref={custInputRef}
                type="text"
                className="field bg-white"
                placeholder="Search name or phone…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(null);
                  setShowList(true);
                  setHighlight(0);
                }}
                onFocus={() => setShowList(true)}
                onBlur={() => setTimeout(() => setShowList(false), 160)}
                onKeyDown={(e) => {
                  if (!showList && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                    setShowList(true);
                    e.preventDefault();
                    return;
                  }
                  if (!showList) return;
                  const max = Math.max(0, matches.length - 1);
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setHighlight((h) => Math.min(h + 1, max));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setHighlight((h) => Math.max(h - 1, 0));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const c = matches[highlight] || matches[0];
                    if (c) pickCustomer(c);
                  } else if (e.key === 'Escape') {
                    setShowList(false);
                  }
                }}
              />
              {showList && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-auto">
                  {matches.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-500">No customers match</div>
                  ) : (
                    matches.map((c, i) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm border-b border-slate-50 last:border-0 ${
                          i === highlight ? 'bg-blue-100' : 'hover:bg-blue-50'
                        }`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          pickCustomer(c);
                        }}
                        onMouseEnter={() => setHighlight(i)}
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
            {selected && (
              <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                <span className="badge badge-amber">Old Balance {formatINR(selected.outstanding || 0)}</span>
                <span className="badge badge-green">Advance {formatINR(selected.advance || 0)}</span>
                <button type="button" className="text-[11px] text-blue-700 font-semibold hover:underline" onClick={clearCustomer}>
                  Change
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-black mb-0.5">Amount (₹)</label>
            <input
              ref={amountRef}
              type="number"
              min="0.01"
              step="0.01"
              className="field bg-white"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  save();
                }
              }}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-black mb-0.5">Notes</label>
            <input
              type="text"
              className="field bg-white"
              placeholder="Optional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  save();
                }
              }}
            />
          </div>
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving || !selected || !amount}>
            {saving ? 'Saving…' : 'Record payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
