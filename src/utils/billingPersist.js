const KEY = 'alif_pos_billing_session_v1';

export function loadBillingSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.tabs) || data.tabs.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveBillingSession(tabs, activeId) {
  try {
    // Do not persist transient search text in a noisy way — still ok to save
    const payload = {
      tabs: tabs.map((t) => ({
        ...t,
        search: t.search || ''
      })),
      activeId,
      savedAt: Date.now()
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('Could not save billing session', e);
  }
}

export function clearBillingSession() {
  try {
    localStorage.removeItem(KEY);
  } catch (_) {}
}
