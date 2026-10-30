// Multinomial Naive Bayes text classifier — lightweight, in-memory, log-space inference.
// This is a demonstration classifier. It does not claim production accuracy.

export type Label = 'phishing' | 'legitimate';

export interface TrainingRow {
  text: string;
  label: Label;
}

export interface ModelSignal {
  label: Label;
  /** Uncalibrated log-likelihood ratio, not a probability. */
  logRatio: number;
  /** Crude 0–100 display signal derived from logRatio via logistic squashing. */
  signalScore: number;
  topTokens: { token: string; weight: number }[];
  vocabularySize: number;
  trainingRows: number;
}

export interface ClassifierState {
  logPriorPhishing: number;
  logPriorLegitimate: number;
  // log P(token | class) with Laplace smoothing
  tokenLogProb: Map<string, { phishing: number; legitimate: number }>;
  vocabulary: Set<string>;
  totalRows: number;
  phishingRows: number;
  legitimateRows: number;
}

// ---------- Tokenizer ----------

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' urllink ')
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && t.length <= 40);
}

// ---------- Training ----------

export function train(rows: TrainingRow[]): ClassifierState {
  const phishingCounts = new Map<string, number>();
  const legitCounts = new Map<string, number>();
  const vocabulary = new Set<string>();
  let phishingRows = 0;
  let legitimateRows = 0;
  let phishingTokens = 0;
  let legitTokens = 0;

  for (const row of rows) {
    const tokens = tokenize(row.text);
    const counts = row.label === 'phishing' ? phishingCounts : legitCounts;
    if (row.label === 'phishing') {
      phishingRows++;
      phishingTokens += tokens.length;
    } else {
      legitimateRows++;
      legitTokens += tokens.length;
    }
    for (const t of tokens) {
      vocabulary.add(t);
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }

  const vocabSize = Math.max(vocabulary.size, 1);
  const tokenLogProb = new Map<string, { phishing: number; legitimate: number }>();

  // Laplace smoothing: P(token | class) = (count + 1) / (totalClassTokens + vocabSize)
  for (const token of vocabulary) {
    const pCount = (phishingCounts.get(token) || 0) + 1;
    const lCount = (legitCounts.get(token) || 0) + 1;
    tokenLogProb.set(token, {
      phishing: Math.log(pCount / (phishingTokens + vocabSize)),
      legitimate: Math.log(lCount / (legitTokens + vocabSize)),
    });
  }

  const total = phishingRows + legitimateRows;
  return {
    logPriorPhishing: total > 0 ? Math.log(phishingRows / total) : 0,
    logPriorLegitimate: total > 0 ? Math.log(legitimateRows / total) : 0,
    tokenLogProb,
    vocabulary,
    totalRows: total,
    phishingRows,
    legitimateRows,
  };
}

// ---------- Inference (log-space) ----------

export function classify(state: ClassifierState, text: string): ModelSignal {
  if (state.totalRows === 0) {
    return { label: 'legitimate', logRatio: 0, signalScore: 50, topTokens: [], vocabularySize: 0, trainingRows: 0 };
  }

  const tokens = tokenize(text);
  let logPPhishing = state.logPriorPhishing;
  let logPLegit = state.logPriorLegitimate;
  const vocabSize = Math.max(state.vocabulary.size, 1);
  // For unseen tokens, use smoothed default: 1 / (classTokens + vocabSize)
  // Approximate class token totals from stored data is not available at inference;
  // use a neutral unseen-word log-prob that doesn't skew either class:
  const unseenLogProb = -Math.log(vocabSize);

  const tokenWeights: Map<string, number> = new Map();

  for (const token of tokens) {
    const probs = state.tokenLogProb.get(token);
    const lp = probs ? probs.phishing : unseenLogProb;
    const ll = probs ? probs.legitimate : unseenLogProb;
    logPPhishing += lp;
    logPLegit += ll;
    const weight = lp - ll;
    if (Math.abs(weight) > 0.01) {
      tokenWeights.set(token, (tokenWeights.get(token) || 0) + weight);
    }
  }

  const logRatio = logPPhishing - logPLegit;
  // Logistic squash to 0–100 for display only
  const signalScore = Math.round((1 / (1 + Math.exp(-logRatio))) * 100);

  const topTokens = [...tokenWeights.entries()]
    .map(([token, weight]) => ({ token, weight }))
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, 5);

  return {
    label: logRatio >= 0 ? 'phishing' : 'legitimate',
    logRatio,
    signalScore,
    topTokens,
    vocabularySize: state.vocabulary.size,
    trainingRows: state.totalRows,
  };
}
