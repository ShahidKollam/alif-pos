import { useState, useEffect, useCallback } from 'react';
import { Eye } from 'lucide-react';
import PageToolbar from '../components/PageToolbar';
import { api } from '../utils/api';
import { formatINR } from '../utils/money';

export default function Sales({ showToast }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('');
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    try { setRows(await api.invoices.list({ search: search || undefined, mode: mode || undefined })); }
    catch (e) { showToast(e.message, 'error'); }
  }, [search, mode, showToast]);
  useEffect(() => { load(); }, [load]);

  const open = async (id) => {
    try { setDetail(await api.invoices.get(id)); }
    catch (e) { showToast(e.message, 'error'); }
  };

  return (
    <div className="flex flex-col h-full">
      <PageToolbar title="Sales History" search={search} onSearchChange={setSearch} searchPlaceholder="Invoice or customer…">
        <select className="field w-36" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="">All modes</option>
          <option value="wholesale">Wholesale</option>
          <option value="retail">Retail</option>
        </select>
      </PageToolbar>
      <div className="flex-1 overflow-auto px-4 py-2">
        <div className="pos-table-wrap"><table className="pos-table">
          <thead><tr><th className="text-center" style={{ width: 40 }}>#</th><th>Invoice</th><th>Date</th><th>Mode</th><th>Customer</th><th className="text-right">Total Amount</th><th className="text-right">Paid Amount</th><th className="text-right">Balance Amount</th><th></th></tr></thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.id}>
                <td className="text-center text-slate-500 font-medium">{idx + 1}</td>
                <td className="font-mono font-medium text-black">{r.invoiceNumber}</td>
                <td className="text-xs text-slate-500">{r.invoiceDate}</td>
                <td><span className={`badge ${r.billingMode === 'wholesale' ? 'badge-blue' : 'badge-slate'}`}>{r.billingMode}</span></td>
                <td>{r.customerName || '—'}</td>
                <td className="text-right font-semibold">{formatINR(r.total)}</td>
                <td className="text-right text-emerald-700">{formatINR(r.amountReceived)}</td>
                <td className="text-right text-amber-700">{formatINR(r.balanceDue)}</td>
                <td><button type="button" className="p-1 text-slate-400 hover:text-blue-600" onClick={() => open(r.id)}><Eye size={14} /></button></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={9} className="text-center text-slate-400 py-10">No invoices yet</td></tr>}
          </tbody>
        </table></div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3 border-b flex justify-between items-center">
              <div>
                <div className="font-semibold">{detail.invoiceNumber}</div>
                <div className="text-xs text-slate-500">{detail.invoiceDate} · {detail.billingMode}{detail.customerName ? ` · ${detail.customerName}` : ''}</div>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setDetail(null)}>Close</button>
            </div>
            <div className="px-5 py-3 max-h-72 overflow-auto">
              <table className="pos-table">
                <thead><tr><th className="text-center" style={{ width: 36 }}>#</th><th>Item</th><th className="text-right">Qty</th><th className="text-right">Rate</th><th className="text-right">Amount</th></tr></thead>
                <tbody>
                  {(detail.items || []).map((it, idx) => (
                    <tr key={it.id}><td className="text-center text-slate-500">{idx + 1}</td><td className="font-medium text-black">{it.productName}</td><td className="text-right">{it.quantity}</td><td className="text-right">{formatINR(it.unitPrice)}</td><td className="text-right">{formatINR(it.amount)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t text-sm space-y-1">
              {(detail.discount > 0) ? <div className="flex justify-between text-slate-500"><span>Discount</span><span>− {formatINR(detail.discount)}</span></div> : null}
              <div className="flex justify-between"><span>Bill Amount</span><strong>{formatINR(detail.total)}</strong></div>
              <div className="flex justify-between text-slate-500"><span>Paid Amount</span><span>{formatINR(detail.amountReceived)}</span></div>
              <div className="flex justify-between text-amber-700"><span>Balance Amount</span><span>{formatINR(detail.balanceDue)}</span></div>
              {detail.notes ? (
                <div className="pt-2 mt-1 border-t border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Notes</div>
                  <div className="text-sm text-black whitespace-pre-wrap mt-0.5">{detail.notes}</div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
