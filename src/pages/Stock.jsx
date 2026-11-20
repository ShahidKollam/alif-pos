import { useState, useEffect, useCallback } from 'react';
import PageToolbar from '../components/PageToolbar';
import { api } from '../utils/api';

export default function Stock({ showToast }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [adjust, setAdjust] = useState(null);
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    try { setRows(await api.stock.list({ search: search || undefined, lowOnly })); }
    catch (e) { showToast(e.message, 'error'); }
  }, [search, lowOnly, showToast]);
  useEffect(() => { load(); }, [load]);

  const doAdjust = async () => {
    try {
      await api.stock.adjust({ productId: adjust.id, quantity: Number(qty), notes, movementType: 'adjustment' });
      showToast('Stock updated', 'success'); setAdjust(null); setQty(''); setNotes(''); load();
    } catch (e) { showToast(e.message, 'error'); }
  };

  return (
    <div className="flex flex-col h-full">
      <PageToolbar title="Stock" search={search} onSearchChange={setSearch} searchPlaceholder="Search products…">
        <label className="flex items-center gap-1.5 text-sm text-slate-600 whitespace-nowrap">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Low stock only
        </label>
      </PageToolbar>
      <div className="flex-1 overflow-auto px-4 py-2">
        <div className="pos-table-wrap"><table className="pos-table">
          <thead><tr><th className="text-center" style={{ width: 40 }}>#</th><th>Product</th><th className="text-right">Stock</th><th className="text-right">Min</th><th></th></tr></thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.id}>
                <td className="text-center text-slate-500 font-medium">{idx + 1}</td>
                <td className="font-medium text-black">{r.name}{r.isLowStock && <span className="badge badge-amber ml-2">Low</span>}</td>
                <td className="text-right font-semibold">{r.currentStock}</td>
                <td className="text-right text-slate-500">{r.minStockLevel}</td>
                <td><button className="btn btn-ghost text-xs py-1" onClick={() => setAdjust(r)}>Adjust</button></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="text-center text-slate-400 py-10">No stock rows</td></tr>}
          </tbody>
        </table></div>
      </div>
      {adjust && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={() => setAdjust(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold mb-1">Adjust stock</h2>
            <p className="text-sm text-slate-500 mb-3">{adjust.name} · current {adjust.currentStock}</p>
            <label className="text-xs text-slate-500">Change (+ increase / − decrease)</label>
            <input type="number" className="field mt-1 mb-2" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
            <label className="text-xs text-slate-500">Notes</label>
            <input className="field mt-1 mb-4" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setAdjust(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={doAdjust}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
