import { ipcMain } from 'electron';
import * as h from '../database/stock.js';
import { asId, asObject, asNumber } from './validate.js';

function wrap(fn) {
  return async (...args) => {
    try { return await fn(...args); }
    catch (err) { throw new Error(err?.message || String(err)); }
  };
}

export function registerStockIpc() {
  ipcMain.handle('stock:list', wrap((_, f) => h.listStock(f || {})));
  ipcMain.handle('stock:adjust', wrap((_, d) => {
    const data = asObject(d);
    asId(data.productId, 'productId');
    asNumber(data.quantity, { name: 'quantity' });
    return h.adjustStock(data);
  }));
  ipcMain.handle('stock:movements', wrap((_, id, limit) => h.stockMovements(asId(id), limit || 50)));
}
