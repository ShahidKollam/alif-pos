import { registerProductsIpc } from './products.ipc.js';
import { registerInvoicesIpc } from './invoices.ipc.js';
import { registerCustomersIpc } from './customers.ipc.js';
import { registerStockIpc } from './stock.ipc.js';
import { registerSettingsIpc } from './settings.ipc.js';

export function registerAllIpc() {
  registerProductsIpc();
  registerInvoicesIpc();
  registerCustomersIpc();
  registerStockIpc();
  registerSettingsIpc();
}
