import { ipcMain } from 'electron';
import * as h from '../database/invoices.js';
import { asId, asObject, asMode } from './validate.js';

function wrap(fn) {
  return async (...args) => {
    try { return await fn(...args); }
    catch (err) { throw new Error(err?.message || String(err)); }
  };
}

export function registerInvoicesIpc() {
  ipcMain.handle('invoices:nextNumber', wrap((_, m) => h.getNextInvoiceNumber(asMode(m))));
  ipcMain.handle('invoices:save', wrap((_, d) => {
    const data = asObject(d);
    if (!Array.isArray(data.items) || !data.items.length) throw new Error('Invoice must have items');
    return h.saveInvoice(data);
  }));
  ipcMain.handle('invoices:get', wrap((_, id) => h.getInvoice(asId(id))));
  ipcMain.handle('invoices:list', wrap((_, f) => h.listInvoices(f || {})));
}
