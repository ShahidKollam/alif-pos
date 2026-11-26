import { useState, useEffect, useMemo } from 'react';
import DateRangeFilter from '../components/DateRangeFilter';
import { api } from '../utils/api';
import { formatINR, roundMoney } from '../utils/money';
import { rangePreset, dayStart, dayEnd } from '../utils/dateRange';

const initialRange = rangePreset('month');

export default function Reports() {
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [datePreset, setDatePreset] = useState(initialRange.id);
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);

  useEffect(() => {
    const from = fromDate ? dayStart(fromDate) : undefined;
    const to = toDate ? dayEnd(toDate) : undefined;
    Promise.all([
      api.invoices.list({ fromDate: from, toDate: to }),
      api.products.list({ activeOnly: false }),
      api.customers.list({ activeOnly: false })
    ])
      .then(([i, p, c]) => {
        setInvoices(i);
        setProducts(p);
        setCustomers(c);
      })
      .catch(() => {});
  }, [fromDate, toDate]);

  function onDateChange({ preset, from, to }) {
    setDatePreset(preset);
    setFromDate(from || '');
    setToDate(to || '');
  }

  const wholesale = invoices.filter((x) => x.billingMode === 'wholesale');
  const retail = invoices.filter((x) => x.billingMode === 'retail');
  const sum = (arr) => roundMoney(arr.reduce((s, x) => s + (x.total || 0), 0));
  const totalSales = sum(invoices);
  const totalPaid = roundMoney(invoices.reduce((s, x) => s + (x.amountReceived || 0), 0));
  const totalBalance = roundMoney(invoices.reduce((s, x) => s + (x.balanceDue || 0), 0));
  const totalOutstanding = roundMoney(customers.reduce((s, c) => s + (c.outstanding || 0), 0));
  const lowStock = products.filter((p) => p.isLowStock);

  const rangeLabel = useMemo(() => {
    if (!fromDate && !toDate) return 'All time';
    if (fromDate && toDate && fromDate === toDate) return fromDate;
    return `${fromDate || '…'} → ${toDate || '…'}`;
  }, [fromDate, toDate]);

  const cards = [
    { label: 'Total sales', value: formatINR(totalSales), sub: `${invoices.length} invoices · ${rangeLabel}` },
    { label: 'Wholesale', value: formatINR(sum(wholesale)), sub: `${wholesale.length} bills` },
    { label: 'Retail', value: formatINR(sum(retail)), sub: `${retail.length} bills` },
    { label: 'Amount received', value: formatINR(totalPaid), sub: `Balance on bills ${formatINR(totalBalance)}` },
    { label: 'Old Balance (all)', value: formatINR(totalOutstanding), sub: `${customers.filter((c) => c.outstanding > 0).length} customers · current` },
    { label: 'Active products', value: String(products.filter((p) => p.isActive).length), sub: `${lowStock.length} low stock · current` }
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-slate-200 px-4 py-3 shrink-0 space-y-2">
        <div>
          <h1 className="text-base font-semibold">Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">Sales totals follow the date filter · balances and stock are current</p>
        </div>
        <DateRangeFilter preset={datePreset} from={fromDate} to={toDate} onChange={onDateChange} />
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
    </div>
  );
}
