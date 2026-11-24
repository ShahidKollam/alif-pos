import { roundMoney } from './money';

/**
 * Pure bill totals used by Billing UI.
 * Order:
 *   Subtotal → Discount → Bill Amount
 *   + Old Balance → Total Due
 *   − Applied Advance → Net Payable
 *   − Paid Now → Still Due / Excess
 */
export function computeBillTotals({
  items = [],
  discount = 0,
  discountType = 'amount',
  customerOutstanding = 0,
  customerAdvance = 0,
  applyAdvance = false,
  amountReceived = 0,
  itemAmount,
}) {
  const filled = (items || []).filter((i) => i.productId);
  const subtotal = roundMoney(
    filled.reduce((s, i) => s + (itemAmount ? itemAmount(i) : 0), 0)
  );

  const discountRaw = Number(discount) || 0;
  const dtype = discountType === 'percent' ? 'percent' : 'amount';
  let discountVal = 0;
  if (discountRaw > 0 && subtotal > 0) {
    if (dtype === 'percent') {
      const pct = Math.min(discountRaw, 100);
      discountVal = Math.min(roundMoney(subtotal * (pct / 100)), subtotal);
    } else {
      discountVal = Math.min(roundMoney(discountRaw), subtotal);
    }
  }

  const billAmount = roundMoney(subtotal - discountVal);
  const oldBalance = Number(customerOutstanding) || 0;
  const totalAmount = roundMoney(billAmount + oldBalance);

  const adv = Number(customerAdvance) || 0;
  const appliedAdvance =
    applyAdvance && adv > 0 ? roundMoney(Math.min(adv, totalAmount)) : 0;

  const netPayable = roundMoney(Math.max(0, totalAmount - appliedAdvance));
  const paidAmount = Number(amountReceived) || 0;
  const stillDue = roundMoney(Math.max(0, netPayable - paidAmount));
  const excess = roundMoney(Math.max(0, paidAmount - netPayable));

  return {
    filledItems: filled,
    subtotal,
    discountVal,
    billAmount,
    oldBalance,
    totalAmount,
    customerAdvance: adv,
    appliedAdvance,
    netPayable,
    paidAmount,
    stillDue,
    excess,
    billTotal: billAmount,
    previousBalance: oldBalance,
    grandTotal: totalAmount,
    received: paidAmount,
    balanceAmount: stillDue,
  };
}
