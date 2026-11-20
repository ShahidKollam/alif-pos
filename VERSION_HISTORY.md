# Alif POS — Version History

## v2.2.6 — UI consistency refinements (sidebar, buttons, billing)

- Primary buttons (Add Item, Save Bill, etc.) use sidebar navy `#0b1220`
- Sidebar: all menu text/icons white; selected item keeps contrasting blue `#1d4ed8` with white text
- Expand/collapse chevrons always visible (solid white + subtle background)
- Full-screen control always visible with matching navy theme
- Product entry row: Qty, Rate, W/R and Add Item aligned to same height (38px)
- Table quantity input slightly narrower (`w-12`) for tighter alignment
- Discount and other summary fields use consistent border radius

## v2.2.5 — Billing: focus Qty after product select

- Selecting a product moves focus to **Qty**
- **Enter** on Qty or Rate adds the line (same as search Enter flow)
- After add, focus returns to product search for the next item

## v2.2.4 — Full-height right bill summary + fullscreen

- Bill summary panel on the **right of the whole billing screen** (inputs + table + notes)
- Order: Discount → Total → Previous balance → Grand total → Amount paying now → Still due
- **F11** / floating button: full screen
- **Ctrl+S** saves bill; kept F1, F2, F8, Ctrl+T

## v2.2.3 — Compact billing, color consistency, clearer sidebar

- Same primary blue (#1d4ed8) on sidebar active/hover, Add Item, W/R
- Sidebar collapsed by default; **hover expands**; chevron expand/collapse icons
- Removed New Bill title block to save vertical space
- Tables: visible row + column borders, compact cells, black text
- Totals on the right: Discount → Total → Previous balance → Grand total (highlighted) → Amount paying now → Still due; fixed column alignment

## v2.2.2 — Global design system matched to reference UI

- Soft page background, shared radius (10–14px), soft borders
- Tables: light blue header, horizontal dividers only, rounded card shell
- Inputs/buttons: consistent radius, focus ring, darker text
- Billing totals use aligned `totals-card` rows like the reference

## v2.2.1 — Billing closer to reference layout

- Product entry row: Product search + Qty + Rate + W/R + **Add Item**
- Table action = trash icon (not text Remove)
- Stronger table header blue; darker text labels/amounts
- Totals: Subtotal → Discount → This bill → Previous balance → Grand total
- Sidebar **collapsed by default** with expand/collapse icon

## v2.2.0 — Billing redesign (reference style)

### UI
- Clean professional New Bill layout (meta row, product search, table, notes + totals)
- Multi-bill tabs kept
- Per-line **W / R** price (default **W** wholesale); no global wholesale/retail switch
- Totals block: This bill total → Previous balance → **Grand total**; amount paying now

### Backend
- Invoice lines use each item’s W/R rate; bill number series auto from mix of lines

## v2.1.1 — Billing product search (2nd item + keyboard scroll)

### Fixed
- After adding the first line item, typing the next product did not open the dropdown (input stayed focused so `showSug` never turned true again)
- Arrow Up/Down highlight now **scrolls the selected row into view** inside the list
- Clearer highlight style; Enter uses latest suggestion list reliably

## v2.1.0 — Architecture hardening + clearer billing panel

### Architecture
- IPC split by module (`electron/ipc/`) with input validation
- Single-instance lock (one shop window / one DB)
- File logging under `userData/logs`
- `sandbox: true`, navigation restricted
- Docs: ARCHITECTURE, RELEASE_CHECKLIST, PRINTER_SETUP

### Billing (clear for non-technical users)
- Money panel on the **right**: This bill total → Previous balance → Amount paying now
- Amount paying defaults to bill total (editable)
- Plain language labels (Previous balance, Still due, Total balance after bill)

### UI
- Denser table rows (more lines on one screen)
- Shared page toolbar; search icon on the right; no title/search overlap

## v2.0.4 — Default received amount, pay previous due, table alignment

### Billing
- **Amount received** defaults to the **bill total** and stays editable
- Syncs when items/discount change until the user edits the field

### Customers
- **Receive payment** for previous outstanding without creating a new bill
- Search by name or phone, then record amount paid

### UI
- Table grid alignment improved (headers/cells, numeric columns, wrapped tables)

## v2.0.3 — Tables, oversell, searchable customer

### UI
- Premium table grid: visible row + column borders, zebra rows, clearer headers (all table screens)

### Billing
- Stock may go **negative** (sell when zero / oversell allowed)
- Customer field is **searchable** by name or phone (no plain dropdown only)
- Removed +100 / +500 / +1000 amount chips

## v2.0.2 — Billing search UI + persistent tabs

### Fixed / improved
- Billing product search: search icon on the **right**, clear (×) button, no left-icon overlap
- Cleaner dropdown panel under the search field
- **Open bill tabs persist** when switching sidebar pages (Products, Stock, etc.) via `localStorage`
- Tab labels show item count; draft items remain until Save or Close

### Unchanged
- Save Bill still writes to SQLite (real invoice)
- Draft tabs are session UI state only (not yet committed sales)

## v2.0.1 — Stability fix (search, inputs, customers, demo seed)

### Fixed
- Product search on Billing returned empty results (sql.js parameter binding + case-insensitive LIKE)
- Customer / product save failures not surfaced clearly (IPC error wrapping)
- Demo data not always seeded on empty database
- Billing search dropdown UI (empty state, layout, click-to-add)
- App warns if started in browser-only mode instead of Electron

### Added
- `docs/OPERATIONS_MANUAL.md` — full working operations guide for every screen

### Unchanged
- Multi-tab billing, stock, ledger, sales, reports, backup

## v2.0.0 — Phase 2 modules + multi-tab billing
## v1.2.x — sql.js, Vite 5, preload.cjs
## v1.1.0 — Phase 1 initial
