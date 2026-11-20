import { ipcMain, app } from 'electron';
import * as h from '../database/settings.js';
import { asString } from './validate.js';

function wrap(fn) {
  return async (...args) => {
    try { return await fn(...args); }
    catch (err) { throw new Error(err?.message || String(err)); }
  };
}

export function registerSettingsIpc() {
  ipcMain.handle('settings:get', wrap((_, k) => h.getSetting(asString(k, { required: true, max: 100 }))));
  ipcMain.handle('settings:set', wrap((_, k, v) => h.setSetting(asString(k, { required: true, max: 100 }), String(v ?? ''))));
  ipcMain.handle('demo:load', wrap(() => h.loadDemoData()));
  ipcMain.handle('demo:reset', wrap(() => h.resetDemoData()));
  ipcMain.handle('backup:create', wrap(() => h.createBackup()));
  ipcMain.handle('backup:list', wrap(() => h.listBackups()));
  ipcMain.handle('backup:restore', wrap((_, p) => {
    const path = asString(p, { required: true, max: 1000, name: 'path' });
    if (!path.endsWith('.db')) throw new Error('Invalid backup file');
    return h.restoreFromBackup(path);
  }));
  ipcMain.handle('backup:paths', wrap(() => h.getDataPaths()));
  ipcMain.handle('app:info', wrap(() => ({
    version: app.getVersion(),
    isPackaged: app.isPackaged,
    userData: app.getPath('userData')
  })));
}
