# Alif POS — Version History

## v2.3.1 — Customer dropdown keys, bill search, Alt+1, shortcuts doc

- Customer dropdown: ↑↓/Enter covers Walk-in, matches, and single “Add this customer”
- Bill no. field is editable: Enter loads existing bill
- Tab: Customer → W/R → product row
- Alt+1: reopen last saved bill (tab or new)
- docs/KEYBOARD_SHORTCUTS.md + Help (F1) list updated

## v2.3.0 — Receipt numbers W/R-YY-MM-AA-###, save-in-place, UX keys

- Receipt format: `W-YY-MM-AA-001` / `R-YY-MM-AA-001`; period sequences in DB (migration 3); independent W/R; AA…ZZ then AAA
- Save keeps the bill open for further items (update same invoice)
- WhatsApp / Print require save first; WhatsApp uses shell.openExternal
- Tabs show customer name when set
- F3 add customer (Billing + Customers); Alt+0 Products + Add Product
- Category column on bill lines (default General)
- Product dropdown arrows skip items already on bill; customer dropdown keyboard
- ↑↓ between product rows when dropdown closed

## Earlier

See git history for v2.2.x and below.
