import { X } from 'lucide-react';

const shortcuts = [
  { key: 'F1', desc: 'Help (this window)' },
  { key: 'F2', desc: 'Products page + Add product' },
  { key: 'F3', desc: 'Add customer (Billing or Customers)' },
  { key: 'F8', desc: 'Billing / New bill tab' },
  { key: 'F11', desc: 'Full screen on / off' },
  { key: 'Ctrl+S', desc: 'Save / update current bill' },
  { key: 'Ctrl+T', desc: 'New bill tab' },
  { key: 'Ctrl+W', desc: 'Close current bill tab' },
  { key: 'Alt+0', desc: 'Products + open Add product' },
  { key: 'Alt+1', desc: 'Open last saved bill (tab or new)' },
  { key: 'W / R', desc: 'Wholesale / Retail (when W/R focused)' },
  { key: 'Tab', desc: 'Customer → W/R → product name' },
  { key: '↑ ↓', desc: 'Customer / product dropdown & rows' },
  { key: 'Enter', desc: 'Select dropdown item / next field' },
  { key: 'Esc', desc: 'Close dropdowns and dialogs' }
];

export default function HelpModal({ page, onClose }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Keyboard shortcuts</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} /></button>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-slate-500 mb-3">Global and Billing page shortcuts. Full list: docs/KEYBOARD_SHORTCUTS.md</p>
          <ul className="space-y-2">
            {shortcuts.map((s) => (
              <li key={s.key} className="flex items-start gap-3 text-sm">
                <kbd className="shrink-0 min-w-[4.5rem] text-center px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-xs font-semibold text-slate-700">{s.key}</kbd>
                <span className="text-slate-700 pt-0.5">{s.desc}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-right">
          <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
