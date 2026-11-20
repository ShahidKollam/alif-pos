import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { formatINR, roundMoney } from '../utils/money';

export default function Reports() {
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    Promise.all([
      api.invoices.list({}),
      api.products.list({ activeOnly: false }),
      api.customers.list({ activeOnly: false })
    ]).then(([i, p, c]) => { setInvoices(i); setProducts(p); setCustomers(c); }).catch(() => {});
  }, []);

  const wholesale = invoices.filter((x) => x.billingMode === 'wholesale');
  const retail = invoices.filter((x) => x.billingMode === 'retail');
  const sum = (arr) => roundMoney(arr.reduce((s, x) => s + (x.total || 0), 0));
  const totalSales = sum(invoices);
  const totalOutstanding = roundMoney(customers.reduce((s, c) => s + (c.outstanding || 0), 0));
  const lowStock = products.filter((p) => p.isLowStock);

  // Simple gross profit estimate from invoice items isn't loaded here; use product cost * rough
  const cards = [
    { label: 'Total sales', value: formatINR(totalSales), sub: `${invoices.length} invoices` },
    { label: 'Wholesale', value: formatINR(sum(wholesale)), sub: `${wholesale.length} bills` },
    { label: 'Retail', value: formatINR(sum(retail)), sub: `${retail.length} bills` },
    { label: 'Customer outstanding', value: formatINR(totalOutstanding), sub: `${customers.filter((c) => c.outstanding > 0).length} with dues` },
    { label: 'Active products', value: String(products.filter((p) => p.isActive).length), sub: `${lowStock.length} low stock` },
    { label: 'Customers', value: String(customers.length), sub: 'registered' }
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-slate-200 px-4 py-3 shrink-0">
        <h1 className="text-base font-semibold">Reports</h1>
        <p className="text-xs text-slate-500 mt-0.5">Snapshot from current database · detailed P&amp;L expands in later phase</p>
      </div>
      <div className="p-4 grid grid-cols-2 lg:grid-cols-3 gap-3 overflow-auto">
        {cards.map((c) => (
          <div key={c.label} className="panel p-4">
            <div className="text-xs text-slate-500 font-medium">{c.label}</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{c.value}</div>
            <div className="text-xs text-slate-400 mt-1">{c.sub}</div>
          </div>
        ))}
      </div>
      {lowStock.length > 0 && (
        <div className="px-4 pb-4">
          <div className="panel p-4">
            <h2 className="text-sm font-semibold mb-2">Low stock</h2>
            <table className="pos-table">
              <thead><tr><th className="text-center" style={{ width: 40 }}>#</th><th>Product</th><th className="text-right">Stock</th><th className="text-right">Min</th></tr></thead>
              <tbody>
                {lowStock.map((p, idx) => (
                  <tr key={p.id}><td className="text-center text-slate-500 font-medium">{idx + 1}</td><td className="font-medium text-black">{p.name}</td><td className="text-right">{p.currentStock}</td><td className="text-right">{p.minStockLevel}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
