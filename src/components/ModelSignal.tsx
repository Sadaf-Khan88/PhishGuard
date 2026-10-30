import { Brain, Info } from 'lucide-react';
import type { ModelSignal as ModelSignalType } from '@/lib/classifier';

export function ModelSignalCard({ signal }: { signal: ModelSignalType }) {
  const isPhishing = signal.label === 'phishing';
  const barColor = isPhishing ? 'bg-red-400' : 'bg-emerald-400';
  const textColor = isPhishing ? 'text-red-300' : 'text-emerald-300';

  return (
    <div className="space-y-3 rounded-lg border border-slate-600 bg-slate-900 p-4">
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-sky-300" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-slate-100">
          Uncalibrated Model Signal
        </h3>
      </div>

      <p className="text-xs text-slate-500">
        This is a separate output from the Naive Bayes text classifier. It is <strong className="text-slate-400">not</strong> a
        validated fraud probability and is not included in the heuristic concern score above.
      </p>

      {/* Signal bar */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-400">Model leans: <strong className={textColor}>{isPhishing ? 'phishing' : 'legitimate'}</strong></span>
          <span className="text-slate-500 tabular-nums">{signal.signalScore}/100</span>
        </div>
        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full transition-all`}
            style={{ width: `${signal.signalScore}%` }}
            role="progressbar"
            aria-valuenow={signal.signalScore}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <p className="text-[10px] text-slate-600 mt-1">
          Log-likelihood ratio: {signal.logRatio >= 0 ? '+' : ''}{signal.logRatio.toFixed(2)} · Trained on {signal.trainingRows} rows · {signal.vocabularySize} tokens
        </p>
      </div>

      {/* Top contributing tokens */}
      {signal.topTokens.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-1.5">Top contributing tokens (log-probability difference):</p>
          <div className="flex flex-wrap gap-1.5">
            {signal.topTokens.map((t) => (
              <span
                key={t.token}
                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  t.weight > 0
                    ? 'border-red-500/30 bg-red-500/10 text-red-300'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                }`}
                title={`Weight: ${t.weight.toFixed(3)}`}
              >
                {t.token} ({t.weight > 0 ? '+' : ''}{t.weight.toFixed(2)})
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500 flex items-start gap-1.5 border-t border-slate-800 pt-2">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-600" />
        <span>
          Explanations in the findings above come from deterministic evidence checks, not from this model.
          The model signal is supplementary and should not override evidence-based judgment.
        </span>
      </p>
    </div>
  );
}
