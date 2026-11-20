# Alif POS — Version History

## v2.3.2 — Bill search fix, tab close, category from product

- invoices:getByNumber: defensive IPC register + robust SQL; Billing falls back to list+get
- Bill number open: new tab if current has line items; same tab if empty
- Ctrl+W closes current bill tab
- Category shows product category; General only when product has none

## v2.3.1 — Customer dropdown keys, bill search, Alt+1, shortcuts doc

- Customer dropdown: ↑↓/Enter covers Walk-in, matches, and single “Add this customer”
- Bill no. field is editable: Enter loads existing bill
- Tab: Customer → W/R → product row
- Alt+1: reopen last saved bill (tab or new)
- docs/KEYBOARD_SHORTCUTS.md + Help (F1) list updated

## v2.3.0 — Receipt numbers W/R-YY-MM-AA-###, save-in-place, UX keys

- Receipt format period sequences; save keeps bill open; WhatsApp/Print require save

## Earlier

See git history for v2.2.x and below.
