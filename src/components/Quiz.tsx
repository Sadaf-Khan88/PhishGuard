import { useState } from 'react';
import { HelpCircle, Check, X, RotateCcw } from 'lucide-react';
import { QUIZ_QUESTIONS } from '@/lib/quizData';

export function Quiz() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = QUIZ_QUESTIONS.filter((q) => answers[q.id] === q.correctIndex).length;
  const allAnswered = QUIZ_QUESTIONS.every((q) => answers[q.id] !== undefined);

  const handleSubmit = () => {
    if (allAnswered) setSubmitted(true);
  };

  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
  };

  return (
    <section className="space-y-4 rounded-lg border border-slate-700 bg-slate-900 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <HelpCircle className="w-5 h-5 text-teal-400" />
        <h2 className="text-base font-semibold text-slate-100">Phishing Awareness Quiz</h2>
      </div>

      {submitted && (
        <div className="rounded-lg border border-teal-500/40 bg-teal-500/10 px-4 py-3 text-sm text-teal-200 flex items-center justify-between">
          <span>
            You scored <strong>{score}</strong> out of {QUIZ_QUESTIONS.length}
            {score === QUIZ_QUESTIONS.length ? ' — perfect!' : score >= QUIZ_QUESTIONS.length / 2 ? ' — well done!' : ' — review the explanations below.'}
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-slate-700 px-3 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retake
          </button>
        </div>
      )}

      <ol className="space-y-4 list-none">
        {QUIZ_QUESTIONS.map((q, qi) => {
          const selected = answers[q.id];
          return (
            <li key={q.id} className="space-y-2">
              <p className="text-sm text-slate-200">
                <span className="text-slate-500 font-medium">{qi + 1}. </span>
                {q.question}
              </p>
              <div className="space-y-1.5">
                {q.options.map((opt, oi) => {
                  const isSelected = selected === oi;
                  const isCorrect = oi === q.correctIndex;
                  let cls = 'border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-800/70';
                  if (submitted) {
                    if (isCorrect) {
                      cls = 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
                    } else if (isSelected) {
                      cls = 'border-red-500/40 bg-red-500/10 text-red-200';
                    } else {
                      cls = 'border-slate-700 bg-slate-800/20 text-slate-500';
                    }
                  } else if (isSelected) {
                    cls = 'border-teal-500/40 bg-teal-500/10 text-teal-200';
                  }
                  return (
                    <button
                      key={oi}
                      type="button"
                      disabled={submitted}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                      className={`flex min-h-11 w-full items-start gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${cls} ${
                        !submitted ? 'focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500' : 'cursor-default'
                      }`}
                    >
                      {submitted && isCorrect && <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                      {submitted && isSelected && !isCorrect && <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <p className="text-xs text-slate-400 bg-slate-800/30 rounded-md p-2.5 border border-slate-800">
                  <strong className="text-slate-300">Explanation: </strong>
                  {q.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {!submitted && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allAnswered}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-teal-300 px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
        >
          <Check className="w-4 h-4" />
          Submit answers
        </button>
      )}
      {!allAnswered && !submitted && (
        <p className="text-xs text-slate-500">Answer all {QUIZ_QUESTIONS.length} questions to submit.</p>
      )}
    </section>
  );
}
