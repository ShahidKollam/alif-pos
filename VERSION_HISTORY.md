# Alif POS — Version History

## v2.4.6 — Bill summary extracted to BillSummaryPanel

- `src/components/BillSummaryPanel.jsx` — right panel UI only (discount, totals, pay, save/print/WhatsApp)
- `Billing.jsx` wires the same props/callbacks — **no logic or workflow change**
- Personal price dialog remains in `PersonalPricePrompt.jsx`

## v2.4.5 — Personal price from Billing rate (Enter / Tab)

- Rate Enter/Tab → personal price dialog (Add/Update, Remove, Cancel + arrows)

## v2.4.4 — Amount/% discount + client bill summary labels

- Discount ₹/% on subtotal; labels: Subtotal, Discount, Bill Amount, Old Balance, Total Amount, Paid Amount, Balance Amount
