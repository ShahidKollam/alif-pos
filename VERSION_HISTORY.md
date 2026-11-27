# Alif POS — Version History

## v2.4.8 — Bill print & WhatsApp template (sections + labels)

- WhatsApp bill and thermal/paper print use the same section layout:
  - **A. Bill information** — bill no, date & time, mode, customer name, mobile
  - **B. Product details** — qty, rate, line amount
  - **C. Bill calculation** — Subtotal, Discount, Bill Amount
  - **D. Customer account** — Old Balance (Dr/Cr), Bill Amount, Total Amount, Paid Amount, Balance Amount (Dr/Cr)
- Labels match Bill summary panel (Old Balance, Bill Amount, Total Amount, Paid Amount, Balance Amount)
- Print opens a compact receipt-style HTML (≈80 mm friendly) then the system print dialog
- Printer: still Windows USB/network; select thermal in the print dialog (see docs/PRINTER_SETUP.md)

## v2.4.7 — Billing focus: Customer on new tab, F4 → Bill no.

- New bill tab (**Ctrl+T** / **F8** / plus button): cursor starts on **Customer** search (not product row)
- **F4**: new bill tab with cursor on **Bill no.** for search/recall (global + on Billing)
- Switching existing tabs no longer steals focus
- Help modal and keyboard docs updated


## v2.4.2 — Tab labels + bill no + toast

- Tabs: customer name only when selected; otherwise **Walk-in 1 / 2 / 3…**
- Bill number field stays empty until first successful save (number from backend only)
- Save/Update toast shows only status + bill number (e.g. Updated W-26-11-AA-005) — no amount

## v2.4.1 — Clean tab labels + reliable tab close

- Tab close works for every tab (X + Ctrl+W)
- Draft tabs do not pre-fetch invoice numbers

## v2.4.0 — Personal Pricing + Sales bill notes

- Personal Pricing, PP rates in Billing, Sales notes in eye modal

## Earlier

See git history.
