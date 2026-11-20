function getAlif() {
  return typeof window !== 'undefined' ? window.alif : null;
}
async function notAvailable() {
  throw new Error('This action requires the Electron desktop app. Use npm run electron:dev or the installed app.');
}
const a = () => getAlif();

export const api = {
  openExternal: (url) => (a() && a().shell?.openExternal ? a().shell.openExternal(url) : Promise.resolve(window.open(url, '_blank'))),
  products: {
    list: (f) => a() ? a().products.list(f) : Promise.resolve([]),
    get: (id) => a() ? a().products.get(id) : Promise.resolve(null),
    create: (d) => a() ? a().products.create(d) : notAvailable(),
    update: (id, d) => a() ? a().products.update(id, d) : notAvailable(),
    setActive: (id, x) => a() ? a().products.setActive(id, x) : notAvailable(),
    search: (q) => a() ? a().products.search(q) : Promise.resolve([]),
    categories: () => a() ? a().products.categories() : Promise.resolve([])
  },
  invoices: {
    nextNumber: (m, d) => a() ? a().invoices.nextNumber(m, d) : Promise.resolve('W-26-11-AA-001'),
    save: (d) => a() ? a().invoices.save(d) : notAvailable(),
    get: (id) => a() ? a().invoices.get(id) : Promise.resolve(null),
    list: (f) => a() ? a().invoices.list(f) : Promise.resolve([])
  },
  customers: {
    list: (f) => a() ? a().customers.list(f) : Promise.resolve([]),
    get: (id) => a() ? a().customers.get(id) : Promise.resolve(null),
    create: (d) => a() ? a().customers.create(d) : notAvailable(),
    update: (id, d) => a() ? a().customers.update(id, d) : notAvailable(),
    setActive: (id, x) => a() ? a().customers.setActive(id, x) : notAvailable(),
    ledger: (id, limit) => a() ? a().customers.ledger(id, limit) : Promise.resolve([]),
    collectPayment: (d) => a() ? a().customers.collectPayment(d) : notAvailable()
  },
  stock: {
    list: (f) => a() ? a().stock.list(f) : Promise.resolve([]),
    adjust: (d) => a() ? a().stock.adjust(d) : notAvailable(),
    movements: (id, limit) => a() ? a().stock.movements(id, limit) : Promise.resolve([])
  },
  settings: {
    get: (k) => a() ? a().settings.get(k) : Promise.resolve(null),
    set: (k, v) => a() ? a().settings.set(k, v) : notAvailable()
  },
  backup: {
    create: () => a() ? a().backup.create() : notAvailable(),
    list: () => a() ? a().backup.list() : Promise.resolve([]),
    restore: (p) => a() ? a().backup.restore(p) : notAvailable(),
    paths: () => a() ? a().backup.paths() : Promise.resolve({})
  },
  demo: {
    load: () => a() ? a().demo.load() : notAvailable(),
    reset: () => a() ? a().demo.reset() : notAvailable()
  },
  app: {
    info: () => a() ? a().app.info() : Promise.resolve({ name: 'Alif POS', version: 'dev' })
  },
  get isElectron() {
    return !!getAlif();
  }
};
