import { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function Settings({ showToast }) {
  const [info, setInfo] = useState(null);
  const [paths, setPaths] = useState({});
  const [backups, setBackups] = useState([]);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const [i, p, b] = await Promise.all([api.app.info(), api.backup.paths(), api.backup.list()]);
      setInfo(i); setPaths(p); setBackups(b);
    } catch (e) { showToast(e.message, 'error'); }
  };
  useEffect(() => { refresh(); }, []);

  const createBackup = async () => {
    setBusy(true);
    try {
      const res = await api.backup.create();
      showToast(`Backup created: ${res.path}`, 'success');
      refresh();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const restore = async (path) => {
    if (!confirm('Restore this backup? Current data will be replaced. Restart the app after restore.')) return;
    setBusy(true);
    try {
      await api.backup.restore(path);
      showToast('Restored. Please restart Alif POS.', 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="bg-white border-b border-slate-200 px-4 py-3 shrink-0">
        <h1 className="text-base font-semibold">Settings</h1>
      </div>
      <div className="p-4 space-y-4 max-w-3xl">
        <div className="panel p-4">
          <h2 className="text-sm font-semibold mb-2">Application</h2>
          <div className="text-sm text-slate-600 space-y-1">
            <div>Version: <strong>{info?.version || '—'}</strong></div>
            <div>Packaged: {info?.isPackaged ? 'Yes' : 'No (dev)'}</div>
            <div className="text-xs break-all text-slate-400">User data: {info?.userData}</div>
          </div>
        </div>

        <div className="panel p-4">
          <h2 className="text-sm font-semibold mb-1">Database &amp; backup</h2>
          <p className="text-xs text-slate-500 mb-3">
            The live database is stored outside the install folder so upgrades never wipe business data.
            Backups are full copies of the SQLite file.
          </p>
          <div className="text-xs text-slate-500 space-y-1 mb-3 break-all">
            <div><span className="font-medium text-slate-700">Database:</span> {paths.database || '—'}</div>
            <div><span className="font-medium text-slate-700">Backups folder:</span> {paths.backups || '—'}</div>
          </div>
          <button className="btn btn-primary" disabled={busy} onClick={createBackup}>Create backup now</button>
        </div>

        <div className="panel p-4">
          <h2 className="text-sm font-semibold mb-2">Backup history</h2>
          {backups.length === 0 ? (
            <p className="text-sm text-slate-400">No backups yet</p>
          ) : (
            <table className="pos-table">
              <thead><tr><th>File</th><th>Modified</th><th className="text-right">Size</th><th></th></tr></thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.path}>
                    <td className="text-xs font-mono">{b.name}</td>
                    <td className="text-xs text-slate-500">{b.mtime}</td>
                    <td className="text-right text-xs">{Math.round(b.size / 1024)} KB</td>
                    <td><button className="btn btn-ghost text-xs py-1" disabled={busy} onClick={() => restore(b.path)}>Restore</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel p-4">
          <h2 className="text-sm font-semibold mb-2">Demo data</h2>
          <p className="text-xs text-slate-500 mb-3">Sample products and customers for testing. Marked as demo and never mixed with production imports.</p>
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={async () => { const r = await api.demo.load(); showToast(r.alreadyLoaded ? 'Already loaded' : `Loaded ${r.count} products`, 'success'); }}>Load demo</button>
            <button className="btn btn-ghost" onClick={async () => { if (confirm('Remove demo records only?')) { await api.demo.reset(); showToast('Demo data removed', 'success'); } }}>Reset demo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
