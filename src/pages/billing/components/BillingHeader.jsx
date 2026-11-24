import { Plus, UserPlus } from 'lucide-react';
import { formatINR } from '../../../utils/money';

export default function BillingHeader({
  tab, invoiceDate, showCust, setShowCust, custHighlight, setCustHighlight,
  custOptions, updateTab, selectCustomer, openAddCustomer, wrRef,
  productInputRefs, onWrKey, searchBillByNumber,
}) {
  return (
    <div className="grid grid-cols-12 gap-2 mb-2 shrink-0">
      <div className="col-span-12 md:col-span-4">
        <label className="block text-[11px] font-bold text-black mb-0.5">Customer</label>
        <div className="relative">
          <input type="text" className="field bg-white pr-9" placeholder="Search name or phone…"
            value={tab.customerQuery != null ? tab.customerQuery : tab.customerName || ''}
            onChange={(e) => { updateTab({ customerQuery: e.target.value, customerId: null, customerName: '', customerPhone: '', customerOutstanding: 0, customerAdvance: 0 }); setShowCust(true); setCustHighlight(0); }}
            onFocus={() => { setShowCust(true); setCustHighlight(0); }} onBlur={() => setTimeout(() => setShowCust(false), 180)}
            onKeyDown={(e) => {
              if (e.key === 'Tab' && !e.shiftKey) { setShowCust(false); setTimeout(() => wrRef.current?.focus(), 0); return; }
              if (!showCust && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { setShowCust(true); e.preventDefault(); return; }
              if (!showCust) return;
              const max = Math.max(0, custOptions.length - 1);
              if (e.key === 'ArrowDown') { e.preventDefault(); setCustHighlight((h) => Math.min(h + 1, max)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setCustHighlight((h) => Math.max(h - 1, 0)); }
              else if (e.key === 'Enter') {
                e.preventDefault();
                const opt = custOptions[custHighlight] || custOptions[0];
                if (!opt) return;
                if (opt.kind === 'walkin') { selectCustomer(null); setShowCust(false); }
                else if (opt.kind === 'customer') { selectCustomer(opt.c); setShowCust(false); }
                else if (opt.kind === 'add') { openAddCustomer(tab.customerQuery); }
              } else if (e.key === 'Escape') setShowCust(false);
            }} />
          <button type="button" title="Add customer" className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50" onMouseDown={(e) => { e.preventDefault(); openAddCustomer(); }}><UserPlus size={16} /></button>
          {showCust && <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-auto">
            {custOptions.map((opt, oi) => {
              const active = oi === custHighlight;
              const base = `w-full text-left px-3 py-2 text-sm border-b border-slate-50 last:border-0 ${active ? 'bg-blue-100 ring-1 ring-inset ring-blue-200' : 'hover:bg-blue-50'}`;
              if (opt.kind === 'walkin') return <button key="walkin" type="button" className={`${base} text-slate-600`} onMouseDown={(e) => { e.preventDefault(); selectCustomer(null); setShowCust(false); }} onMouseEnter={() => setCustHighlight(oi)}>Walk-in / none</button>;
              if (opt.kind === 'add') return <button key="add" type="button" className={`${base} font-semibold text-blue-700`} onMouseDown={(e) => { e.preventDefault(); openAddCustomer(tab.customerQuery); }} onMouseEnter={() => setCustHighlight(oi)}><span className="inline-flex items-center gap-2"><Plus size={14} /> Add this customer “{(tab.customerQuery || '').trim()}”</span></button>;
              const c = opt.c;
              return <button key={c.id} type="button" className={base} onMouseDown={(e) => { e.preventDefault(); selectCustomer(c); setShowCust(false); }} onMouseEnter={() => setCustHighlight(oi)}><div className="font-medium text-black">{c.name}</div><div className="text-[11px] text-slate-500">{c.phone || '—'}{c.outstanding > 0 ? ` · Old Balance ${formatINR(c.outstanding)}` : ''}</div></button>;
            })}
          </div>}
        </div>
      </div>
      <div className="col-span-4 md:col-span-2">
        <label className="block text-[11px] font-bold text-black mb-0.5">W / R</label>
        <div ref={wrRef} tabIndex={0} onKeyDown={(e) => { onWrKey(e); if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); const first = (tab.items || []).find((i) => !i.productId) || tab.items?.[0]; if (first) productInputRefs.current[first.rowKey]?.focus(); } }} className="flex rounded-md border border-slate-200 overflow-hidden h-[34px] bg-white focus:ring-2 focus:ring-blue-200 outline-none" title="Press W or R · Tab → products">
          <button type="button" onClick={() => updateTab({ billMode: 'wholesale' })} className={`flex-1 text-xs font-bold ${tab.billMode !== 'retail' ? 'seg-active' : 'bg-white text-black'}`}>W</button>
          <button type="button" onClick={() => updateTab({ billMode: 'retail' })} className={`flex-1 text-xs font-bold border-l border-slate-200 ${tab.billMode === 'retail' ? 'seg-active' : 'bg-white text-black'}`}>R</button>
        </div>
      </div>
      <div className="col-span-4 md:col-span-3"><label className="block text-[11px] font-bold text-black mb-0.5">Bill date</label><input className="field bg-white" value={invoiceDate} readOnly /></div>
      <div className="col-span-4 md:col-span-3"><label className="block text-[11px] font-bold text-black mb-0.5">Bill no.</label><input className="field bg-white font-mono font-semibold text-slate-700" value={tab.invoiceNo || ''} placeholder="Empty until save · or search saved bill" title="Type an existing bill number and press Enter to open it" onChange={(e) => updateTab({ invoiceNo: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const q = (tab.invoiceNo || '').trim(); if (q) searchBillByNumber(q); } }} onBlur={() => { /* bill no assigned on save only */ }} /></div>
    </div>
  );
}
