# Alif POS — Setup Guide

## Requirements

- Windows 10/11 (primary)
- Node.js 18+ (20.12+ recommended; 20.9 works with this project’s Vite 5 pin)
- For development only — the client installer does **not** need Node.js

## Development

```bash
unzip Alif_POS_v2.0.0.zip
cd alif-pos
npm install
npm run electron:dev
```

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run electron:dev` | Vite + Electron development |
| `npm run build` | Production React build |
| `npm run electron:build` | Windows NSIS installer |

## Production install (client)

1. Build: `npm run electron:build`
2. Run `dist-installer/Alif_POS_v2.0.0_Setup.exe`
3. Open **Alif POS** from desktop shortcut
4. Settings → Create backup
5. Test wholesale and retail bills

## Database location

SQLite file is **outside** the install folder:

`%APPDATA%\alif-pos\data\alif_pos.db`

(Electron `userData` path — exact path shown in Settings.)

Upgrades and uninstall must not delete this file for normal use.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| F1 | Help |
| F2 | Products / Add product |
| F8 | Billing / new bill tab |
| Ctrl+T | New bill tab |
| W | Wholesale mode |
| R | Retail mode |

## Architecture

```
React UI  →  preload.cjs (contextBridge)  →  Electron Main  →  sql.js SQLite
```

- `contextIsolation: true`
- `nodeIntegration: false`
- Money stored as integer **paise**
- Invoice + stock + customer balances in one DB transaction
