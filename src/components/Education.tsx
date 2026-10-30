import { BookOpen, Eye, Lock, AlertCircle } from 'lucide-react';

const signs: { title: string; desc: string }[] = [
  { title: 'Urgency & threats', desc: 'Messages that demand immediate action or threaten account closure, fines, or legal consequences.' },
  { title: 'Credential requests', desc: 'Any email or SMS asking for your password, OTP, PIN, or verification code.' },
  { title: 'Domain mismatches', desc: 'Links or sender addresses that do not match the organization\u2019s real domain name.' },
  { title: 'Too-good-to-be-true bait', desc: 'Prizes, lottery wins, refunds, or inheritances you did not sign up for.' },
  { title: 'Unusual payment methods', desc: 'Requests for gift cards, cryptocurrency, or wire transfers — hard to reverse and hard to trace.' },
  { title: 'Lookalike domains', desc: 'Domains that mimic a brand with extra characters, punycode, or extra subdomains.' },
];

export function Education() {
  return (
    <section className="space-y-4 rounded-lg border border-slate-700 bg-slate-900 p-4 sm:p-5">
      <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-teal-400" />
        Phishing warning signs &amp; limitations
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {signs.map((s) => (
          <div key={s.title} className="rounded-lg bg-slate-800/40 border border-slate-700/60 p-3">
            <h3 className="text-sm font-medium text-slate-200">{s.title}</h3>
            <p className="text-xs text-slate-400 mt-1">{s.desc}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2 text-xs text-slate-400 border-t border-slate-800 pt-3">
        <p className="flex items-start gap-2">
          <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-300">HTTPS is not proof of trust.</strong> A padlock only means the
            connection is encrypted. Scammers obtain free certificates too.
          </span>
        </p>
        <p className="flex items-start gap-2">
          <Eye className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-300">No score means verified safe.</strong> A low concern score
            indicates few indicators were found, not that the message is legitimate. Sophisticated phishing
            can evade heuristic detection.
          </span>
        </p>
        <p className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-300">Limitations.</strong> This tool runs entirely in your browser and
            uses pattern-based heuristics. It does not check blocklists, domain reputation, or SSL certificate
            history. Use it as a first-pass screen, not a definitive verdict. When in doubt, contact the
            organization through a known, official channel.
          </span>
        </p>
      </div>
    </section>
  );
}
