const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('alif', {
  products: {
    list: (f) => ipcRenderer.invoke('products:list', f),
    get: (id) => ipcRenderer.invoke('products:get', id),
    create: (d) => ipcRenderer.invoke('products:create', d),
    update: (id, d) => ipcRenderer.invoke('products:update', id, d),
    setActive: (id, a) => ipcRenderer.invoke('products:setActive', id, a),
    search: (q) => ipcRenderer.invoke('products:search', q),
    categories: () => ipcRenderer.invoke('products:categories')
  },
  invoices: {
    nextNumber: (m) => ipcRenderer.invoke('invoices:nextNumber', m),
    save: (d) => ipcRenderer.invoke('invoices:save', d),
    get: (id) => ipcRenderer.invoke('invoices:get', id),
    list: (f) => ipcRenderer.invoke('invoices:list', f)
  },
  customers: {
    list: (f) => ipcRenderer.invoke('customers:list', f),
    get: (id) => ipcRenderer.invoke('customers:get', id),
    create: (d) => ipcRenderer.invoke('customers:create', d),
    update: (id, d) => ipcRenderer.invoke('customers:update', id, d),
    setActive: (id, a) => ipcRenderer.invoke('customers:setActive', id, a),
    ledger: (id, limit) => ipcRenderer.invoke('customers:ledger', id, limit),
    collectPayment: (d) => ipcRenderer.invoke('customers:collectPayment', d)
  },
  stock: {
    list: (f) => ipcRenderer.invoke('stock:list', f),
    adjust: (d) => ipcRenderer.invoke('stock:adjust', d),
    movements: (id, limit) => ipcRenderer.invoke('stock:movements', id, limit)
  },
  settings: {
    get: (k) => ipcRenderer.invoke('settings:get', k),
    set: (k, v) => ipcRenderer.invoke('settings:set', k, v)
  },
  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    list: () => ipcRenderer.invoke('backup:list'),
    restore: (p) => ipcRenderer.invoke('backup:restore', p),
    paths: () => ipcRenderer.invoke('backup:paths')
  },
  demo: {
    load: () => ipcRenderer.invoke('demo:load'),
    reset: () => ipcRenderer.invoke('demo:reset')
  },
  app: {
    info: () => ipcRenderer.invoke('app:info')
  }
});
