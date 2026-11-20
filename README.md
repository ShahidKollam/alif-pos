# Alif POS v2.0.1

Professional Windows desktop POS for **wholesale and retail** billing.

## Modules

| Screen | Purpose |
|--------|---------|
| Billing | Multi-tab W/R billing, customer due, save + stock |
| Products | Master with wholesale/retail prices |
| Stock | Levels, low stock, adjustments |
| Customers | Master + outstanding / advance |
| Ledger | History + collect payment |
| Sales History | Search and view invoices |
| Reports | Sales and outstanding snapshot |
| Settings | Backup / restore, paths, demo data |

## Quick start

```bash
npm install
npm run electron:dev
```

Installer: `npm run electron:build` → `Alif_POS_v2.0.1.0_Setup.exe`

## Documentation

- [Setup](docs/SETUP.md)
- [Backup & data safety](docs/BACKUP_AND_DATA.md)
- [User guide](docs/USER_GUIDE.md)
- [**Operations manual**](docs/OPERATIONS_MANUAL.md) (complete daily workflow)
- [Version history](VERSION_HISTORY.md)

## Stack

React · Tailwind · Electron · sql.js (SQLite WASM) · Secure IPC
