# Alif POS — Version History

## v2.4.3 — Tick persist, column order, rate Enter, last-tab Walk-in reset

- Closing the **last** bill tab opens a fresh blank bill and resets to **Walk-in 1**
- Verified (tick) saved on invoice lines (`invoice_items.verified`, migration 5) — **onetime has db.js + invoices.js**
- Tick column next to **Qty**; Enter on **Rate** advances to next item
- Full correct `src/pages/Billing.jsx` is in the v2.4.3 ZIP deliverable (copy into this branch if needed)

## v2.4.2 — Tab labels + bill no + toast

- Tabs: customer name only, or Walk-in 1 / 2 / 3…
- Bill number empty until backend save; toast bill number only

## Earlier

See git history.
