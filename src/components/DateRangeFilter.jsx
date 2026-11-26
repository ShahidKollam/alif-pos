import { Calendar } from 'lucide-react';
import { DATE_PRESETS, rangePreset } from '../utils/dateRange';

/**
 * Compact date range control for Sales / Ledger / Reports toolbars.
 * Presets + optional custom from/to inputs.
 *
 * @param {string} preset - active preset id
 * @param {string} from - YYYY-MM-DD
 * @param {string} to - YYYY-MM-DD
 * @param {(next: { preset: string, from: string, to: string }) => void} onChange
 */
export default function DateRangeFilter({ preset = 'month', from = '', to = '', onChange }) {
  function applyPreset(id) {
    if (id === 'custom') {
      onChange?.({
        preset: 'custom',
        from: from || rangePreset('month').from,
        to: to || rangePreset('month').to
      });
      return;
    }
    const r = rangePreset(id);
    onChange?.({ preset: r.id, from: r.from, to: r.to });
  }

  function setFrom(v) {
    onChange?.({ preset: 'custom', from: v, to });
  }

  function setTo(v) {
    onChange?.({ preset: 'custom', from, to: v });
  }

  const showCustom = preset === 'custom';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 mr-0.5">
        <Calendar size={13} className="text-slate-400" />
        Date
      </span>
      <div className="inline-flex flex-wrap items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
        {DATE_PRESETS.map((p) => {
          const active = preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={`date-preset-btn px-2 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap ${
                active
                  ? 'date-preset-active shadow-sm'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {showCustom && (
        <div className="inline-flex items-center gap-1.5 ml-0.5">
          <input
            type="date"
            className="field py-1 px-2 text-[12px] w-[132px] bg-white"
            value={from || ''}
            onChange={(e) => setFrom(e.target.value)}
            title="From"
          />
          <span className="text-[11px] text-slate-400 font-medium">to</span>
          <input
            type="date"
            className="field py-1 px-2 text-[12px] w-[132px] bg-white"
            value={to || ''}
            onChange={(e) => setTo(e.target.value)}
            title="To"
          />
        </div>
      )}
      {!showCustom && (from || to) && (
        <span className="text-[11px] text-slate-500 tabular-nums hidden sm:inline">
          {from || '…'} → {to || '…'}
        </span>
      )}
    </div>
  );
}
