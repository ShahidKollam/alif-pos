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

// TEMP: full file restore in progress — see artifacts/BillingController_v247_FULL.jsx
export default function Billing({ showToast }) {
  return (
    <div className="p-6 text-sm text-red-700 bg-red-50">
      BillingController was corrupted during an automated push. Restore from
      <code className="mx-1">artifacts/BillingController_v247_FULL.jsx</code>
      or:
      <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto">git checkout ab4ded2b570c1d2a70a2993d610e982a731d5290 -- src/pages/billing/BillingController.jsx</pre>
    </div>
  );
}
