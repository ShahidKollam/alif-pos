import { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
const icons = { success: CheckCircle, error: AlertCircle, info: Info };
const colours = { success: 'bg-emerald-600', error: 'bg-red-600', info: 'bg-slate-800' };
export default function Toast({ message, type = 'info', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3800); return () => clearTimeout(t); }, [onClose]);
  const Icon = icons[type] || Info;
  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-white text-sm ${colours[type]}`}>
      <Icon size={18} /><span className="max-w-sm">{message}</span>
      <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}
