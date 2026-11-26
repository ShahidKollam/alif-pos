import { X } from 'lucide-react';

const globalShortcuts = [
  { key: 'F1', desc: 'Help (this window)' },
  { key: 'F2', desc: 'Products page + Add product' },
  { key: 'F3', desc: 'Add customer (Billing or Customers)' },
  { key: 'F4', desc: 'New bill tab → focus Bill no. (search/recall)' },
  { key: 'F8', desc: 'Billing / New bill tab → focus Customer' },
  { key: 'F11', desc: 'Full screen on / off' },
  { key: 'Ctrl+S', desc: 'Save / update current bill' },
  { key: 'Ctrl+T', desc: 'New bill tab → focus Customer' },
  { key: 'Ctrl+W', desc: 'Close current bill tab' },
  { key: 'Alt+0', desc: 'Products + open Add product' },
  { key: 'Alt+1', desc: 'Open last saved bill (tab or new)' },
  { key: 'Alt+R', desc: 'Open return from earlier bill (Billing)' },
  { key: 'Sidebar', desc: 'Record payment — receive against customer account' },
];

const billingShortcuts = [
  { key: 'W / R', desc: 'Wholesale / Retail (when W/R focused)' },
  { key: 'Tab', desc: 'Customer → W/R → product name' },
  { key: '↑ ↓', desc: 'Customer / product dropdown & rows' },
  { key: 'Enter', desc: 'Select dropdown item / next field' },
  { key: 'Esc', desc: 'Close dropdowns and dialogs' },
  { key: '/', desc: 'Focus return search (Return modal)' }
];

function ShortcutList({ title, shortcuts }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden">
      <h3 className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-600 bg-slate-100/80 border-b border-slate-200">{title}</h3>
      <ul className="p-3 space-y-2">
        {shortcuts.map((s) => (
          <li key={s.key} className="grid grid-cols-[5.5rem_1fr] gap-2 items-start text-sm">
            <kbd className="text-center px-2 py-1 rounded-md bg-white border border-slate-200 font-mono text-xs font-semibold text-slate-700 shadow-sm">{s.key}</kbd>
            <span className="text-slate-700 leading-5">{s.desc}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function HelpModal({ page, onClose }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Keyboard shortcuts</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} /></button>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-slate-500 mb-3">Global and Billing page shortcuts. Full list: docs/KEYBOARD_SHORTCUTS.md</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ShortcutList title="Global" shortcuts={globalShortcuts} />
            <ShortcutList title="Billing" shortcuts={billingShortcuts} />
          </div>
        </div>
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-right">
          <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
