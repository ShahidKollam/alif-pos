import { useEffect, useRef, useState } from 'react';
import { formatINR } from '../utils/money';

/**
 * Keyboard-first dialog: save / update / remove personal price from Billing rate cell.
 * Arrow keys move focus between actions; Enter activates; Escape cancels.
 */
export default function PersonalPricePrompt({
  open,
  customerName,
  productName,
  price,
  hasExisting,
  listRate,
  busy,
  onAdd,
  onRemove,
  onCancel
}) {
  const actions = hasExisting
    ? [
        { id: 'add', label: hasExisting ? 'Update' : 'Add', primary: true },
        { id: 'remove', label: 'Remove', danger: true },
        { id: 'cancel', label: 'Cancel' }
      ]
    : [
        { id: 'add', label: 'Add', primary: true },
        { id: 'cancel', label: 'Cancel' }
      ];

  const [focus, setFocus] = useState(0);
  const btnRefs = useRef([]);

  useEffect(() => {
    if (!open) return;
    setFocus(0);
    const t = setTimeout(() => btnRefs.current[0]?.focus(), 30);
    return () => clearTimeout(t);
  }, [open, hasExisting]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocus((i) => {
          const n = (i + 1) % actions.length;
          btnRefs.current[n]?.focus();
          return n;
        });
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocus((i) => {
          const n = (i - 1 + actions.length) % actions.length;
          btnRefs.current[n]?.focus();
          return n;
        });
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        return;
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, actions.length, onCancel]);

  if (!open) return null;

  const run = (id) => {
    if (busy) return;
    if (id === 'add') onAdd();
    else if (id === 'remove') onRemove();
    else onCancel();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="pp-title">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        <div className="px-4 py-3 border-b border-amber-100 bg-amber-50">
          <div id="pp-title" className="text-sm font-bold text-black">Personal price</div>
          <div className="text-[11px] text-slate-600 mt-0.5">Customer-specific rate for this product</div>
        </div>
        <div className="px-4 py-4 space-y-3 text-sm text-black">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Customer</div>
            <div className="font-semibold">{customerName || '—'}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Product</div>
            <div className="font-semibold">{productName || '—'}</div>
          </div>
          <div className="flex items-end justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2.5">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-amber-800/80 font-semibold">Rate to save</div>
              <div className="text-lg font-bold tabular-nums text-black">{formatINR(price)}</div>
            </div>
            {listRate != null && Number.isFinite(Number(listRate)) ? (
              <div className="text-right">
                <div className="text-[11px] text-slate-500">List rate</div>
                <div className="text-sm tabular-nums text-slate-600">{formatINR(listRate)}</div>
              </div>
            ) : null}
          </div>
          {hasExisting ? (
            <p className="text-xs text-slate-600">
              A personal price already exists for this customer and product. You can update it, remove it, or cancel.
            </p>
          ) : (
            <p className="text-xs text-slate-600">
              Save this rate as the personal price for this customer? It will apply automatically on future bills.
            </p>
          )}
        </div>
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-end gap-2">
          {actions.map((a, i) => (
            <button
              key={a.id}
              ref={(el) => { btnRefs.current[i] = el; }}
              type="button"
              disabled={busy}
              onClick={() => run(a.id)}
              onFocus={() => setFocus(i)}
              className={
                a.primary
                  ? 'btn btn-primary min-w-[88px] py-2'
                  : a.danger
                    ? 'btn min-w-[88px] py-2 border border-red-200 text-red-700 bg-white hover:bg-red-50'
                    : 'btn min-w-[88px] py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }
            >
              {busy && focus === i ? '…' : a.label}
            </button>
          ))}
        </div>
        <div className="px-4 pb-3 text-[10px] text-slate-400">
          ← → or ↑ ↓ to move · Enter to confirm · Esc to cancel
        </div>
      </div>
    </div>
  );
}
