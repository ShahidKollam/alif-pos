import { useState, useEffect, useCallback } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Billing from './pages/Billing';
import Products from './pages/Products';
import Stock from './pages/Stock';
import Customers from './pages/Customers';
import Ledger from './pages/Ledger';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import PersonalPricing from './pages/PersonalPricing';
import HelpModal from './components/HelpModal';
import Toast from './components/Toast';
import { api } from './utils/api';

export default function App() {
  const [page, setPage] = useState('billing');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [toast, setToast] = useState(null);
  const [ready, setReady] = useState(false);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!api.isElectron) {
          showToast('Open with npm run electron:dev — browser-only mode cannot save data', 'error');
        } else {
          const products = await api.products.list({ activeOnly: false });
          if (!products || products.length === 0) {
            const res = await api.demo.load();
            showToast(res.alreadyLoaded ? 'Database ready' : `Demo data loaded (${res.count} products)`, 'success');
          }
        }
      } catch (e) {
        console.warn(e);
        showToast(e.message || 'Startup warning', 'error');
      } finally {
        setReady(true);
      }
    })();
  }, [showToast]);

  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      showToast('Fullscreen not available', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'F1') { e.preventDefault(); setShowHelp(true); return; }
      if (e.key === 'F2') { e.preventDefault(); setPage('products'); window.dispatchEvent(new CustomEvent('alif:open-add-product')); return; }
      if (e.key === 'F3') {
        e.preventDefault();
        if (page === 'billing') window.dispatchEvent(new CustomEvent('alif:open-add-customer'));
        else { setPage('customers'); window.dispatchEvent(new CustomEvent('alif:open-add-customer')); }
        return;
      }
      if (e.altKey && (e.key === '0' || e.code === 'Digit0')) {
        e.preventDefault();
        setPage('products');
        setTimeout(() => window.dispatchEvent(new CustomEvent('alif:open-add-product')), 50);
        return;
      }
      if (e.altKey && (e.key === '1' || e.code === 'Digit1')) {
        e.preventDefault();
        setPage('billing');
        setTimeout(() => window.dispatchEvent(new CustomEvent('alif:open-last-bill')), 50);
        return;
      }
      if (e.key === 'F8') { e.preventDefault(); setPage('billing'); window.dispatchEvent(new CustomEvent('alif:new-bill')); return; }
      if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (page === 'billing') window.dispatchEvent(new CustomEvent('alif:save-bill'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleFullscreen, page]);

  if (!ready) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0b1220] text-white">
        <div className="text-center">
          <div className="text-2xl font-semibold mb-1">Alif POS</div>
          <div className="text-slate-400 text-sm">Starting…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-slate-100">
      <Sidebar
        current={page}
        onNavigate={setPage}
        collapsed={sidebarCollapsed && !sidebarPinned}
        onToggleCollapse={() => {
          setSidebarPinned((p) => {
            const next = !p;
            setSidebarCollapsed(!next);
            return next;
          });
        }}
        onOpenHelp={() => setShowHelp(true)}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {page === 'billing' && <Billing showToast={showToast} />}
        {page === 'products' && <Products showToast={showToast} />}
        {page === 'stock' && <Stock showToast={showToast} />}
        {page === 'customers' && <Customers showToast={showToast} />}
        {page === 'pricing' && <PersonalPricing showToast={showToast} />}
        {page === 'ledger' && <Ledger showToast={showToast} />}
        {page === 'sales' && <Sales showToast={showToast} />}
        {page === 'reports' && <Reports />}
        {page === 'settings' && <Settings showToast={showToast} />}
      </main>
      <button
        type="button"
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Exit full screen (F11)' : 'Full screen (F11)'}
        className="fixed bottom-3 right-3 z-50 w-10 h-10 rounded-xl bg-[#0b1220] text-white shadow-lg border border-white/20 flex items-center justify-center hover:bg-[#162032] opacity-100"
      >
        {isFullscreen ? <Minimize2 size={18} className="text-white" /> : <Maximize2 size={18} className="text-white" />}
      </button>
      {showHelp && <HelpModal page={page} onClose={() => setShowHelp(false)} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
