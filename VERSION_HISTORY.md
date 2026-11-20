# Alif POS — Version History

## v2.2.9 — Billing UX polish (verify column, dropdown, add customer)

- Verify checkbox moved next to # (before product name); ↑↓ moves between verify boxes
- Product dropdown only after typing (not on focus when returning to tab)
- Dropdown flips upward near table bottom; shows stock + W + R rates
- Same product already on bill marked “On bill” and not re-added
- W/R: press W or R when control focused
- Customer: + icon and “Add this customer” in dropdown; name+phone modal
- Bolder product names; qty/rate inputs borderless in table cells

## v2.2.8 — Inline billing table entry, bill W/R, verify, WhatsApp

- Removed separate product entry bar; enter items directly in the billing table
- Columns: # · Product (inline search) · ✓ verified · Qty · Rate · Amount
- Single bill-level W/R control after Customer, before Bill date
- No product codes shown on Billing; codes auto-generated internally on create
- Verification checkbox per line; included in WhatsApp + print text
- WhatsApp Bill button opens wa.me with customer phone when available
- Table area scrolls independently (page chrome stays fixed)
- Stock table: removed per-line W/R price column
- Products add form: no Code field (auto P00001-style)

## v2.2.7 — Serial numbers on all tables + Billing table aligned to Products

- Sequential roll numbers on main tables
- Billing table design aligned with Products

## Earlier versions

See repository history for v2.2.6 and below.
