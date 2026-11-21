import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import PageToolbar from '../components/PageToolbar';
import { api } from '../utils/api';
import { formatINR } from '../utils/money';

export default function PersonalPricing({ showToast }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ customerId: '', productId: '', price: '' });

  const load = useCallback(async () => {
    try {
      setRows(await api.personalPrices.list({ search: search || undefined }));
    } catch (e) {
      showToast(e.message, 'error');
    }
  }, [search, showToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.customers.list({ activeOnly: true }).then(setCustomers).catch(() => {});
    api.products.list({ activeOnly: true }).then(setProducts).catch(() => {});
  }, []);

  async function save() {
    if (!form.customerId || !form.productId) {
      showToast('Select customer and product', 'error');
      return;
    }
    if (form.price === '' || Number.isNaN(Number(form.price)) || Number(form.price) < 0) {
      showToast('Enter a valid price', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.personalPrices.upsert({
        customerId: Number(form.customerId),
        productId: Number(form.productId),
        price: Number(form.price)
      });
      showToast('Personal price saved', 'success');
      setModal(false);
      setForm({ customerId: '', productId: '', price: '' });
      load();
    } catch (e) {
      showToast(e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm('Remove this personal price?')) return;
    try {
      await api.personalPrices.delete(id);
      showToast('Removed', 'success');
      load();
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  return (
    <div className="flex flex-col h-full">
      <PageToolbar title="Personal Pricing" search={search} onSearchChange={setSearch} searchPlaceholder="Customer or product…">
        <button type="button" className="btn btn-primary ml-auto" onClick={() => setModal(true)}>
          <Plus size={15} /> Add price
        </button>
      </PageToolbar>
      <div className="flex-1 overflow-auto px-4 py-2">
        <div className="pos-table-wrap">
          <table className="pos-table">
            <thead>
              <tr>
                <th className="text-center" style={{ width: 40 }}>#</th>
                <th>Customer</th>
                <th>Product</th>
                <th className="text-right">Personal price (₹)</th>
                <th className="text-center" style={{ width: 48 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.id}>
                  <td className="text-center text-slate-500 font-medium">{idx + 1}</td>
                  <td className="font-medium text-black">{r.customerName}</td>
                  <td className="text-black">{r.productName}</td>
                  <td className="text-right font-semibold tabular-nums">{formatINR(r.price)}</td>
                  <td className="text-center">
                    <button type="button" className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50" title="Remove" onClick={() => remove(r.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={5} className="text-center text-slate-400 py-10">
                    No personal prices yet. Assign special rates for specific customers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-slate-100">
              <h2 className="font-semibold text-black">Add personal price</h2>
              <p className="text-xs text-slate-500 mt-0.5">Special selling price for one customer + product</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Customer *</label>
                <select className="field mt-1" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                  <option value="">Select customer…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Product *</label>
                <select className="field mt-1" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                  <option value="">Select product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Price (₹) *</label>
                <input type="number" min="0" step="0.01" className="field mt-1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
