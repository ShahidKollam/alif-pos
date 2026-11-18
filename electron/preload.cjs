const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('alif', {
  products: {
    list: (opts) => invoke('products:list', opts),
    get: (id) => invoke('products:get', id),
    create: (data) => invoke('products:create', data),
    update: (id, data) => invoke('products:update', id, data),
    remove: (id) => invoke('products:remove', id),
    search: (q) => invoke('products:search', q),
  },
  stock: {
    list: () => invoke('stock:list'),
    adjust: (data) => invoke('stock:adjust', data),
    history: (opts) => invoke('stock:history', opts),
  },
  customers: {
    list: (opts) => invoke('customers:list', opts),
    get: (id) => invoke('customers:get', id),
    create: (data) => invoke('customers:create', data),
    update: (id, data) => invoke('customers:update', id, data),
    remove: (id) => invoke('customers:remove', id),
    ledger: (id, opts) => invoke('customers:ledger', id, opts),
    addPayment: (data) => invoke('customers:addPayment', data),
  },
  invoices: {
    create: (data) => invoke('invoices:create', data),
    list: (opts) => invoke('invoices:list', opts),
    get: (id) => invoke('invoices:get', id),
    void: (id, reason) => invoke('invoices:void', id, reason),
  },
  settings: {
    get: () => invoke('settings:get'),
    set: (data) => invoke('settings:set', data),
    backup: () => invoke('settings:backup'),
    restore: (path) => invoke('settings:restore', path),
    loadDemo: () => invoke('settings:loadDemo'),
  },
  app: {
    getVersion: () => invoke('app:getVersion'),
    getPath: (name) => invoke('app:getPath', name),
  },
});
