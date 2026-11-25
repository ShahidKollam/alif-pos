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
  const channels = [
    'invoices:nextNumber',
    'invoices:save',
    'invoices:get',
    'invoices:getByNumber',
    'invoices:list',
    'invoices:getReturnable',
    'invoices:saveReturn'
    ,'invoices:searchReturnable'
  ];
  for (const ch of channels) {
    try { ipcMain.removeHandler(ch); } catch (_) {}
  }
  ipcMain.handle('invoices:nextNumber', wrap((_, m, invoiceDate) => h.getNextInvoiceNumber(asMode(m), invoiceDate)));
  ipcMain.handle('invoices:save', wrap((_, d) => {
    const data = asObject(d);
    if (!Array.isArray(data.items) || !data.items.length) throw new Error('Invoice must have items');
    return h.saveInvoice(data);
  }));
  ipcMain.handle('invoices:get', wrap((_, id) => h.getInvoice(asId(id))));
  ipcMain.handle('invoices:getByNumber', wrap((_, n) => h.getInvoiceByNumber(String(n || ''))));
  ipcMain.handle('invoices:list', wrap((_, f) => h.listInvoices(f || {})));
  ipcMain.handle('invoices:getReturnable', wrap((_, id) => h.getReturnableInvoice(asId(id))));
  ipcMain.handle('invoices:saveReturn', wrap((_, d) => h.saveReturn(asObject(d))));
  ipcMain.handle('invoices:searchReturnable', wrap((_, f) => h.searchReturnableInvoices(asObject(f))));
}
