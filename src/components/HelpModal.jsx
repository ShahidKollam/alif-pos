import { X } from 'lucide-react';
const shortcuts = [
  { key: 'F1', desc: 'Help' },
  { key: 'F2', desc: 'Products / Add product' },
  { key: 'F8', desc: 'Billing / New bill tab' },
  { key: 'F11', desc: 'Full screen on / off' },
  { key: 'Ctrl+S', desc: 'Save bill (on Billing)' },
  { key: 'Ctrl+T', desc: 'New bill tab' },
  { key: 'W', desc: 'Wholesale mode (not while typing)' },
  { key: 'R', desc: 'Retail mode (not while typing)' },
  { key: 'Ctrl+T', desc: 'New bill tab' },
  { key: 'Esc', desc: 'Close dialogs' }
];
export default function HelpModal({ page, onClose }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Keyboard shortcuts</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={16} /></button>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-slate-500 mb-3">Screen: <span className="font-medium text-slate-700 capitalize">{page}</span></p>
          <table className="w-full text-sm">
            <tbody>
              {shortcuts.map((s) => (
                <tr key={s.key} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 w-24"><kbd className="px-2 py-1 bg-slate-100 rounded-md text-xs font-mono font-semibold">{s.key}</kbd></td>
                  <td className="py-2.5 text-slate-600">{s.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-right">
          <button onClick={onClose} className="btn btn-primary">Close</button>
        </div>
      </div>
    </div>
  );
}
