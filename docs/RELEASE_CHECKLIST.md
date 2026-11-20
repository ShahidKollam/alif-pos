# Release checklist

1. `npm install`
2. `npm run electron:dev` — bill, save, customer payment, backup
3. `npm run electron:build`
4. Install Setup.exe on a **clean** Windows PC (or VM)
5. Confirm AppData DB path in Settings
6. Create backup → restore → restart
7. Confirm only one app instance opens if launched twice
8. Tag version in `package.json` + `VERSION_HISTORY.md`
