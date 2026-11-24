import { X } from 'lucide-react';

export default function AddCustomerModal({
  open,
  addCustName,
  addCustPhone,
  addCustSaving,
  onChangeName,
  onChangePhone,
  onClose,
  onSave,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="font-bold text-black">Add customer</div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600">Name *</label>
            <input className="field mt-1" value={addCustName} onChange={(e) => onChangeName(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('add-cust-phone')?.focus(); }} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Mobile</label>
            <input id="add-cust-phone" className="field mt-1" value={addCustPhone} onChange={(e) => onChangePhone(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onSave(); }} placeholder="Optional" />
          </div>
        </div>
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={addCustSaving} onClick={onSave}>{addCustSaving ? 'Saving…' : 'Save & select'}</button>
        </div>
      </div>
    </div>
  );
}
