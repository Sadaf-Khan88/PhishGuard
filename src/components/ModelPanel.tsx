import { useState, useRef } from 'react';
import { Database, Upload, RefreshCw, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { ClassifierState } from '@/lib/classifier';
import { parseTrainingCsv, type CsvParseResult } from '@/lib/csvParser';

interface ModelPanelProps {
  state: ClassifierState | null;
  dataSource: 'demo' | 'imported';
  onRetrainWithImported: (rows: { text: string; label: 'phishing' | 'legitimate' }[]) => void;
  onResetToDemo: () => void;
}

export function ModelPanel({ state, dataSource, onRetrainWithImported, onResetToDemo }: ModelPanelProps) {
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setStatusMsg(null);
    if (file.size > 2 * 1024 * 1024) {
      setParseResult({ rows: [], errors: ['File exceeds the 2 MB limit.'], accepted: 0, rejected: 0 });
      setFileName(file.name);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const result = parseTrainingCsv(text);
      setParseResult(result);
      setFileName(file.name);
    };
    reader.onerror = () => {
      setStatusMsg('Could not read the file.');
    };
    reader.readAsText(file);
  };

  const confirmRetrain = () => {
    if (!parseResult || parseResult.rows.length === 0) return;
    onRetrainWithImported(parseResult.rows);
    setParseResult(null);
    setFileName(null);
    setStatusMsg('Model retrained with imported data.');
    if (fileRef.current) fileRef.current.value = '';
  };

  const cancelImport = () => {
    setParseResult(null);
    setFileName(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleReset = () => {
    onResetToDemo();
    setParseResult(null);
    setFileName(null);
    setStatusMsg('Model reset to demonstration training data.');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <section className="space-y-4 rounded-lg border border-slate-700 bg-slate-900 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Database className="w-5 h-5 text-teal-400" />
        <h2 className="text-base font-semibold text-slate-100">Model &amp; Data</h2>
      </div>

      <p className="text-sm text-slate-400">
        The classifier is a lightweight multinomial Naive Bayes model running entirely in your browser.
        Its output is labeled <strong className="text-slate-300">"uncalibrated model signal"</strong> — it
        is not a validated fraud probability. The main risk score remains transparent and heuristic-based.
      </p>

      {/* Current model status */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3 text-sm space-y-1">
        <div className="flex items-center gap-2 text-slate-300">
          {dataSource === 'demo' ? (
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
          )}
          <span>
            Active data: <strong className="text-slate-100">{dataSource === 'demo' ? 'Demonstration training data' : 'Imported CSV data'}</strong>
          </span>
        </div>
        {state && (
          <dl className="text-xs text-slate-500 grid grid-cols-2 gap-x-4 gap-y-0.5 pl-6">
            <dt>Training rows:</dt>
            <dd className="text-slate-400">{state.totalRows}</dd>
            <dt>Phishing rows:</dt>
            <dd className="text-slate-400">{state.phishingRows}</dd>
            <dt>Legitimate rows:</dt>
            <dd className="text-slate-400">{state.legitimateRows}</dd>
            <dt>Vocabulary:</dt>
            <dd className="text-slate-400">{state.vocabulary.size} tokens</dd>
          </dl>
        )}
      </div>

      {/* CSV import */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-200">Import custom training data (CSV)</label>
        <p className="text-xs text-slate-500">
          File must have <code className="text-slate-400">text,label</code> columns. Labels must be
          "phishing" or "legitimate". Both classes required. Max 2 MB, 5,000 rows. Data stays in memory only.
        </p>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-slate-700 px-4 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 focus-within:ring-2 focus-within:ring-teal-300">
            <Upload className="w-4 h-4" />
            Choose CSV file
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-700 px-4 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
          >
            <RefreshCw className="w-4 h-4" />
            Reset to demo data
          </button>
        </div>
      </div>

      {/* Parse results */}
      {fileName && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3 text-sm space-y-2">
          <p className="text-slate-300">
            File: <span className="text-slate-100">{fileName}</span>
          </p>
          {parseResult ? (
            <>
              <div className="flex gap-4 text-xs">
                <span className="text-emerald-400">Accepted: {parseResult.accepted}</span>
                <span className="text-red-400">Rejected: {parseResult.rejected}</span>
              </div>
              {parseResult.errors.length > 0 && (
                <ul className="text-xs text-amber-300/90 space-y-1">
                  {parseResult.errors.map((err, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      {err}
                    </li>
                  ))}
                </ul>
              )}
              {parseResult.rows.length > 0 && (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={confirmRetrain}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-300 px-3 text-xs font-semibold text-slate-950 transition-colors hover:bg-teal-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Confirm retrain ({parseResult.rows.length} rows)
                  </button>
                  <button
                    type="button"
                    onClick={cancelImport}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-700 px-3 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-500">Parsing...</p>
          )}
        </div>
      )}

      {statusMsg && (
        <p className="text-xs text-teal-300/90 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          {statusMsg}
        </p>
      )}

      {/* Data caveats */}
      <div className="text-xs text-slate-500 border-t border-slate-800 pt-3 space-y-1.5">
        <p className="flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-400">Demonstration data cannot establish real-world reliability.</strong>
            It is illustrative only and not representative of live phishing diversity.
          </span>
        </p>
        <p className="flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-400">Imported data should be appropriately licensed and representative</strong>
            of your real message population. A biased dataset produces a biased classifier.
          </span>
        </p>
      </div>
    </section>
  );
}
