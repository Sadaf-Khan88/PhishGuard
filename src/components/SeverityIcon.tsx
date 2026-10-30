import { AlertTriangle, Info, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { Severity } from '@/lib/analyzer';

const config: Record<Severity, { icon: typeof Info; color: string; label: string }> = {
  high: { icon: ShieldAlert, color: 'border-red-500/40 bg-red-500/10 text-red-200', label: 'High severity' },
  medium: { icon: AlertTriangle, color: 'border-amber-500/40 bg-amber-500/10 text-amber-200', label: 'Medium severity' },
  low: { icon: AlertTriangle, color: 'border-teal-400/30 bg-teal-400/10 text-teal-200', label: 'Low severity' },
  info: { icon: Info, color: 'border-slate-600 bg-slate-800 text-slate-300', label: 'Information' },
};

export function SeverityIcon({ severity }: { severity: Severity }) {
  const { icon: Icon, color, label } = config[severity];
  return (
    <span className={`inline-flex min-h-6 shrink-0 items-center gap-1.5 rounded-full border px-2 text-[11px] font-medium ${color}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

export function LevelBadge({ level }: { level: 'Low' | 'Medium' | 'High' }) {
  const cfg =
    level === 'High'
      ? { icon: ShieldAlert, color: 'bg-red-500/15 text-red-300 border-red-500/40' }
      : level === 'Medium'
      ? { icon: AlertTriangle, color: 'bg-amber-500/15 text-amber-300 border-amber-500/40' }
      : { icon: ShieldCheck, color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' };
  const { icon: Icon, color } = cfg;
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${color}`}>
      <Icon className="w-4 h-4" aria-hidden="true" />
      {level} concern
    </span>
  );
}
