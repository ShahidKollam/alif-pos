/** Local calendar helpers for date filters (YYYY-MM-DD). */

function pad(n) {
  return String(n).padStart(2, '0');
}

/** Local date as YYYY-MM-DD */
export function toYmd(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

/** Start of local day → ISO-ish string for SQLite comparisons */
export function dayStart(ymd) {
  if (!ymd) return undefined;
  return `${ymd} 00:00:00`;
}

/** End of local day */
export function dayEnd(ymd) {
  if (!ymd) return undefined;
  return `${ymd} 23:59:59`;
}

/** Extract YYYY-MM-DD from invoice/ledger datetime strings */
export function datePart(value) {
  if (!value) return '';
  const s = String(value).trim();
  if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  return toYmd(d);
}

export function isInRange(value, fromYmd, toYmd) {
  const part = datePart(value);
  if (!part) return !fromYmd && !toYmd;
  if (fromYmd && part < fromYmd) return false;
  if (toYmd && part > toYmd) return false;
  return true;
}

/**
 * Preset ranges. Empty from/to = all time.
 * @returns {{ id: string, label: string, from: string, to: string }}
 */
export function rangePreset(id, now = new Date()) {
  const today = toYmd(now);
  const y = now.getFullYear();
  const m = now.getMonth();

  if (id === 'all') return { id: 'all', label: 'All time', from: '', to: '' };

  if (id === 'today') return { id: 'today', label: 'Today', from: today, to: today };

  if (id === 'yesterday') {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    const ymd = toYmd(d);
    return { id: 'yesterday', label: 'Yesterday', from: ymd, to: ymd };
  }

  if (id === 'week') {
    const d = new Date(now);
    const day = d.getDay(); // 0 Sun
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = new Date(now);
    start.setDate(d.getDate() + mondayOffset);
    return { id: 'week', label: 'This week', from: toYmd(start), to: today };
  }

  if (id === 'month') {
    return {
      id: 'month',
      label: 'This month',
      from: `${y}-${pad(m + 1)}-01`,
      to: today
    };
  }

  if (id === 'last_month') {
    const firstThis = new Date(y, m, 1);
    const lastPrev = new Date(firstThis);
    lastPrev.setDate(0);
    const firstPrev = new Date(lastPrev.getFullYear(), lastPrev.getMonth(), 1);
    return {
      id: 'last_month',
      label: 'Last month',
      from: toYmd(firstPrev),
      to: toYmd(lastPrev)
    };
  }

  // custom — caller supplies from/to
  return { id: 'custom', label: 'Custom', from: '', to: '' };
}

export const DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
  { id: 'all', label: 'All' },
  { id: 'custom', label: 'Custom' }
];
