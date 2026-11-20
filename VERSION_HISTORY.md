# Alif POS — Version History

## v2.3.3 — Last tab closable, WhatsApp to customer number

- Last bill tab can be closed (opens a fresh empty tab)
- WhatsApp opens chat for the customer mobile (91…); fetches phone if missing
- Requires customer phone to share; bill text prefilled for manual send

## v2.3.2 — Bill search fix, tab close, category from product

- invoices:getByNumber: defensive IPC register + robust SQL; Billing falls back to list+get
- Bill number open: new tab if current has line items; same tab if empty
- Ctrl+W closes current bill tab
- Category shows product category; General only when product has none

## v2.3.1 — Customer dropdown keys, bill search, Alt+1, shortcuts doc

- Customer dropdown keyboard; bill no. search; Alt+1 last bill; KEYBOARD_SHORTCUTS.md

## v2.3.0 and earlier

See git history.
