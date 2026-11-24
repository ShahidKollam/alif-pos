import { Trash2 } from 'lucide-react';
import { formatINR } from '../../../utils/money';

export default function BillingItemsTable({
  tab, tableWrapRef, productInputRefs, qtyInputRefs, verifyRefs, listBoxRef,
  activeRowKey, showSug, rowQuery, suggestions, highlight, sugUp, filledIds,
  filledItems, rateOf, itemAmount, setActiveRowKey, setRowQuery, setShowSug,
  setSuggestions, setHighlight, placeDropdown, updateRow, applyProductToRow,
  onProductKey, onRowNavKey, onQtyKey, onVerifyKey, onRateKey, removeRow,
  showToast,
}) {
  return (
    <div ref={tableWrapRef} className="pos-table-wrap flex-1 min-h-0 overflow-auto mb-2 relative">
      <table className="pos-table">
        <thead className="sticky top-0 z-10"><tr>
          <th className="text-center" style={{ width: 36 }}>#</th><th>Product</th><th style={{ width: 100 }}>Category</th><th className="text-center" style={{ width: 72 }}>Qty</th><th className="text-center" style={{ width: 36 }} title="Verified">✓</th><th className="text-right num" style={{ width: 100 }}>Rate (₹)</th><th className="text-right num" style={{ width: 110 }}>Amount (₹)</th><th className="text-center" style={{ width: 40 }}></th>
        </tr></thead>
        <tbody>{tab.items.map((row, idx) => {
          const isActive = activeRowKey === row.rowKey && showSug && (rowQuery || '').trim().length > 0;
          const serial = row.productId ? filledItems.findIndex((f) => f.rowKey === row.rowKey) + 1 : '·';
          return <tr key={row.rowKey}>
            <td className="text-center text-slate-500 font-medium">{serial}</td>
            <td className="relative">
              <input ref={(el) => { if (el) productInputRefs.current[row.rowKey] = el; }} className="w-full bg-transparent border-0 outline-none font-bold text-black text-[13.5px] py-0.5 px-0" placeholder="Type product name…" value={activeRowKey === row.rowKey && showSug ? rowQuery : row.productName || ''}
                onChange={(e) => { const v = e.target.value; setActiveRowKey(row.rowKey); setRowQuery(v); setShowSug(v.trim().length > 0); placeDropdown(row.rowKey); if (row.productId) updateRow(row.rowKey, { productId: null, productName: v, stock: null }); else updateRow(row.rowKey, { productName: v }); }}
                onFocus={() => { setActiveRowKey(row.rowKey); setRowQuery(row.productName || ''); setShowSug(false); setSuggestions([]); }} onBlur={() => setTimeout(() => setShowSug(false), 160)} onKeyDown={(e) => { onProductKey(e, row); if (!showSug) onRowNavKey(e, idx); }} />
              {isActive && <div ref={listBoxRef} role="listbox" className={`absolute left-0 right-0 z-30 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto ${sugUp ? 'bottom-full mb-0.5' : 'top-full mt-0.5'}`}>
                {suggestions.length === 0 ? <div className="px-3 py-2 text-xs text-slate-500">No match</div> : suggestions.map((p, si) => {
                  const onBill = filledIds.has(p.id);
                  return <button key={p.id} type="button" data-sug-idx={si} disabled={onBill} className={`w-full text-left px-3 py-1.5 text-sm border-b border-slate-50 last:border-0 flex items-center gap-2 ${onBill ? 'opacity-50 cursor-not-allowed bg-slate-50' : si === highlight ? 'bg-blue-100' : 'hover:bg-blue-50'}`} onMouseDown={(e) => { e.preventDefault(); if (!onBill) applyProductToRow(row.rowKey, p); else showToast('Item already on this bill', 'error'); }} onMouseEnter={() => setHighlight(si)}>
                    <span className="font-bold text-black flex-1 min-w-0 truncate">{p.name}</span>{onBill && <span className="text-[10px] font-semibold text-amber-700 shrink-0">On bill</span>}<span className="text-[11px] text-slate-500 shrink-0 tabular-nums">Stk {p.currentStock}</span><span className="text-[11px] text-slate-600 shrink-0 tabular-nums w-[72px] text-right">W {formatINR(p.wholesalePrice)}</span><span className="text-[11px] text-slate-600 shrink-0 tabular-nums w-[72px] text-right">R {formatINR(p.retailPrice)}</span>
                  </button>;
                })}
              </div>}
            </td>
            <td className="text-xs text-slate-600">{row.productId ? ((row.category && String(row.category).trim()) || 'General') : '—'}</td>
            <td className="text-center"><input ref={(el) => { if (el) qtyInputRefs.current[row.rowKey] = el; }} type="number" min="0" step="1" disabled={!row.productId} value={row.quantity} onChange={(e) => updateRow(row.rowKey, { quantity: e.target.value })} onKeyDown={(e) => onQtyKey(e, row, idx)} className="w-14 text-center bg-transparent border-0 outline-none font-semibold text-black py-0.5 mx-auto" /></td>
            <td className="text-center"><input ref={(el) => { if (el) verifyRefs.current[row.rowKey] = el; }} type="checkbox" className="w-4 h-4 accent-blue-600" disabled={!row.productId} checked={!!row.verified} onChange={(e) => updateRow(row.rowKey, { verified: e.target.checked })} onKeyDown={(e) => onVerifyKey(e, row, idx)} title="Verified · ↑↓ · Space" /></td>
            <td className="text-right num">{row.productId ? <div className="flex flex-col items-end gap-0.5 py-0.5"><input type="number" min="0" step="0.01" value={row.rateOverride !== '' && row.rateOverride != null ? row.rateOverride : rateOf(row)} onChange={(e) => updateRow(row.rowKey, { rateOverride: e.target.value, hasPersonalPrice: row.hasPersonalPrice })} onKeyDown={(e) => onRateKey(e, row, idx)} className={row.hasPersonalPrice ? 'w-24 text-right rounded px-1.5 py-0.5 font-semibold text-black outline-none border border-amber-200 bg-amber-100' : 'w-24 text-right bg-transparent border-0 outline-none font-semibold text-black py-0.5'} title={row.hasPersonalPrice ? 'Personal price (editable)' : 'Rate'} />{row.hasPersonalPrice ? <span className="text-[10px] text-slate-400 tabular-nums leading-none" title="List rate (W/R)">{formatINR(tab.billMode === 'retail' ? row.retailPrice : row.wholesalePrice)}</span> : null}</div> : <span className="text-slate-300">—</span>}</td>
            <td className="text-right num font-bold text-black">{row.productId ? formatINR(itemAmount(row)) : '—'}</td>
            <td className="text-center">{row.productId ? <button type="button" title="Remove" onClick={() => removeRow(row.rowKey)} className="inline-flex p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button> : null}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  );
}
