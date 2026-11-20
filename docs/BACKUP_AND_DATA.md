# Database storage, backup and restore

## Where data is saved

| Item | Location |
|------|----------|
| Live database | `{userData}/data/alif_pos.db` |
| Backups | `{userData}/backups/alif_pos_backup_YYYY-MM-DD….db` |
| userData (Windows) | typically `%APPDATA%\alif-pos\` |

Settings → **Database & backup** shows the exact paths on the machine.

### Why not inside the install folder?

- Installing a new version replaces program files.
- Keeping the DB in `userData` means **updates never wipe sales, stock or customers**.
- Uninstalling the app should leave business data unless the user deletes AppData manually.

## How backup works

1. Open **Settings**
2. Click **Create backup now**
3. The app:
   - Flushes the in-memory SQLite database to disk
   - Copies `alif_pos.db` to the backups folder with a timestamped name
4. Success toast shows the full file path

Backups are **full file copies** of the SQLite database (products, invoices, customers, ledger, stock movements, settings).

## How restore works

1. Settings → Backup history → **Restore** on a file
2. Confirm the prompt
3. Current DB is copied to `alif_pos.db.pre_restore` first (safety)
4. Selected backup overwrites the live DB
5. **Restart Alif POS** so all screens reload clean data

## Automatic / scheduled backups

Phase 4 roadmap includes scheduled backups.  
Until then: create a manual backup daily (or before major changes / BUSY import).

## Recommended practice for the shop

1. Backup before closing each day
2. Copy the latest `.db` backup file to an external drive or USB weekly
3. Before any version upgrade: create a backup and keep a copy off the PC
4. Never delete the `data` or `backups` folders under AppData unless instructed

## Export (later)

CSV / Excel export for products, customers, invoices is planned.  
Until then, the `.db` backup file is the complete portable copy of business data.
