import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Trash2, Plus, X, UserPlus } from 'lucide-react';
import { api } from '../utils/api';
import { formatINR, roundMoney } from '../utils/money';
import { saveBillingSession } from '../utils/billingPersist';
import { computeBillTotals } from '../utils/billTotals';
import PersonalPricePrompt from '../components/PersonalPricePrompt';
import BillSummaryPanel from '../components/BillSummaryPanel';
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
} from './billing/helpers';

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
  const suggestionsRef = useRef([]);
  const highlightRef = useRef(-1);
  const listBoxRef = useRef(null);
  const productInputRefs = useRef({});
  const qtyInputRefs = useRef({});
  const verifyRefs = useRef({});
  const wrRef = useRef(null);
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
    const firstEmpty = (tab.items || []).find((i) => !i.productId);
    const key = firstEmpty?.rowKey || tab.items?.[0]?.rowKey;
    if (!key) return;
    const t = setTimeout(() => { productInputRefs.current[key]?.focus(); }, 60);
    return () => clearTimeout(t);
  }, [tab?.id]);

  // NOTE: Full Billing body continues in repo local file - this restore is incomplete if truncated.
  // See following push for complete file.
  return <div className="p-4 text-sm">Billing loading…</div>;
}
