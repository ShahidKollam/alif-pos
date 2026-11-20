# Alif POS — Architecture

```
React UI (src/)
    ↓ window.alif (preload.cjs)
Electron Main (electron/main.js)
    ↓ ipc modules (electron/ipc/)
Database handlers (electron/database/)
    ↓ sql.js
SQLite file in userData/data/alif_pos.db
```

## Electron layout

| Path | Role |
|------|------|
| `electron/main.js` | App lifecycle, single instance, window |
| `electron/preload.cjs` | Secure API bridge only |
| `electron/ipc/*.ipc.js` | Validated IPC handlers by domain |
| `electron/database/` | Business rules + SQLite |
| `electron/services/logger.js` | File logs under userData/logs |

## Security

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- IPC inputs validated (ids, strings, modes)
- External navigation blocked

## UI

- One window; sidebar switches pages
- Billing multi-tabs persisted in `localStorage`
- Dense tables for long product lists
