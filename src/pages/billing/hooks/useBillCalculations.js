import { useMemo } from 'react';
import { roundMoney } from '../../../utils/money';

/**
 * Bill totals for the active tab. Logic must stay identical to previous Billing.jsx.
 */
export default function useBillCalculations(tab, rateOf) {
  const itemAmount = (item) => (!item.productId ? 0 : roundMoney(rateOf(item) * (Number(item.quantity) || 0)));
  const filledItems = useMemo(() => (tab?.items || []).filter((i) => i.productId), [tab?.items]);
  const filledIds = useMemo(() => new Set(filledItems.map((i) => i.productId)), [filledItems]);
  const subtotal = useMemo(
    () => roundMoney(filledItems.reduce((s, i) => s + itemAmount(i), 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filledItems, tab?.billMode, tab?.items]
  );

  const discountRaw = Number(tab?.discount) || 0;
  const discountType = tab?.discountType === 'percent' ? 'percent' : 'amount';
  const discountVal = (() => {
    if (discountRaw <= 0 || subtotal <= 0) return 0;
    if (discountType === 'percent') {
      const pct = Math.min(discountRaw, 100);
      return Math.min(roundMoney(subtotal * (pct / 100)), subtotal);
    }
    return Math.min(roundMoney(discountRaw), subtotal);
  })();

  const billAmount = roundMoney(subtotal - discountVal);
  const oldBalance = tab?.customerOutstanding || 0;
  const totalAmount = roundMoney(billAmount + oldBalance);
  const paidAmount = Number(tab?.amountReceived) || 0;
  const customerAdvance = Number(tab?.customerAdvance) || 0;
  const appliedAdvance =
    tab?.applyAdvance && customerAdvance > 0
      ? roundMoney(Math.min(customerAdvance, totalAmount))
      : 0;
  const balanceAmount = roundMoney(Math.max(0, totalAmount - paidAmount - appliedAdvance));

  const billTotal = billAmount;
  const previousBalance = oldBalance;
  const grandTotal = totalAmount;
  const received = paidAmount;
  const stillDue = balanceAmount;
  const excess = roundMoney(Math.max(0, paidAmount + appliedAdvance - totalAmount));

  return {
    itemAmount,
    filledItems,
    filledIds,
    subtotal,
    discountRaw,
    discountType,
    discountVal,
    billAmount,
    oldBalance,
    totalAmount,
    paidAmount,
    customerAdvance,
    appliedAdvance,
    balanceAmount,
    billTotal,
    previousBalance,
    grandTotal,
    received,
    stillDue,
    excess,
  };
}
