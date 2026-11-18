import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './database/db.js';
import { registerAllIpc } from './ipc/index.js';
import { logger } from './services/logger.js';
import * as productHandlers from './database/products.js';
import * as settingsHandlers from './database/settings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let mainWindow = null;
const isDev = !app.isPackaged;

// Single instance — one DB, one shop window
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 720,
    backgroundColor: '#0b1220',
    title: 'Alif POS',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  if (isDev) mainWindow.loadURL('http://localhost:5173');
  else mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (e, url) => {
    const allowed = isDev
      ? url.startsWith('http://localhost:5173')
      : url.startsWith('file://');
    if (!allowed) e.preventDefault();
  });
}

if (gotLock) {
  app.whenReady().then(async () => {
    try {
      logger.info('Alif POS starting', `v${app.getVersion()} packaged=${app.isPackaged}`);
      await initDatabase();
      try {
        const n = productHandlers.countProducts();
        if (n === 0) {
          logger.info('Empty product table — loading demo data');
          settingsHandlers.loadDemoData();
        }
      } catch (e) {
        logger.warn('Demo seed skipped', e.message);
      }
      registerAllIpc();
      createWindow();
      logger.info('Window ready');
    } catch (err) {
      logger.error('Startup failed', err);
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
