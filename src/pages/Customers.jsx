import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, X, Banknote } from 'lucide-react';
import PageToolbar from '../components/PageToolbar';
import { api } from '../utils/api';
import { formatINR } from '../utils/money';

const empty = { name: '', phone: '', address: '', outstanding: '', advance: '' };

export default function Customers({ showToast }) {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [paySearch, setPaySearch] = useState('');
  const [payCustomer, setPayCustomer] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payBusy, setPayBusy] = useState(false);

  const load = useCallback(async () => {
    try { setList(await api.customers.list({ search: search || undefined })); }
    catch (e) { showToast(e.message, 'error'); }
  }, [search, showToast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const open = () => { setForm(empty); setModal('add'); };
    window.addEventListener('alif:open-add-customer', open);
    return () => window.removeEventListener('alif:open-add-customer', open);
  }, []);

  const save = async () => {
    if (!form.name.trim()) { showToast('Name required', 'error'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name, phone: form.phone, address: form.address, outstanding: Number(form.outstanding) || 0, advance: Number(form.advance) || 0 };
      if (modal === 'add') await api.customers.create(payload);
      else await api.customers.update(modal.id, payload);
      showToast('Saved', 'success');
      setModal(null);
      load();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const openPay = (c) => {
    setPayCustomer(c || null);
    setPaySearch(c ? c.name : '');
    setPayAmount(c && c.outstanding > 0 ? String(c.outstanding) : '');
    setPayNotes('');
    setPayOpen(true);
  };

  const filteredForPay = list.filter((c) => {
    const q = paySearch.trim().toLowerCase();
    if (!q) return true;
    return (c.name || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q);
  });

  const submitPay = async () => {
    if (!payCustomer) { showToast('Select a customer', 'error'); return; }
    const amt = Number(payAmount);
    if (!amt || amt <= 0) { showToast('Enter a valid payment amount', 'error'); return; }
    setPayBusy(true);
    try {
      const res = await api.customers.collectPayment({ customerId: payCustomer.id, amount: amt, notes: payNotes || 'Old Balance payment' });
      showToast(`Payment recorded · Old Balance now ${formatINR(res.outstanding)}`, 'success');
      setPayOpen(false); setPayCustomer(null); setPaySearch(''); setPayAmount(''); load();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setPayBusy(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <PageToolbar title="Customers" search={search} onSearchChange={setSearch} searchPlaceholder="Search name or phone…">
        <button type="button" className="btn btn-ghost" onClick={() => openPay(null)}><Banknote size={15} /> Receive payment</button>
        <button type="button" className="btn btn-primary ml-auto" onClick={() => { setForm(empty); setModal('add'); }}><Plus size={15} /> Add</button>
      </PageToolbar>
      <div className="flex-1 overflow-auto px-4 py-3">
        <div className="pos-table-wrap"><table className="pos-table">
          <thead><tr>
            <th className="text-center" style={{ width: 40 }}>#</th><th>Name</th><th>Phone</th>
            <th className="text-right num">Old Balance</th><th className="text-right num">Advance</th>
            <th className="text-center" style={{ width: 120 }}>Actions</th>
          </tr></thead>
          <tbody>
            {list.map((c, idx) => (
              <tr key={c.id}>
                <td className="text-center text-slate-500 font-medium">{idx + 1}</td>
                <td className="font-medium text-black">{c.name}</td>
                <td>{c.phone || '—'}</td>
                <td className={`text-right num font-medium ${c.outstanding > 0 ? 'text-amber-700' : ''}`}>{formatINR(c.outstanding)}</td>
                <td className="text-right num text-emerald-700">{formatINR(c.advance)}</td>
                <td className="text-center">
                  <div className="inline-flex items-center justify-center gap-1">
                    <button type="button" className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50" title="Receive payment" onClick={() => openPay(c)}><Banknote size={15} /></button>
                    <button type="button" className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50" title="Edit" onClick={() => { setForm({ name: c.name, phone: c.phone || '', address: c.address || '', outstanding: c.outstanding, advance: c.advance }); setModal(c); }}><Pencil size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={6} className="text-center text-slate-400 py-10">No customers</td></tr>}
          </tbody>
        </table></div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={() => setModal(null)}>
          <div className="bg-white rounded-[14px] shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-5 py-3 border-b"><h2 className="font-semibold">{modal === 'add' ? 'Add Customer' : 'Edit Customer'}</h2><button type="button" onClick={() => setModal(null)}><X size={16} /></button></div>
            <div className="px-5 py-4 space-y-3 text-sm">
              <div><label className="text-xs text-slate-500">Name *</label><input className="field mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></div>
              <div><label className="text-xs text-slate-500">Phone</label><input className="field mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><label className="text-xs text-slate-500">Address</label><input className="field mt-1" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              {modal === 'add' && (<>
                <div><label className="text-xs text-slate-500">Opening Old Balance ₹</label><input type="number" className="field mt-1" value={form.outstanding} onChange={(e) => setForm({ ...form, outstanding: e.target.value })} /></div>
                <div><label className="text-xs text-slate-500">Opening advance ₹</label><input type="number" className="field mt-1" value={form.advance} onChange={(e) => setForm({ ...form, advance: e.target.value })} /></div>
              </>)}
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}

      {payOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={() => setPayOpen(false)}>
          <div className="bg-white rounded-[14px] shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-5 py-3 border-b"><h2 className="font-semibold">Receive payment</h2><button type="button" onClick={() => setPayOpen(false)}><X size={16} /></button></div>
            <div className="px-5 py-4 space-y-3 text-sm">
              <p className="text-xs text-slate-500">Record money received against Old Balance — no new bill required.</p>
              <div>
                <label className="text-xs text-slate-500">Search customer (name or phone)</label>
                <input className="field mt-1" value={paySearch} onChange={(e) => { setPaySearch(e.target.value); setPayCustomer(null); }} placeholder="Type to search…" autoFocus />
                {!payCustomer && paySearch.trim() && (
                  <div className="mt-1 border border-[#e5eaf2] rounded-xl max-h-40 overflow-auto">
                    {filteredForPay.slice(0, 15).map((c) => (
                      <button key={c.id} type="button" className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-slate-50 last:border-0" onClick={() => { setPayCustomer(c); setPaySearch(c.name); setPayAmount(c.outstanding > 0 ? String(c.outstanding) : ''); }}>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-[11px] text-slate-400">{c.phone || '—'} · Old Balance {formatINR(c.outstanding)}</div>
                      </button>
                    ))}
                    {!filteredForPay.length && <div className="px-3 py-3 text-slate-400 text-center">No match</div>}
                  </div>
                )}
              </div>
              {payCustomer && (
                <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
                  <div className="font-medium text-slate-800">{payCustomer.name}</div>
                  <div className="text-xs text-amber-800 mt-0.5">Old Balance: <strong>{formatINR(payCustomer.outstanding)}</strong></div>
                </div>
              )}
              <div><label className="text-xs text-slate-500">Amount paid ₹</label><input type="number" min="0" className="field mt-1" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0" /></div>
              <div><label className="text-xs text-slate-500">Notes (optional)</label><input className="field mt-1" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="e.g. Cash / UPI" /></div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setPayOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={payBusy} onClick={submitPay}>{payBusy ? 'Saving…' : 'Record payment'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
