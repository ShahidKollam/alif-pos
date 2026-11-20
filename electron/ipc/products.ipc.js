import { ipcMain } from 'electron';
import * as h from '../database/products.js';
import { asId, asObject, asString } from './validate.js';

function wrap(fn) {
  return async (...args) => {
    try { return await fn(...args); }
    catch (err) { throw new Error(err?.message || String(err)); }
  };
}

export function registerProductsIpc() {
  ipcMain.handle('products:list', wrap((_, f) => h.listProducts(f || {})));
  ipcMain.handle('products:get', wrap((_, id) => h.getProduct(asId(id))));
  ipcMain.handle('products:create', wrap((_, d) => {
    const data = asObject(d);
    asString(data.name, { required: true, max: 200, name: 'Product name' });
    return h.createProduct(data);
  }));
  ipcMain.handle('products:update', wrap((_, id, d) => h.updateProduct(asId(id), asObject(d))));
  ipcMain.handle('products:setActive', wrap((_, id, a) => h.setProductActive(asId(id), !!a)));
  ipcMain.handle('products:search', wrap((_, q) => h.searchProducts(asString(q, { max: 100 }))));
  ipcMain.handle('products:categories', wrap(() => h.getCategories()));
}
