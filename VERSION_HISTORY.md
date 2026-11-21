# Alif POS — Version History

## v2.4.1 — Clean tab labels + reliable tab close

- Tab labels: customer name only, or **Walk-in 1 / 2 / …** (no item counts, no · saved)
- Tab close works reliably for every tab (X button + Ctrl+W); last tab closes into a fresh blank tab
- Save/Update toast shows invoice number and total in rupees (e.g. Updated W-26-11-AA-005 · ₹1,139)
- Bill summary header no longer repeats · saved
- Invoice number still assigned only on backend save (drafts stay empty until save)

## v2.4.0 — Personal Pricing + Sales bill notes

- Sales eye modal shows invoice notes when present
- Personal Pricing: customer+product special rates (SQLite `personal_prices`)
- Billing: PP shows as soft yellow editable rate; list W/R rate in grey below
- Applied rate (PP or override) saved on bill items as unit price

## v2.3.5 — Blue selected buttons: white text/icons

- Selected W/R, Cash/UPI/Both, sidebar active item use `.seg-active`

## v2.3.4 — WhatsApp without phone, Cash/UPI/Both pay

- WhatsApp without mobile; Pay by Cash / UPI / Both

## Earlier

See git history.
