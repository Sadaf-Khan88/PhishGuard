import { Server, Link2, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import type { AnalysisResult, HostDetail } from '@/lib/analyzer';
import type { ModelSignal as ModelSignalType } from '@/lib/classifier';
import { SeverityIcon, LevelBadge } from './SeverityIcon';
import { ScoreBreakdown } from './ScoreBreakdown';
import { ModelSignalCard } from './ModelSignal';

function ScoreRing({ score, level }: { score: number; level: 'Low' | 'Medium' | 'High' }) {
  const color =
    level === 'High' ? 'stroke-red-400' : level === 'Medium' ? 'stroke-amber-400' : 'stroke-emerald-400';
  const textColor =
    level === 'High' ? 'text-red-300' : level === 'Medium' ? 'text-amber-300' : 'text-emerald-300';
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative h-28 w-28 shrink-0" role="img" aria-label={`Heuristic concern score: ${score} out of 100, ${level} concern`}>
      <svg className="h-28 w-28 -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={radius} className="stroke-slate-800" strokeWidth="8" fill="none" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          className={color}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold tabular-nums ${textColor}`}>{score}</span>
        <span className="text-[10px] uppercase tracking-wide text-slate-500">/ 100</span>
      </div>
    </div>
  );
}

function HostCard({ host }: { host: HostDetail }) {
  const flags: { label: string; show: boolean }[] = [
    { label: 'IP address host', show: host.isIpAddress },
    { label: 'Embedded user:pass', show: host.hasUserInfo },
    { label: 'Punycode (IDN)', show: host.isPunycode },
    { label: `${host.subdomainDepth} subdomain level${host.subdomainDepth !== 1 ? 's' : ''}`, show: host.subdomainDepth >= 2 },
    { label: 'HTTPS', show: host.usesHttps },
    { label: 'No HTTPS', show: !host.usesHttps },
  ];
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
      <div className="flex items-center gap-2 text-slate-200 text-sm font-medium">
        <Link2 className="w-4 h-4 text-teal-400 shrink-0" />
        <span className="break-all">{host.host}</span>
      </div>
      <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-slate-400">
        <div>
          <dt className="inline text-slate-500">Registrable domain: </dt>
          <dd className="inline text-slate-300">{host.registrableDomain || 'n/a'}</dd>
        </div>
        <div>
          <dt className="inline text-slate-500">Protocol: </dt>
          <dd className="inline text-slate-300">{host.protocol}</dd>
        </div>
      </dl>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {flags
          .filter((f) => f.show)
          .map((f) => (
            <span
              key={f.label}
              className="text-[10px] px-2 py-0.5 rounded-full border border-slate-600 bg-slate-700/50 text-slate-300"
            >
              {f.label}
            </span>
          ))}
      </div>
    </div>
  );
}

export function Results({
  result,
  modelSignal,
  inputType,
}: {
  result: AnalysisResult;
  modelSignal?: ModelSignalType | null;
  inputType: 'email' | 'sms' | 'url';
}) {
  const sorted = [...result.findings].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2, info: 3 };
    return order[a.severity] - order[b.severity];
  });
  const assessment = !result.sufficientEvidence
    ? 'Evidence is limited, so this score may not reflect the message’s full risk.'
    : result.level === 'High'
      ? 'Strong warning indicators were found; avoid acting until you verify through an official channel.'
      : result.level === 'Medium'
        ? 'Review the warning indicators before taking action.'
        : 'No common warning indicators were found; this does not confirm the message is safe.';

  const downloadJson = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      inputType,
      heuristicScore: result.score,
      level: result.level,
      sufficientEvidence: result.sufficientEvidence,
      warningCount: result.warningCount,
      findings: result.findings.map((f) => ({
        id: f.id,
        severity: f.severity,
        reason: f.reason,
        evidence: f.evidence,
        action: f.action,
      })),
      hosts: result.hosts.map((h) => ({
        host: h.host,
        registrableDomain: h.registrableDomain,
        isIpAddress: h.isIpAddress,
        hasUserInfo: h.hasUserInfo,
        isPunycode: h.isPunycode,
        subdomainDepth: h.subdomainDepth,
        protocol: h.protocol,
        usesHttps: h.usesHttps,
      })),
      domainComparison: result.domainComparison,
      senderReplyToComparison: result.senderReplyToComparison,
      modelSignal: modelSignal
        ? {
            label: modelSignal.label,
            logRatio: modelSignal.logRatio,
            signalScore: modelSignal.signalScore,
            topTokens: modelSignal.topTokens,
            note: 'Uncalibrated model signal — not a validated fraud probability.',
          }
        : null,
      disclaimer: 'This is a heuristic screening tool, not a definitive verdict.',
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phishguard-result-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Score header */}
      <div className="flex flex-col items-center gap-4 rounded-lg border border-slate-700 bg-slate-900 p-4 sm:flex-row sm:p-5">
        <ScoreRing score={result.score} level={result.level} />
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h2 className="text-base font-semibold text-slate-50">Heuristic concern score</h2>
            <LevelBadge level={result.level} />
          </div>
          <p className="mt-2 text-sm font-medium text-slate-200">{assessment}</p>
          <p className="mt-1 text-xs text-slate-400">
            {result.warningCount} warning indicator{result.warningCount !== 1 ? 's' : ''} · Rules-based score, not a probability or guarantee of safety.
          </p>
          {!result.sufficientEvidence && (
            <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-amber-200 sm:justify-start">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              Insufficient evidence for a confident assessment — see notes below.
            </p>
          )}
        </div>
      </div>

      {/* Download + Model signal row */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={downloadJson}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          <Download className="w-3.5 h-3.5" />
          Download results as JSON
        </button>
      </div>

      {modelSignal && <ModelSignalCard signal={modelSignal} />}

      <ScoreBreakdown />

      {/* Domain comparisons */}
      {(result.domainComparison || result.senderReplyToComparison) && (
        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 space-y-2">
          {result.domainComparison && (
            <p className="text-sm text-slate-300">
              <strong className="text-slate-200">Domain check: </strong>
              {result.domainComparison}
            </p>
          )}
          {result.senderReplyToComparison && (
            <p className="text-sm text-slate-300">
              <strong className="text-slate-200">Sender / reply-to: </strong>
              {result.senderReplyToComparison}
            </p>
          )}
        </div>
      )}

      {/* Host details */}
      {result.hosts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Server className="w-4 h-4 text-teal-400" />
            Extracted hostname details ({result.hosts.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {result.hosts.map((h, i) => (
              <HostCard key={`${h.host}-${i}`} host={h} />
            ))}
          </div>
        </div>
      )}

      {/* Findings */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-200">
          Findings &amp; recommended actions ({sorted.length})
        </h3>
        {sorted.length === 0 ? (
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 flex items-start gap-3 text-sm text-slate-400">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>
              No indicators were detected. This means the analysis did not find common phishing patterns —
              it does <strong className="text-slate-300">not</strong> confirm the message is safe. When in doubt,
              verify through an official channel.
            </span>
          </div>
        ) : (
          <ul className="space-y-2">
            {sorted.map((f) => (
              <li
                key={f.id}
                className="rounded-lg border border-slate-700 bg-slate-900 p-3 sm:p-4"
              >
                <div className="flex flex-col items-start gap-2 sm:flex-row sm:gap-3">
                  <SeverityIcon severity={f.severity} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100">{f.reason}</p>
                    {f.evidence && (
                      <p className="mt-2 break-words rounded-md border border-slate-700 bg-slate-950/70 p-2 text-xs text-slate-300 [overflow-wrap:anywhere]">
                        <span className="font-medium text-slate-400">Exact evidence: </span>
                        {f.evidence}
                      </p>
                    )}
                    <p className="mt-2 border-t border-slate-800 pt-2 text-xs leading-relaxed text-teal-200">
                      <span className="font-semibold text-teal-300">Next action: </span>
                      {f.action}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
