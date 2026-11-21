import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import PageToolbar from '../components/PageToolbar';
import { api } from '../utils/api';
import { formatINR } from '../utils/money';

export default function PersonalPricing({ showToast }) {
  const [list, setList] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [productId, setProductId] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterCust, setFilterCust] = useState('');

  const load = useCallback(async () => {
    try {
      const [pp, cust, prod] = await Promise.all([
        api.personalPrices.list(),
        api.customers.list({ activeOnly: true }),
        api.products.list({ activeOnly: true })
      ]);
      setList(Array.isArray(pp) ? pp : []);
      setCustomers(Array.isArray(cust) ? cust : []);
      setProducts(Array.isArray(prod) ? prod : []);
    } catch (e) {
      showToast?.(e.message || 'Could not load personal prices', 'error');
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  async function addPrice() {
    const cid = Number(customerId);
    const pid = Number(productId);
    const p = Number(price);
    if (!cid || !pid) { showToast?.('Select customer and product', 'error'); return; }
    if (!(p >= 0)) { showToast?.('Enter a valid price', 'error'); return; }
    setSaving(true);
    try {
      await api.personalPrices.upsert({ customerId: cid, productId: pid, price: p });
      setPrice('');
      setProductId('');
      await load();
      showToast?.('Personal price saved', 'success');
    } catch (e) {
      showToast?.(e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!id) return;
    try {
      await api.personalPrices.remove(id);
      await load();
      showToast?.('Removed', 'success');
    } catch (e) {
      showToast?.(e.message || 'Remove failed', 'error');
    }
  }

  const filtered = filterCust
    ? list.filter((r) => String(r.customerId) === String(filterCust) || (r.customerName || '').toLowerCase().includes(filterCust.toLowerCase()))
    : list;

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#eef2f7]">
      <PageToolbar title="Personal Pricing" subtitle="Customer-specific rates used automatically in Billing" />
      <div className="flex-1 min-h-0 overflow-auto p-3 space-y-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Add / update rate</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
            <div>
              <label className="block text-[11px] font-bold text-black mb-0.5">Customer</label>
              <select className="field bg-white" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-black mb-0.5">Product</label>
              <select className="field bg-white" value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-black mb-0.5">Special price (₹)</label>
              <input type="number" min="0" step="0.01" className="field bg-white" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
            </div>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={addPrice}>
              <Plus size={15} /> Save rate
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wide flex-1">Saved rates</div>
            <input className="field bg-white max-w-[220px]" placeholder="Filter by customer" value={filterCust} onChange={(e) => setFilterCust(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2 text-right">Price</th>
                  <th className="px-3 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400">No personal prices yet</td></tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{r.customerName || r.customerId}</td>
                    <td className="px-3 py-2">{r.productName || r.productId}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatINR(r.price)}</td>
                    <td className="px-3 py-2">
                      <button type="button" className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => remove(r.id)} title="Remove">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
