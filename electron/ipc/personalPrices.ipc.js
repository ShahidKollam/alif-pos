import { ipcMain } from 'electron';
import * as h from '../database/personalPrices.js';
import { asId, asObject } from './validate.js';

function wrap(fn) {
  return async (...args) => {
    try { return await fn(...args); }
    catch (err) { throw new Error(err?.message || String(err)); }
  };
}

export function registerPersonalPricesIpc() {
  const channels = [
    'personalPrices:list',
    'personalPrices:get',
    'personalPrices:mapForCustomer',
    'personalPrices:upsert',
    'personalPrices:delete'
  ];
  for (const ch of channels) {
    try { ipcMain.removeHandler(ch); } catch (_) {}
  }
  ipcMain.handle('personalPrices:list', wrap((_, f) => h.listPersonalPrices(f || {})));
  ipcMain.handle('personalPrices:get', wrap((_, customerId, productId) =>
    h.getPersonalPrice(asId(customerId), asId(productId))));
  ipcMain.handle('personalPrices:mapForCustomer', wrap((_, customerId) =>
    h.mapForCustomer(asId(customerId))));
  ipcMain.handle('personalPrices:upsert', wrap((_, d) => h.upsertPersonalPrice(asObject(d))));
  ipcMain.handle('personalPrices:delete', wrap((_, id) => h.deletePersonalPrice(asId(id))));
  console.log('IPC registered: personalPrices (list, get, mapForCustomer, upsert, delete)');
}
