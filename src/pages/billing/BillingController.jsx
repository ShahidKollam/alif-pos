import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Trash2, Plus, X, UserPlus, RotateCcw } from 'lucide-react';
import { api } from '../../utils/api';
import { formatINR, roundMoney } from '../../utils/money';
import { saveBillingSession } from '../../utils/billingPersist';
import PersonalPricePrompt from '../../components/PersonalPricePrompt';
import BillSummaryPanel from '../../components/BillSummaryPanel';
import {
  emptyRow,
  newTab,
  tabLabel,
  migrateItems,
  initFromStorage,
  setLastSaved,
  getLastSavedId,
  resetWalkInSeq,
  nextRowKey,
  nextTabId,
} from './helpers';
import useBillCalculations from './hooks/useBillCalculations';
import BillingTabs from './components/BillingTabs';
import AddCustomerModal from './components/AddCustomerModal';
import ReturnModal from './components/ReturnModal';

export default function Billing({ showToast }) {
  const initial = useRef(null);
  if (!initial.current) initial.current = initFromStorage();
  const [tabs, setTabs] = useState(initial.current.tabs);
  const [activeId, setActiveId] = useState(initial.current.activeId);
  const [showCust, setShowCust] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [activeRowKey, setActiveRowKey] = useState(null);
  const [rowQuery, setRowQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [sugUp, setSugUp] = useState(false);
  const [addCustOpen, setAddCustOpen] = useState(false);
  const [addCustName, setAddCustName] = useState('');
  const [addCustPhone, setAddCustPhone] = useState('');
  const [addCustSaving, setAddCustSaving] = useState(false);
  const [custHighlight, setCustHighlight] = useState(0);
  const [ppMap, setPpMap] = useState({});
  const [ppPrompt, setPpPrompt] = useState(null);
  const [ppBusy, setPpBusy] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const suggestionsRef = useRef([]);
  const highlightRef = useRef(-1);
  const listBoxRef = useRef(null);
  const productInputRefs = useRef({});
  const qtyInputRefs = useRef({});
  const verifyRefs = useRef({});
  const wrRef = useRef(null);
  const customerInputRef = useRef(null);
  const billNoInputRef = useRef(null);
  const focusTargetRef = useRef('customer');
  const tableWrapRef = useRef(null);
  const tab = tabs.find((t) => t.id === activeId) || tabs[0];
  const activeIdRef = useRef(activeId);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  useEffect(() => { suggestionsRef.current = suggestions; }, [suggestions]);
  useEffect(() => { highlightRef.current = highlight; }, [highlight]);
  useEffect(() => {
    if (highlight < 0 || !listBoxRef.current) return;
    const el = listBoxRef.current.querySelector(`[data-sug-idx="${highlight}"]`);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlight]);
  useEffect(() => { saveBillingSession(tabs, activeId); }, [tabs, activeId]);

  const updateTab = useCallback((id, patch) => { setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))); }, []);

  useEffect(() => { api.customers.list({ activeOnly: true }).then(setCustomers).catch(() => {}); }, []);
  useEffect(() => {
    if (!tab?.customerId) { setPpMap({}); return; }
    let cancelled = false;
    api.personalPrices.mapForCustomer(tab.customerId).then((m) => {
      if (!cancelled) setPpMap(m && typeof m === 'object' ? m : {});
    }).catch(() => { if (!cancelled) setPpMap({}); });
    return () => { cancelled = true; };
  }, [tab?.customerId]);
  useEffect(() => {
    if (!tab) return;
    const target = focusTargetRef.current;
    if (!target) return;
    focusTargetRef.current = null;
    const t = setTimeout(() => {
      if (target === 'billNo') {
        billNoInputRef.current?.focus();
        billNoInputRef.current?.select?.();
      } else if (target === 'customer') {
        customerInputRef.current?.focus();
      }
    }, 60);
    return () => clearTimeout(t);
  }, [tab?.id]);

  useEffect(() => {
    const onNew = () => addTab();
    const onNewSearch = () => addTab({ focus: 'billNo' });
    const onSave = () => saveBill();
    const onAddCust = () => openAddCustomer();
    const onLast = () => openLastSavedBill();
    const onReturn = () => setReturnOpen(true);
    window.addEventListener('alif:new-bill', onNew);
    window.addEventListener('alif:new-bill-search', onNewSearch);
    window.addEventListener('alif:save-bill', onSave);
    window.addEventListener('alif:open-add-customer', onAddCust);
    window.addEventListener('alif:open-last-bill', onLast);
    window.addEventListener('alif:open-return', onReturn);
    const key = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') { e.preventDefault(); addTab(); }
      if (e.key === 'F4' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        addTab({ focus: 'billNo' });
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); window.dispatchEvent(new CustomEvent('alif:save-bill')); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        closeTab(activeIdRef.current);
      }
    };
    window.addEventListener('keydown', key, true);
    return () => {
      window.removeEventListener('alif:new-bill', onNew);
      window.removeEventListener('alif:new-bill-search', onNewSearch);
      window.removeEventListener('alif:save-bill', onSave);
      window.removeEventListener('alif:open-add-customer', onAddCust);
      window.removeEventListener('alif:open-last-bill', onLast);
      window.removeEventListener('alif:open-return', onReturn);
      window.removeEventListener('keydown', key, true);
    };
  }, [tab?.id, tab?.items, saving, activeId, tabs.length]);

  // NOTE: Full BillingController body continues below in repository file restore.
  // This intermediate commit is incomplete - will be replaced immediately.
  return null;
}
