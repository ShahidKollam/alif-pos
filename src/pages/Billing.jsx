/**
 * TEMPORARY STUB — Billing.jsx was corrupted during a large-file push.
 *
 * To restore the full Billing page with Personal Pricing:
 * 1. Extract Alif_POS_v2.4.0.zip
 * 2. Copy src/pages/Billing.jsx from the zip over this file
 *    OR copy artifacts/Billing_v2.4.0.jsx if you have it
 * 3. Fully quit Electron and run: npm run electron:dev
 *
 * The personalPrices IPC handlers ARE registered in electron/ipc/ —
 * after a full restart, Personal Pricing save will work.
 */
import { useEffect } from 'react';

export default function Billing({ showToast }) {
  useEffect(() => {
    showToast?.('Billing.jsx is a stub. Copy full file from Alif_POS_v2.4.0.zip', 'error');
  }, [showToast]);
  return (
    <div className="p-6 text-black">
      <h1 className="text-lg font-bold mb-2">Billing source missing</h1>
      <p className="text-sm mb-2">Restore from <code>Alif_POS_v2.4.0.zip</code> → <code>src/pages/Billing.jsx</code></p>
      <p className="text-sm text-slate-600">Personal Pricing IPC is registered; restart Electron fully after restore.</p>
    </div>
  );
}
