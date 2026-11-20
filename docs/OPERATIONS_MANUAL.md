# Alif POS — Complete Operations Manual

**Version 2.0.1** · Wholesale & Retail desktop billing

This manual explains every screen and the correct daily workflow for shop staff and the owner.

---

## 1. How to start the application

### Development (on your PC with Node.js)

```text
cd alif-pos
npm install
npm run electron:dev
```

**Important:** Always use `npm run electron:dev`, not `npm run dev` alone.  
`npm run dev` opens only the web UI in a browser. Without Electron, **search shows no products** and **Save / Add Customer will fail**.

### Client shop PC

Install `Alif_POS_v2.0.1_Setup.exe` and open **Alif POS** from the desktop shortcut.

---

## 2. What each menu does

| Menu | Purpose |
|------|---------|
| **Billing** | Create wholesale or retail invoices, take payment, reduce stock |
| **Products** | Add / edit product names, codes, cost, wholesale & retail prices, opening stock |
| **Stock** | See current quantities, low-stock items, make manual adjustments |
| **Customers** | Register customers, opening outstanding and advance |
| **Ledger** | Customer account history; collect payment without a new sale |
| **Sales History** | Find past invoices and view line items |
| **Reports** | Quick totals: sales, outstanding, low stock |
| **Settings** | Backup / restore database, paths, demo data |

---

## 3. Billing (main daily work)

### 3.1 Modes

- Press **W** → **Wholesale** (uses wholesale price)
- Press **R** → **Retail** (uses retail price)

The active mode is highlighted at the top. Prices in the grid highlight the rate that will be charged.

### 3.2 Multiple bill tabs

You can keep several bills open at once (e.g. one customer on the phone, one at the counter).

| Action | How |
|--------|-----|
| New tab | **F8**, **Ctrl+T**, or the **+** on the tab bar |
| Switch tab | Click the tab |
| Close tab | × on the tab (one tab always remains) |

Each tab has its own mode, customer, items and payment fields.

### 3.3 Add products

1. Click the search box (or it is focused on open).
2. Type part of the **name** or **code** (e.g. `Lux`, `SOAP`).
3. A list appears under the box showing stock, wholesale and retail price.
4. Press **Enter** (first/highlighted row) or click a row to add.
5. Change **Qty** in the table. Remove with the trash icon.

If the list says **No products found**:

- Open **Products** and check the list, or  
- Open **Settings → Load demo** once, or  
- Confirm you started with `electron:dev` / the installed app (not browser-only).

### 3.4 Customer on a bill

- Choose a customer from the dropdown (or leave **Walk-in / none**).
- If they have previous dues, **Previous due** is shown.
- After payment, **Total outstanding** = previous due + current bill due (simplified view on the bill).

### 3.5 Payment

| Field | Meaning |
|-------|---------|
| Discount | Optional ₹ off the whole bill |
| Amount received | Cash/UPI taken now |
| Current bill due | What remains on **this** invoice |
| Excess | Paid more than the bill |
| Keep as advance | Only tick if extra money should stay as **customer credit**. Otherwise treat as change returned. |

Click **Save Bill**. Stock is reduced only if save succeeds.

### 3.6 Keyboard shortcuts (billing)

| Key | Action |
|-----|--------|
| F1 | Help |
| F2 | Products |
| F8 | New bill tab |
| Ctrl+T | New bill tab |
| W | Wholesale (when not typing in a field) |
| R | Retail (when not typing in a field) |

---

## 4. Products

1. Open **Products**.
2. **Add Product** (or **F2**).
3. Fill **Name** (required), optional Code/SKU, Category, Unit.
4. Enter **Purchase cost**, **Wholesale price**, **Retail price**.
5. **Opening stock** and **Min stock** (for low-stock warnings).
6. **Save**.

**Edit** with the pencil icon. **Deactivate** with the power icon (preferred instead of delete so old invoices stay valid).

---

## 5. Stock

- Lists all active products and quantities.
- Tick **Low stock only** to see items at or below minimum.
- **Adjust**: enter a positive number to increase, negative to decrease, with a short note (purchase, damage, count correction).

Stock also decreases automatically when a bill is saved.

---

## 6. Customers

1. **Customers → Add**.
2. Name required; phone and address optional.
3. Optional **Opening outstanding** (money they already owe) and **Opening advance**.

Customers appear in the billing customer dropdown.

---

## 7. Customer Ledger

1. Select a customer.
2. See **Outstanding** and **Advance**.
3. Table shows sales, payments and running balance.
4. **Collect payment**: record money received **without** creating a new bill (e.g. clearing old dues).

---

## 8. Sales History

- Search by invoice number or customer name.
- Filter Wholesale / Retail.
- Open an invoice to see items, totals, received and due.

---

## 9. Reports

Snapshot cards:

- Total sales, wholesale total, retail total  
- Customer outstanding  
- Product and low-stock counts  

Use this for a quick end-of-day view. Detailed profit & loss is a later phase.

---

## 10. Settings & backup

### Where data is stored

| Data | Location |
|------|----------|
| Live database | AppData `…/alif-pos/data/alif_pos.db` |
| Backups | AppData `…/alif-pos/backups/` |

Exact paths are shown in Settings. Data is **not** inside the program install folder, so updates do not erase sales.

### Backup (do this daily)

1. Settings → **Create backup now**  
2. Optional: copy the new `.db` file from the backups folder to a USB drive  

### Restore

1. Settings → Backup history → **Restore**  
2. Confirm  
3. **Restart Alif POS**

### Demo data

Loads sample soaps, biscuits, stationery products and a few customers for practice.  
**Reset demo** removes only demo-tagged rows, not real business data.

---

## 11. Recommended daily routine

1. Open Alif POS  
2. (Optional) Settings → Create backup  
3. Billing: W or R → add products → customer if needed → payment → Save  
4. If customer pays old dues only → Ledger → Collect payment  
5. End of day: Sales History + Reports check; another backup  

---

## 12. Common problems

| Problem | Fix |
|---------|-----|
| Search shows no products | Use `npm run electron:dev` or installed app; load demo / add products |
| “Requires Electron desktop app” | Not running inside Electron — use electron:dev or Setup.exe |
| Cannot add customer | Ensure Electron mode; name is required; check toast error text |
| Inputs seem dead | Focus the field; do not run only the Vite browser preview |
| After restore, old data shows | Fully close and reopen the app |

---

## 13. What is intentionally later

Thermal printer fine-tuning, WhatsApp share, full P&L, CSV export, BUSY import wizard.

Core shop operations — bill, stock, customers, dues, history, backup — are available in this version.
