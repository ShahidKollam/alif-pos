import { ipcMain } from 'electron';
import * as h from '../database/customers.js';
import { asId, asObject, asString, asNumber } from './validate.js';

function wrap(fn) {
  return async (...args) => {
    try { return await fn(...args); }
    catch (err) { throw new Error(err?.message || String(err)); }
  };
}

export function registerCustomersIpc() {
  ipcMain.handle('customers:list', wrap((_, f) => h.listCustomers(f || {})));
  ipcMain.handle('customers:get', wrap((_, id) => h.getCustomer(asId(id))));
  ipcMain.handle('customers:create', wrap((_, d) => {
    const data = asObject(d);
    asString(data.name, { required: true, max: 200, name: 'Customer name' });
    return h.createCustomer(data);
  }));
  ipcMain.handle('customers:update', wrap((_, id, d) => h.updateCustomer(asId(id), asObject(d))));
  ipcMain.handle('customers:setActive', wrap((_, id, a) => h.setCustomerActive(asId(id), !!a)));
  ipcMain.handle('customers:ledger', wrap((_, id, limit) => h.getLedger(asId(id), limit || 100)));
  ipcMain.handle('customers:summary', wrap((_, id) => h.getCustomerSummary(asId(id))));
  ipcMain.handle('customers:collectPayment', wrap((_, d) => {
    const data = asObject(d);
    asId(data.customerId, 'customerId');
    asNumber(data.amount, { min: 0.01, name: 'amount' });
    return h.collectPayment(data);
  }));
}
