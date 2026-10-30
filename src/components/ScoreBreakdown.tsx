import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const rules: { range: string; label: string; detail: string }[] = [
  { range: '0–29', label: 'Low concern', detail: 'Few or weak indicators detected. Not a guarantee of safety.' },
  { range: '30–59', label: 'Medium concern', detail: 'Multiple or moderate indicators. Investigate before acting.' },
  { range: '60–100', label: 'High concern', detail: 'Strong indicators present. Treat as likely phishing.' },
];

const factors: { factor: string; weight: string }[] = [
  { factor: 'Urgency / time pressure language', weight: 'up to 18' },
  { factor: 'Threats (legal, account, financial)', weight: 'up to 20' },
  { factor: 'Requests for passwords / OTPs', weight: 'up to 25' },
  { factor: 'Prize or money bait', weight: 'up to 18' },
  { factor: 'Unusual payment methods', weight: 'up to 20' },
  { factor: 'Generic / impersonation phrasing', weight: 'up to 12' },
  { factor: 'Link uses raw IP address', weight: '12' },
  { factor: 'Embedded username/password in URL', weight: '18' },
  { factor: 'Punycode / internationalized domain', weight: '8' },
  { factor: 'Excessive subdomain nesting', weight: 'up to 10' },
  { factor: 'Link domain vs. claimed official domain mismatch', weight: '15' },
  { factor: 'Sender vs. reply-to domain mismatch', weight: '10' },
  { factor: 'Sender vs. claimed official domain mismatch', weight: '12' },
  { factor: 'Non-HTTPS URL', weight: '5' },
];

export function ScoreBreakdown() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
        aria-expanded={open}
      >
        {open ? <ChevronDown className="w-4 h-4 text-teal-400" /> : <ChevronRight className="w-4 h-4 text-teal-400" />}
        How this score works
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 text-sm text-slate-300">
          <p className="text-slate-400">
            This is a <strong className="text-slate-200">heuristic concern score</strong>, not a probability.
            It sums weighted indicators found in the message and caps the total at 100. A low score means
            few indicators were found — it does <strong className="text-slate-200">not</strong> mean the message
            is verified safe.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {rules.map((r) => (
              <div key={r.range} className="rounded-md bg-slate-800/60 border border-slate-700 px-3 py-2">
                <div className="font-medium text-slate-100">Score {r.range}</div>
                <div className="text-teal-400 text-xs font-medium mt-0.5">{r.label}</div>
                <div className="text-xs text-slate-400 mt-1">{r.detail}</div>
              </div>
            ))}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Weighted factors
            </div>
            <div className="grid gap-1 sm:grid-cols-2 text-xs">
              {factors.map((f) => (
                <div key={f.factor} className="flex justify-between gap-2 border-b border-slate-800 py-1">
                  <span className="text-slate-300">{f.factor}</span>
                  <span className="text-slate-500 tabular-nums">+{f.weight}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Related findings are deduplicated and their combined contribution is capped so a single technique
            cannot inflate the score on its own.
          </p>
        </div>
      )}
    </div>
  );
}
