import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Power, X } from 'lucide-react';
import PageToolbar from '../components/PageToolbar';
import { api } from '../utils/api';
import { formatINR } from '../utils/money';

const empty = { name: '', productCode: '', category: '', unit: 'piece', purchaseCost: '', wholesalePrice: '', retailPrice: '', openingStock: '', minStockLevel: '' };

export default function Products({ showToast }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, cats] = await Promise.all([
        api.products.list({ search: search || undefined, category: categoryFilter || undefined, activeOnly: !showInactive }),
        api.products.categories()
      ]);
      setProducts(list); setCategories(cats);
    } catch (e) { showToast(e.message || 'Failed to load', 'error'); }
    finally { setLoading(false); }
  }, [search, categoryFilter, showInactive, showToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const openAdd = () => { setForm(empty); setModal('add'); };
    window.addEventListener('alif:open-add-product', openAdd);
    return () => window.removeEventListener('alif:open-add-product', openAdd);
  }, []);

  const openEdit = (p) => {
    setForm({
      name: p.name, productCode: p.productCode || '', category: p.category || '', unit: p.unit || 'piece',
      purchaseCost: p.purchaseCost, wholesalePrice: p.wholesalePrice, retailPrice: p.retailPrice,
      openingStock: p.openingStock, minStockLevel: p.minStockLevel
    });
    setModal(p);
  };

  const save = async () => {
    if (!form.name.trim()) { showToast('Name required', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        productCode: modal === 'add' ? null : (form.productCode || null),
        category: form.category || null, unit: form.unit || 'piece',
        purchaseCost: Number(form.purchaseCost) || 0, wholesalePrice: Number(form.wholesalePrice) || 0,
        retailPrice: Number(form.retailPrice) || 0, openingStock: Number(form.openingStock) || 0, minStockLevel: Number(form.minStockLevel) || 0
      };
      if (modal === 'add') { await api.products.create(payload); showToast('Product created', 'success'); }
      else { await api.products.update(modal.id, payload); showToast('Product updated', 'success'); }
      setModal(null); load();
    } catch (e) { showToast(e.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <PageToolbar
        title="Products"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name or code…"
      >
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="field w-40">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-slate-600 whitespace-nowrap">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Inactive
        </label>
        <button type="button" onClick={() => { setForm(empty); setModal('add'); }} className="btn btn-primary ml-auto"><Plus size={15} /> Add Product</button>
      </PageToolbar>
      <div className="flex-1 overflow-auto px-4 py-2">
        <div className="pos-table-wrap"><table className="pos-table">
          <thead className="sticky top-0 z-10"><tr>
            <th className="text-center" style={{ width: 40 }}>#</th>
            <th>Name</th><th>Code</th><th>Category</th><th className="text-right">Stock</th>
            <th className="text-right">Wholesale</th><th className="text-right">Retail</th><th className="text-right">Cost</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={10} className="text-center text-slate-400 py-10">Loading…</td></tr>
              : products.length === 0 ? <tr><td colSpan={10} className="text-center text-slate-400 py-10">No products</td></tr>
              : products.map((p, idx) => (
                <tr key={p.id} className={!p.isActive ? 'opacity-50' : ''}>
                  <td className="text-center text-slate-500 font-medium">{idx + 1}</td>
                  <td className="font-medium text-black">{p.name}{p.isLowStock && <span className="badge badge-amber ml-2">Low</span>}</td>
                  <td className="font-mono text-xs text-slate-500">{p.productCode || '—'}</td>
                  <td className="text-xs text-slate-600">{p.category || '—'}</td>
                  <td className="text-right">{p.currentStock}</td>
                  <td className="text-right">{formatINR(p.wholesalePrice)}</td>
                  <td className="text-right">{formatINR(p.retailPrice)}</td>
                  <td className="text-right text-slate-500">{formatINR(p.purchaseCost)}</td>
                  <td><span className={`badge ${p.isActive ? 'badge-green' : 'badge-slate'}`}>{p.isActive ? 'Active' : 'Off'}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(p)} className="p-1 text-slate-400 hover:text-blue-600"><Pencil size={14} /></button>
                      <button onClick={async () => { await api.products.setActive(p.id, !p.isActive); load(); }} className="p-1 text-slate-400 hover:text-amber-600"><Power size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table></div>
      </div>
      {modal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={() => setModal(null)}>
          <div className="bg-white rounded-[14px] shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <h2 className="font-semibold">{modal === 'add' ? 'Add Product' : 'Edit Product'}</h2>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2"><label className="text-xs text-slate-500">Name *</label><input className="field mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></div>
              {modal !== 'add' && (
              <div><label className="text-xs text-slate-500">Code (auto)</label><input className="field mt-1 bg-slate-50" value={form.productCode} readOnly /></div>
              )}
              <div><label className="text-xs text-slate-500">Category</label><input className="field mt-1" list="cats" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /><datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist></div>
              <div><label className="text-xs text-slate-500">Unit</label>
                <select className="field mt-1" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  {['piece','box','packet','kg','litre','bottle','dozen'].map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-slate-500">Purchase cost ₹</label><input type="number" className="field mt-1" value={form.purchaseCost} onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })} /></div>
              <div><label className="text-xs text-slate-500">Wholesale ₹</label><input type="number" className="field mt-1" value={form.wholesalePrice} onChange={(e) => setForm({ ...form, wholesalePrice: e.target.value })} /></div>
              <div><label className="text-xs text-slate-500">Retail ₹</label><input type="number" className="field mt-1" value={form.retailPrice} onChange={(e) => setForm({ ...form, retailPrice: e.target.value })} /></div>
              {modal === 'add' && <div><label className="text-xs text-slate-500">Opening stock</label><input type="number" className="field mt-1" value={form.openingStock} onChange={(e) => setForm({ ...form, openingStock: e.target.value })} /></div>}
              <div><label className="text-xs text-slate-500">Min stock</label><input type="number" className="field mt-1" value={form.minStockLevel} onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })} /></div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={save} disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
