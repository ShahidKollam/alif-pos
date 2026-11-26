import { X } from 'lucide-react';

const globalShortcuts = [
  { key: 'F1', desc: 'Help (this window)' },
  { key: 'F2', desc: 'Products page + Add product' },
  { key: 'F3', desc: 'Add customer (Billing or Customers)' },
  { key: 'F4', desc: 'New tab → Bill no. (search/recall saved bill)' },
  { key: 'F8', desc: 'Billing / New bill tab → focus Customer' },
  { key: 'F9', desc: 'Customers → Receive payment (pick customer + amount)' },
  { key: 'F11', desc: 'Full screen on / off' },
  { key: 'Ctrl+S', desc: 'Save / update current bill' },
  { key: 'Ctrl+P', desc: 'Print current bill (must be saved first)' },
  { key: 'Alt+W', desc: 'WhatsApp current bill (must be saved first)' },
  { key: 'Ctrl+T', desc: 'New bill tab → focus Customer' },
  { key: 'Ctrl+W', desc: 'Close current bill tab' },
  { key: 'Alt+0', desc: 'Products + open Add product' },
  { key: 'Alt+1', desc: 'Open last saved bill (tab or new)' },
  { key: 'Alt+R', desc: 'Open return from earlier bill (Billing)' },
];

const billingShortcuts = [
  { key: 'W / R', desc: 'Wholesale / Retail (when W/R focused)' },
  { key: 'Tab', desc: 'Customer → W/R → products → Bill summary fields' },
  { key: '↑ ↓', desc: 'Customer / product lists; in Bill summary move field to field' },
  { key: '← →', desc: 'In Bill summary: switch Discount ₹/% or Pay by Cash/UPI/Both' },
  { key: 'C / U / B', desc: 'Pay by Cash / UPI / Both (when Pay by focused)' },
  { key: 'Enter', desc: 'Select dropdown item / next field' },
  { key: 'Esc', desc: 'Close dropdowns and dialogs' },
  { key: 'Ctrl+S', desc: 'Save / Update Bill' },
  { key: 'Ctrl+P', desc: 'Print Bill' },
  { key: 'Alt+W', desc: 'WhatsApp Bill' },
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
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 grid md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
          <ShortcutList title="Global" shortcuts={globalShortcuts} />
          <ShortcutList
            title={page === 'billing' ? 'Billing (this page)' : 'Billing'}
            shortcuts={billingShortcuts}
          />
        </div>
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
          Press <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-white font-mono">Esc</kbd> or click outside to close · <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-white font-mono">F1</kbd> opens this help anytime
        </div>
      </div>
    </div>
  );
}
