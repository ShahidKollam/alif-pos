import { Plus, X } from 'lucide-react';
import { tabLabel } from '../helpers';

export default function BillingTabs({ tabs, activeId, onSelect, onClose, onAdd }) {
  return (
    <div className="tab-bar shrink-0 bg-[#e8eef5]">
      {tabs.map((t) => (
        <button key={t.id} type="button" className={`tab ${t.id === activeId ? 'active' : ''}`} onClick={() => onSelect(t.id)}>
          <span className="truncate">{tabLabel(t)}</span>
          <button type="button" className="close" onClick={(e) => onClose(t.id, e)} title="Close tab (Ctrl+W)" aria-label="Close tab"><X size={12} /></button>
        </button>
      ))}
      <button type="button" className="ml-1 px-2.5 py-1.5 text-slate-500 hover:text-blue-600 self-center rounded-lg hover:bg-white/80" title="New bill (Ctrl+T / F8)" onClick={onAdd}><Plus size={16} /></button>
    </div>
  );
}
