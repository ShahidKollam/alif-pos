import { useState, useEffect, useCallback } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import HelpModal from './components/HelpModal';
import Billing from './pages/Billing';
import Products from './pages/Products';
import Stock from './pages/Stock';
import Customers from './pages/Customers';
import Ledger from './pages/Ledger';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

const PAGES = {
  billing: Billing,
  products: Products,
  stock: Stock,
  customers: Customers,
  ledger: Ledger,
  sales: Sales,
  reports: Reports,
  settings: Settings,
};

export default function App() {
  const [page, setPage] = useState('billing');
  const [toast, setToast] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const Page = PAGES[page] || Billing;

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900 overflow-hidden">
      <Sidebar page={page} setPage={setPage} onHelp={() => setHelpOpen(true)} />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-auto">
          <Page showToast={showToast} />
        </main>
      </div>
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
