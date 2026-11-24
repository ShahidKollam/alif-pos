import { Save, MessageCircle, Printer } from 'lucide-react';
import { formatINR } from '../utils/money';

/**
 * Right-hand bill summary: totals, discount ₹/%, pay method, actions.
 * Pure presentation — all state and save/print logic stay in Billing.
 */
export default function BillSummaryPanel({
  tab,
  subtotal,
  discountVal,
  billAmount,
  oldBalance,
  totalAmount,
  received,
  stillDue,
  excess,
  customerAdvance = 0,
  appliedAdvance = 0,
  saving,
  hasItems,
  onUpdateTab,
  onSave,
  onWhatsApp,
  onPrint
}) {
  if (!tab) return null;

  const payMethod = tab.payMethod || 'cash';
  const discountType = tab.discountType || 'amount';

  return (
    <aside className="w-[300px] xl:w-[320px] shrink-0 border-l border-[#cbd5e1] bg-white flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-[#cbd5e1] bg-[#dbe7f8]">
        <div className="text-[11px] font-bold text-black uppercase tracking-wide">Bill summary</div>
        <div className="text-xs text-black/70 font-medium truncate">
          {tab.savedInvoiceId ? (tab.invoiceNo || 'Saved') : 'Draft'} · {tab.billMode === 'retail' ? 'Retail' : 'Wholesale'}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="totals-card border-0 rounded-none shadow-none">
          <div className="t-row"><span className="t-label">Subtotal</span><span className="t-value">{formatINR(subtotal)}</span></div>
          <div className="t-row items-center gap-1">
            <span className="t-label">Discount</span>
            <div className="flex items-center gap-1 flex-1 justify-end">
              <div className="flex rounded-md border border-slate-200 overflow-hidden h-[28px] bg-white shrink-0">
                <button
                  type="button"
                  className={`px-2 text-[10px] font-bold ${discountType === 'amount' ? 'seg-active' : 'bg-white text-black'}`}
                  onClick={() => onUpdateTab({ discountType: 'amount', amountEdited: false })}
                >₹</button>
                <button
                  type="button"
                  className={`px-2 text-[10px] font-bold ${discountType === 'percent' ? 'seg-active' : 'bg-white text-black'}`}
                  onClick={() => onUpdateTab({ discountType: 'percent', amountEdited: false })}
                >%</button>
              </div>
              <input
                type="number"
                min="0"
                max={discountType === 'percent' ? 100 : undefined}
                step="0.01"
                value={tab.discount}
                onChange={(e) => onUpdateTab({ discount: e.target.value, amountEdited: false })}
                className="field rounded-md w-[88px] text-right"
                placeholder="0"
              />
            </div>
          </div>
          {discountVal > 0 ? (
            <div className="t-row">
              <span className="t-label text-slate-500">Discount amount</span>
              <span className="t-value text-slate-600">− {formatINR(discountVal)}</span>
            </div>
          ) : null}
          <div className="t-row"><span className="t-label">Bill Amount</span><span className="t-value">{formatINR(billAmount)}</span></div>
          <div className="t-row">
            <span className="t-label">Old Balance</span>
            <span className="t-value">{tab.customerId ? formatINR(oldBalance) : '—'}</span>
          </div>
          <div className="t-row t-grand">
            <span className="t-label">Total Amount</span>
            <span className="t-value">{formatINR(totalAmount)}</span>
          </div>
          <div className="t-row items-center">
            <span className="t-label">Pay by</span>
            <div className="flex rounded-md border border-slate-200 overflow-hidden h-[30px] bg-white shrink-0">
              {[
                { id: 'cash', label: 'Cash' },
                { id: 'upi', label: 'UPI' },
                { id: 'both', label: 'Both' }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    if (m.id === 'both') {
                      const half = received > 0 ? String(received) : (tab.amountReceived || '');
                      onUpdateTab({
                        payMethod: 'both',
                        cashAmount: tab.cashAmount !== '' ? tab.cashAmount : half,
                        upiAmount: tab.upiAmount !== '' ? tab.upiAmount : '',
                        amountEdited: true
                      });
                    } else {
                      onUpdateTab({ payMethod: m.id, amountEdited: true });
                    }
                  }}
                  className={`px-2.5 text-[11px] font-bold ${payMethod === m.id ? 'seg-active' : 'bg-white text-black'}`}
                >{m.label}</button>
              ))}
            </div>
          </div>
          {customerAdvance > 0 ? (
            <div className="t-row">
              <label className="flex items-center gap-2 text-xs text-black font-medium flex-1">
                <input
                  type="checkbox"
                  checked={!!tab.applyAdvance}
                  onChange={(e) => onUpdateTab({ applyAdvance: e.target.checked })}
                />
                Apply advance {formatINR(customerAdvance)}
              </label>
              {tab.applyAdvance && appliedAdvance > 0 ? (
                <span className="t-value text-emerald-700 font-semibold">− {formatINR(appliedAdvance)}</span>
              ) : null}
            </div>
          ) : null}
          {payMethod !== 'both' ? (
            <div className="t-row">
              <span className="t-label">Paid Amount</span>
              <input
                type="number"
                min="0"
                value={tab.amountReceived}
                onChange={(e) => onUpdateTab({ amountReceived: e.target.value, amountEdited: true })}
                className="field"
              />
            </div>
          ) : (
            <>
              <div className="t-row">
                <span className="t-label">Cash</span>
                <input
                  type="number"
                  min="0"
                  value={tab.cashAmount ?? ''}
                  onChange={(e) => {
                    const cashAmount = e.target.value;
                    const total = (Number(cashAmount) || 0) + (Number(tab.upiAmount) || 0);
                    onUpdateTab({ cashAmount, amountReceived: String(total), amountEdited: true });
                  }}
                  className="field"
                  placeholder="0"
                />
              </div>
              <div className="t-row">
                <span className="t-label">UPI</span>
                <input
                  type="number"
                  min="0"
                  value={tab.upiAmount ?? ''}
                  onChange={(e) => {
                    const upiAmount = e.target.value;
                    const total = (Number(tab.cashAmount) || 0) + (Number(upiAmount) || 0);
                    onUpdateTab({ upiAmount, amountReceived: String(total), amountEdited: true });
                  }}
                  className="field"
                  placeholder="0"
                />
              </div>
              <div className="t-row">
                <span className="t-label">Paid Amount</span>
                <span className="t-value font-bold">{formatINR(received)}</span>
              </div>
            </>
          )}
          <div className="t-row">
            <span className="t-label">Balance Amount</span>
            <span className="t-value">{formatINR(stillDue)}</span>
          </div>
          {excess > 0 && (
            <div className="t-row">
              <label className="flex items-center gap-2 text-xs text-black font-medium">
                <input
                  type="checkbox"
                  checked={tab.treatExcessAsAdvance}
                  onChange={(e) => onUpdateTab({ treatExcessAsAdvance: e.target.checked })}
                />
                Extra {formatINR(excess)} as advance
              </label>
            </div>
          )}
        </div>
      </div>
      <div className="p-3 border-t border-[#cbd5e1] space-y-2 bg-[#f8fafc]">
        <button
          type="button"
          className="btn btn-primary w-full py-2.5"
          onClick={onSave}
          disabled={saving || !hasItems}
        >
          <Save size={15} /> {tab.savedInvoiceId ? 'Update Bill' : 'Save Bill'}
        </button>
        <button
          type="button"
          className="btn btn-ghost w-full"
          onClick={onWhatsApp}
          disabled={!hasItems}
        >
          <MessageCircle size={15} /> WhatsApp Bill
        </button>
        <button
          type="button"
          className="btn btn-ghost w-full"
          disabled={!hasItems}
          onClick={onPrint}
        >
          <Printer size={15} /> Print Bill
        </button>
      </div>
    </aside>
  );
}
