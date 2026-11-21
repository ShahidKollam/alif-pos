import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Trash2, Printer, Save, Plus, X, MessageCircle, UserPlus } from 'lucide-react';
import { api } from '../utils/api';
import { formatINR, roundMoney } from '../utils/money';
import { loadBillingSession, saveBillingSession } from '../utils/billingPersist';

// Full file restored from Billing_v2.4.0.jsx artifact — if this is incomplete, pull Alif_POS_v2.4.0.zip
export { default } from './BillingFull.jsx';
