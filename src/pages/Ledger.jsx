import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { formatINR } from '../utils/money';

export default function Ledger({ showToast }) {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [entries, setEntries] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [payAmt, setPayAmt] = useState('');
  const [payNotes, setPayNotes] = useState('');

  useEffect(() => { api.customers.list().then(setCustomers).catch(() => {}); }, []);

  useEffect(() => {
    if (!customerId) { setEntries([]); setCustomer(null); return; }
    Promise.all([
      api.customers.get(Number(customerId)),
      api.customers.ledger(Number(customerId), 100)
    ]).then(([c, led]) => { setCustomer(c); setEntries(led); }).catch((e) => showToast(e.message, 'error'));
  }, [customerId, showToast]);

  const collect = async () => {
    try {
      const res = await api.customers.collectPayment({ customerId: Number(customerId), amount: Number(payAmt), notes: payNotes });
      showToast(`Payment recorded · outstanding ${formatINR(res.outstanding)}`, 'success');
      setPayAmt(''); setPayNotes('');
      const [c, led] = await Promise.all([api.customers.get(Number(customerId)), api.customers.ledger(Number(customerId), 100)]);
      setCustomer(c); setEntries(led);
    } catch (e) { showToast(e.message, 'error'); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="page-toolbar">
        <h1>Customer Ledger</h1>
        <select className="field w-64" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">Select customer…</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {customer && (
          <>
            <span className="badge badge-amber">Outstanding {formatINR(customer.outstanding)}</span>
            <span className="badge badge-green">Advance {formatINR(customer.advance)}</span>
          </>
        )}
      </div>
      {customer && (
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-wrap items-end gap-3 shrink-0">
          <div>
            <label className="text-xs text-slate-500">Collect payment ₹</label>
            <input type="number" className="field w-32 mt-1" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500">Notes</label>
            <input className="field w-48 mt-1" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={collect} disabled={!payAmt}>Record payment</button>
        </div>
      )}
      <div className="flex-1 overflow-auto px-4 py-2">
        <div className="pos-table-wrap"><table className="pos-table">
          <thead><tr><th>Date</th><th>Type</th><th>Notes</th><th className="text-right">Amount</th><th className="text-right">Balance</th></tr></thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="text-xs text-slate-500">{e.entryDate}</td>
                <td><span className="badge badge-slate">{e.entryType}</span></td>
                <td className="text-slate-600">{e.notes || '—'}</td>
                <td className={`text-right font-medium ${e.amount < 0 ? 'text-emerald-700' : 'text-slate-800'}`}>{formatINR(e.amount)}</td>
                <td className="text-right">{formatINR(e.balanceAfter)}</td>
              </tr>
            ))}
            {!entries.length && <tr><td colSpan={5} className="text-center text-slate-400 py-10">{customerId ? 'No ledger entries' : 'Select a customer'}</td></tr>}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
