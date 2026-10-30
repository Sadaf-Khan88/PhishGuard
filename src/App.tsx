import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Mail,
  MessageSquare,
  Link as LinkIcon,
  ShieldCheck,
  Trash2,
  Sparkles,
  Loader2,
  MailCheck,
  ChevronDown,
} from 'lucide-react';
import {
  analyzeEmail,
  analyzeSms,
  analyzeUrl,
  validateMessage,
  validateUrl,
  EMAIL_EXAMPLE,
  SMS_EXAMPLE,
  URL_EXAMPLE,
  EMAIL_LEGIT_URGENT_EXAMPLE,
  EMAIL_AMBIGUOUS_EXAMPLE,
  type AnalysisResult,
} from '@/lib/analyzer';
import {
  train,
  classify,
  type ClassifierState,
  type ModelSignal as ModelSignalType,
  type TrainingRow,
} from '@/lib/classifier';
import { DEMO_TRAINING_DATA } from '@/lib/trainingData';
import {
  loadHistory,
  addToHistory,
  clearHistory as clearHistoryStorage,
  type HistoryEntry,
} from '@/lib/history';
import { Results } from '@/components/Results';
import { Education } from '@/components/Education';
import { ModelPanel } from '@/components/ModelPanel';
import { Quiz } from '@/components/Quiz';
import { HistoryPanel } from '@/components/HistoryPanel';

type Tab = 'email' | 'sms' | 'url';

const TABS: { id: Tab; label: string; icon: typeof Mail }[] = [
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'sms', label: 'SMS', icon: MessageSquare },
  { id: 'url', label: 'URL', icon: LinkIcon },
];

const MAX_MESSAGE = 10000;
const MAX_URL = 2048;

const EXAMPLE_OPTIONS: { label: string; tab: Tab; load: (setters: ExampleSetters) => void }[] = [
  {
    label: 'Phishing email (lookalike domain + credential request)',
    tab: 'email',
    load: (s) => {
      s.setEmailBody(EMAIL_EXAMPLE);
      s.setSender('security@paypa1-support.example');
      s.setReplyTo('billing@secure-payments.example');
      s.setOfficialDomain('paypal.com');
    },
  },
  {
    label: 'Legitimate urgent IT notice',
    tab: 'email',
    load: (s) => {
      s.setEmailBody(EMAIL_LEGIT_URGENT_EXAMPLE);
      s.setSender('it-support@company.example');
      s.setReplyTo('');
      s.setOfficialDomain('company.example');
    },
  },
  {
    label: 'Ambiguous rewards newsletter',
    tab: 'email',
    load: (s) => {
      s.setEmailBody(EMAIL_AMBIGUOUS_EXAMPLE);
      s.setSender('newsletter@deals-today.example');
      s.setReplyTo('');
      s.setOfficialDomain('');
    },
  },
  {
    label: 'Phishing SMS (urgent payment)',
    tab: 'sms',
    load: (s) => {
      s.setSmsText(SMS_EXAMPLE);
    },
  },
  {
    label: 'Phishing URL (embedded user:pass)',
    tab: 'url',
    load: (s) => {
      s.setUrlInput(URL_EXAMPLE);
    },
  },
];

interface ExampleSetters {
  setEmailBody: (v: string) => void;
  setSender: (v: string) => void;
  setReplyTo: (v: string) => void;
  setOfficialDomain: (v: string) => void;
  setSmsText: (v: string) => void;
  setUrlInput: (v: string) => void;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('email');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [modelSignal, setModelSignal] = useState<ModelSignalType | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Classifier state
  const [classifierState, setClassifierState] = useState<ClassifierState | null>(null);
  const [dataSource, setDataSource] = useState<'demo' | 'imported'>('demo');

  // History
  const [historyEnabled, setHistoryEnabled] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);

  // Example dropdown
  const [exampleOpen, setExampleOpen] = useState(false);

  // Email fields
  const [emailBody, setEmailBody] = useState('');
  const [sender, setSender] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [officialDomain, setOfficialDomain] = useState('');

  // SMS field
  const [smsText, setSmsText] = useState('');

  // URL field
  const [urlInput, setUrlInput] = useState('');

  // Train classifier once on mount with demo data
  useEffect(() => {
    setClassifierState(train(DEMO_TRAINING_DATA));
  }, []);

  const switchTab = (t: Tab) => {
    setTab(t);
    setResult(null);
    setModelSignal(null);
    setError(null);
  };

  const clearAll = () => {
    setEmailBody('');
    setSender('');
    setReplyTo('');
    setOfficialDomain('');
    setSmsText('');
    setUrlInput('');
    setResult(null);
    setModelSignal(null);
    setError(null);
  };

  const exampleSetters: ExampleSetters = {
    setEmailBody,
    setSender,
    setReplyTo,
    setOfficialDomain,
    setSmsText,
    setUrlInput,
  };

  const loadExample = () => {
    setExampleOpen((v) => !v);
  };

  const loadSpecificExample = (opt: (typeof EXAMPLE_OPTIONS)[number]) => {
    setResult(null);
    setModelSignal(null);
    setError(null);
    setTab(opt.tab);
    opt.load(exampleSetters);
    setExampleOpen(false);
  };

  const runAnalysis = useCallback(() => {
    setError(null);
    setResult(null);
    setModelSignal(null);

    let validationError: string | null = null;
    let compute: () => AnalysisResult;
    let textForModel: string | null = null;

    if (tab === 'email') {
      validationError = validateMessage(emailBody);
      compute = () =>
        analyzeEmail({
          body: emailBody,
          sender: sender.trim() || undefined,
          replyTo: replyTo.trim() || undefined,
          officialDomain: officialDomain.trim() || undefined,
        });
      textForModel = emailBody;
    } else if (tab === 'sms') {
      validationError = validateMessage(smsText);
      compute = () => analyzeSms({ text: smsText });
      textForModel = smsText;
    } else {
      validationError = validateUrl(urlInput);
      compute = () => analyzeUrl({ url: urlInput });
      // URL-only analysis does not use the classifier
      textForModel = null;
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    setAnalyzing(true);
    setTimeout(() => {
      try {
        const res = compute();
        setResult(res);

        // Run classifier for email/sms text only
        if (textForModel && classifierState) {
          setModelSignal(classify(classifierState, textForModel));
        } else {
          setModelSignal(null);
        }

        // Add to history if enabled
        if (historyEnabled) {
          const findingTitles = res.findings.map((f) => f.reason);
          const updated = addToHistory({
            inputType: tab,
            score: res.score,
            level: res.level,
            findingTitles,
          });
          setHistoryEntries(updated);
        }
      } catch (e) {
        setError('Analysis failed: ' + (e instanceof Error ? e.message : 'unknown error'));
      }
      setAnalyzing(false);
    }, 350);
  }, [tab, emailBody, sender, replyTo, officialDomain, smsText, urlInput, classifierState, historyEnabled]);

  const handleRetrainWithImported = (rows: TrainingRow[]) => {
    setClassifierState(train(rows));
    setDataSource('imported');
  };

  const handleResetToDemo = () => {
    setClassifierState(train(DEMO_TRAINING_DATA));
    setDataSource('demo');
  };

  const handleHistoryToggle = (enabled: boolean) => {
    setHistoryEnabled(enabled);
    if (enabled) {
      setHistoryEntries(loadHistory());
    } else {
      clearHistoryStorage();
      setHistoryEntries([]);
    }
  };

  const charCount = useMemo(() => {
    const text = tab === 'email' ? emailBody : tab === 'sms' ? smsText : urlInput;
    return text.length;
  }, [tab, emailBody, smsText, urlInput]);

  const charLimit = tab === 'url' ? MAX_URL : MAX_MESSAGE;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-teal-400/30 bg-teal-400/10">
            <ShieldCheck className="h-5 w-5 text-teal-300" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight text-slate-50">PhishGuard</h1>
            <p className="mt-0.5 text-xs text-slate-400">
              Created by me · Local phishing heuristic analyzer
            </p>
          </div>
          <div className="ml-auto hidden items-center gap-2 text-xs text-slate-300 md:flex">
            <ShieldCheck className="h-4 w-4 text-teal-300" aria-hidden="true" />
            Runs entirely in your browser — no data sent anywhere
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-7 px-4 py-5 sm:px-6 sm:py-7">
        <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="min-w-0 space-y-3">
            <div
              role="tablist"
              aria-label="Analyzer type"
              className="flex gap-1 rounded-lg border border-slate-700 bg-slate-900 p-1"
            >
              {TABS.map(({ id, label, icon: Icon }, index) => (
                <button
                  key={id}
                  id={`tab-${id}`}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  aria-controls="analyzer-panel"
                  tabIndex={tab === id ? 0 : -1}
                  onClick={() => switchTab(id)}
                  onKeyDown={(event) => {
                    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
                    event.preventDefault();
                    const nextIndex = event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? TABS.length - 1
                        : (index + (event.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
                    const nextTab = TABS[nextIndex];
                    switchTab(nextTab.id);
                    document.getElementById(`tab-${nextTab.id}`)?.focus();
                  }}
                  className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${
                    tab === id
                      ? 'border-teal-300 bg-teal-300 text-slate-950 shadow-sm'
                      : 'border-transparent text-slate-300 hover:bg-slate-800 hover:text-slate-50'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>

            <section
              id="analyzer-panel"
              role="tabpanel"
              aria-labelledby={`tab-${tab}`}
              className="space-y-4 rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-sm sm:p-5"
            >
          {tab === 'email' && (
            <>
              <div>
                <label htmlFor="email-body" className="block text-sm font-medium text-slate-200 mb-1.5">
                  Message body
                </label>
                <textarea
                  id="email-body"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value.slice(0, MAX_MESSAGE))}
                  rows={8}
                  className="min-h-40 w-full resize-y rounded-md border border-slate-700 bg-slate-950 px-3 py-3 font-mono text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                  placeholder="Paste the full email message here..."
                  aria-describedby="char-count"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="sender" className="mb-1.5 block text-sm font-medium text-slate-300">
                    Sender address (optional)
                  </label>
                  <input
                    id="sender"
                    type="text"
                    value={sender}
                    onChange={(e) => setSender(e.target.value)}
                    className="h-11 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                    placeholder="noreply@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="reply-to" className="mb-1.5 block text-sm font-medium text-slate-300">
                    Reply-to address (optional)
                  </label>
                  <input
                    id="reply-to"
                    type="text"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    className="h-11 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                    placeholder="reply@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="official-domain" className="mb-1.5 block text-sm font-medium text-slate-300">
                    Official domain (optional)
                  </label>
                  <input
                    id="official-domain"
                    type="text"
                    value={officialDomain}
                    onChange={(e) => setOfficialDomain(e.target.value)}
                    className="h-11 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                    placeholder="paypal.com"
                  />
                </div>
              </div>
            </>
          )}

          {tab === 'sms' && (
            <div>
              <label htmlFor="sms-text" className="block text-sm font-medium text-slate-200 mb-1.5">
                Message text
              </label>
              <textarea
                id="sms-text"
                value={smsText}
                onChange={(e) => setSmsText(e.target.value.slice(0, MAX_MESSAGE))}
                rows={5}
                className="min-h-32 w-full resize-y rounded-md border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                placeholder="Paste the SMS message text here..."
              />
            </div>
          )}

          {tab === 'url' && (
            <div>
              <label htmlFor="url-input" className="block text-sm font-medium text-slate-200 mb-1.5">
                URL to analyze
              </label>
              <input
                id="url-input"
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value.slice(0, MAX_URL))}
                className="h-12 w-full rounded-md border border-slate-700 bg-slate-950 px-3 font-mono text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                placeholder="https://example.com/path"
              />
            </div>
          )}

          {/* Char count */}
          <div id="char-count" className="flex items-center justify-between gap-3 text-xs text-slate-400">
            <span>
              {charCount.toLocaleString()} / {charLimit.toLocaleString()} characters
            </span>
            {charCount > charLimit * 0.9 && (
              <span className="text-amber-300">Approaching limit</span>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={runAnalysis}
              disabled={analyzing}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-teal-300 px-4 text-sm font-semibold text-slate-950 shadow-sm transition-colors hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 sm:w-auto"
            >
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <MailCheck className="w-4 h-4" />}
              {analyzing ? 'Analyzing...' : 'Analyze'}
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-600 px-4 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 sm:w-auto"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={loadExample}
                aria-expanded={exampleOpen}
                aria-haspopup="menu"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-600 px-4 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 sm:w-auto"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                Load Example
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${exampleOpen ? 'rotate-180' : ''}`} />
              </button>
              {exampleOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-full z-20 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl"
                >
                  {EXAMPLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      role="menuitem"
                      onClick={() => loadSpecificExample(opt)}
                      className="min-h-11 w-full px-3 py-2 text-left text-sm text-slate-200 transition-colors hover:bg-slate-800 hover:text-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-300"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            >
              {error}
            </div>
          )}
            </section>
          </div>

          <section aria-label="Analysis results" className="min-w-0">
        {analyzing && !result && (
          <div role="status" aria-live="polite" className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-slate-700 bg-slate-900 p-6 text-slate-300">
            <Loader2 className="h-7 w-7 animate-spin text-teal-300" aria-hidden="true" />
            <p className="text-sm">Analyzing locally...</p>
          </div>
        )}

        {!analyzing && !result && !error && (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-6 text-center">
            <ShieldCheck className="h-8 w-8 text-slate-400" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Ready for analysis</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">
                Results will include a heuristic concern score, evidence, and recommended actions.
              </p>
            </div>
            <p className="text-xs text-slate-500">A low score does not confirm a message is safe.</p>
          </div>
        )}

        {result && !analyzing && (
          <Results result={result} modelSignal={modelSignal} inputType={tab} />
        )}
          </section>
        </section>

        <div className="space-y-5">
        {/* Model & Data panel */}
        <ModelPanel
          state={classifierState}
          dataSource={dataSource}
          onRetrainWithImported={handleRetrainWithImported}
          onResetToDemo={handleResetToDemo}
        />

        {/* Scan History */}
        <HistoryPanel
          enabled={historyEnabled}
          onToggle={handleHistoryToggle}
          entries={historyEntries}
          onEntriesChange={setHistoryEntries}
        />

        {/* Quiz */}
        <Quiz />

        {/* Education */}
        <Education />
        </div>

        <footer className="text-center text-xs text-slate-600 py-4">
          PhishGuard is a heuristic screening tool, not a definitive verdict. Always verify suspicious
          messages through an official channel.
        </footer>
      </main>
    </div>
  );
}
