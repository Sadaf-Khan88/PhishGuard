import { useState, useEffect } from 'react';
import { History, Trash2, Clock, AlertTriangle } from 'lucide-react';
import {
  loadHistory,
  clearHistory,
  repairHistory,
  isHistoryCorrupt,
  type HistoryEntry,
} from '@/lib/history';
import { MAX_HISTORY_ENTRIES } from '@/lib/history';

interface HistoryPanelProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  entries: HistoryEntry[];
  onEntriesChange: (entries: HistoryEntry[]) => void;
}

export function HistoryPanel({ enabled, onToggle, entries, onEntriesChange }: HistoryPanelProps) {
  const [corrupt, setCorrupt] = useState(false);

  useEffect(() => {
    setCorrupt(isHistoryCorrupt());
  }, []);

  const handleToggle = () => {
    if (!enabled) {
      // Enabling — repair if corrupt, then load
      const repaired = repairHistory();
      setCorrupt(false);
      onEntriesChange(repaired);
      onToggle(true);
    } else {
      // Disabling — clear stored data and in-memory entries
      clearHistory();
      onEntriesChange([]);
      onToggle(false);
    }
  };

  const handleClear = () => {
    clearHistory();
    onEntriesChange([]);
  };

  const handleRepair = () => {
    const repaired = repairHistory();
    setCorrupt(false);
    onEntriesChange(repaired);
  };

  const levelColor = (level: string) =>
    level === 'High' ? 'text-red-300' : level === 'Medium' ? 'text-amber-300' : 'text-emerald-300';

  return (
    <section className="space-y-4 rounded-lg border border-slate-700 bg-slate-900 p-4 sm:p-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-teal-400" />
          <h2 className="text-base font-semibold text-slate-100">Scan History</h2>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
          <button
            type="button"
            role="switch"
            aria-label={enabled ? 'Disable scan history' : 'Enable scan history'}
            aria-checked={enabled}
            onClick={handleToggle}
            className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${
              enabled ? 'bg-teal-600' : 'bg-slate-700'
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
          {enabled ? 'Enabled' : 'Disabled'}
        </label>
      </div>

      {enabled && corrupt && (
        <div
          role="alert"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 flex items-start gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>Stored history appears to be corrupted or unreadable.</p>
            <button
              type="button"
              onClick={handleRepair}
              className="mt-1.5 inline-flex min-h-10 items-center gap-1.5 rounded-md border border-amber-500/40 px-3 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              Repair &amp; reset
            </button>
          </div>
        </div>
      )}

      {enabled && !corrupt && (
        <>
          <p className="text-xs text-slate-500">
            Stores only timestamp, input type, score, and finding titles — never message bodies,
            sender addresses, or URLs. Max {MAX_HISTORY_ENTRIES} entries, kept locally in your browser.
          </p>
          {entries.length > 0 ? (
            <>
              <ul className="space-y-1.5">
                {entries.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(e.timestamp).toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 capitalize">{e.inputType}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-lg font-bold tabular-nums ${levelColor(e.level)}`}>{e.score}</span>
                      <span className={`text-xs ${levelColor(e.level)}`}>{e.level} concern</span>
                    </div>
                    {e.findingTitles.length > 0 && (
                      <p className="text-xs text-slate-500 mt-1 truncate" title={e.findingTitles.join(', ')}>
                        {e.findingTitles.slice(0, 3).join(', ')}
                        {e.findingTitles.length > 3 ? ` (+${e.findingTitles.length - 3} more)` : ''}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-700 px-3 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear history
              </button>
            </>
          ) : (
            <p className="text-xs text-slate-600">No scans recorded yet.</p>
          )}
        </>
      )}

      {!enabled && (
        <p className="text-xs text-slate-600">
          History is off. Enable it to store scan metadata locally (no message content is ever saved).
        </p>
      )}
    </section>
  );
}
