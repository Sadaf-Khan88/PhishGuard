# PhishGuard

A local phishing heuristic analyzer for email, SMS, and URLs, created by me as an independent project. All analysis runs entirely in the browser — no backend, no external APIs, no live website inspection. Built for cybersecurity awareness and hackathon demonstration.

> PhishGuard is a heuristic screening tool, not a definitive verdict. It does not claim measured accuracy. Always verify suspicious messages through a known, official channel.

## Quick start (VS Code)

```bash
npm install
npm run dev
```

Open the printed URL in your browser.

## Commands

| Command | Description |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run test` | Run the Vitest test suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run typecheck` | TypeScript type checking (no emit) |
| `npm run lint` | ESLint |
| `npm run preview` | Preview the production build locally |

## Architecture

```
src/
  lib/
    analyzer.ts        Deterministic heuristic engine: URL/host parsing (tldts),
                       urgency/threat/credential/payment detection, domain comparison,
                       score calculation with deduplication and caps
    classifier.ts      Multinomial Naive Bayes — Laplace smoothing, log-space inference
    trainingData.ts    Demonstration training data (30 labeled rows)
    csvParser.ts       RFC 4180-ish CSV parser for custom training data import
    history.ts         Opt-in localStorage scan history (metadata only)
    quizData.ts        Awareness quiz questions and explanations
  components/
    Results.tsx        Score ring, findings, host details, model signal, JSON export
    ModelPanel.tsx     Classifier status, CSV import/retrain, data caveats
    ModelSignal.tsx    Separate "uncalibrated model signal" card
    ScoreBreakdown.tsx Collapsible scoring rules
    HistoryPanel.tsx   Opt-in history with clear/repair
    Quiz.tsx           Interactive awareness quiz
    Education.tsx      Phishing warning signs and limitations
    SeverityIcon.tsx   Severity icons and level badge
  App.tsx              Main application: tabs, input, analysis orchestration
```

### Scoring

The **heuristic concern score** (0–100) is a transparent, rules-based sum of weighted indicators:

| Indicator | Max points |
|---|---|
| Urgency / time pressure | 18 |
| Threats (legal, account, financial) | 20 |
| Credential requests (passwords, OTPs) | 25 |
| Prize or money bait | 18 |
| Unusual payment methods | 20 |
| Generic / impersonation phrasing | 12 |
| Raw IP address host | 12 |
| Embedded user:pass in URL | 18 |
| Punycode / internationalized domain | 8 |
| Excessive subdomain nesting | 10 |
| Link domain vs. claimed official mismatch | 15 |
| Sender vs. reply-to domain mismatch | 10 |
| Sender vs. claimed official domain mismatch | 12 |
| Non-HTTPS URL | 5 |

Related findings are deduplicated and their combined contribution is capped. Scores map to: **0–29 Low**, **30–59 Medium**, **60–100 High**. A low score means few indicators were found — not that the message is verified safe.

The **Naive Bayes classifier** produces a separate "uncalibrated model signal" shown alongside but not mixed into the heuristic score. Its output is a logistic-squashed log-likelihood ratio, not a validated probability.

### Classification model

- Multinomial Naive Bayes with Laplace (add-one) smoothing
- Log-space inference for numerical stability
- Tokenizer: lowercase, URL replacement, 2–40 character tokens
- Unseen tokens use a neutral default log-probability that does not skew either class
- Trained once on mount; can be retrained from imported CSV

## Replacing demonstration data

The bundled `src/lib/trainingData.ts` is **demonstration training data** — 30 hand-written rows. It cannot establish real-world reliability.

To use your own data:

1. Prepare a CSV file with `text,label` columns. Labels must be `phishing` or `legitimate`. Both classes are required.
2. Use the **Model & Data** panel in the app to import the CSV (max 2 MB, 5,000 rows).
3. Click **Confirm retrain** to retrain the classifier in memory.

Alternatively, replace the `DEMO_TRAINING_DATA` array in `src/lib/trainingData.ts` directly.

### Evaluating with an independent labeled test set

1. Prepare a held-out CSV with the same `text,label` format — do not reuse training rows.
2. Write a script or test that calls `train()` on your training data, then `classify()` on each test row.
3. Count true positives, false positives, true negatives, and false negatives.
4. Report precision, recall, F1, and accuracy **with the dataset size and source**.
5. Do not claim accuracy figures without this measured evaluation.

Imported data should be appropriately licensed and representative of your real message population. A biased dataset produces a biased classifier.

## Privacy behavior

- All analysis runs locally in the browser. No data is sent to any server.
- Submitted links are never fetched, opened, previewed, or made clickable.
- Messages render as plain text, never raw HTML.
- No message bodies, sender addresses, or URLs are persisted.
- Scan history (opt-in, off by default) stores only: timestamp, input type, score, and finding titles.
- History is capped at 20 entries in `localStorage` and can be cleared at any time.
- CSV import data stays in memory only — it is not stored or transmitted.

## Limitations

- No live website inspection — links are parsed structurally, not visited.
- No domain reputation lookup, blocklist check, or SSL certificate history.
- No attachment scanning or file analysis.
- No verified-safe verdict — a low score is not proof of safety.
- The Naive Bayes model is uncalibrated and trained on a tiny demonstration dataset.
- Heuristic rules can be evaded by sophisticated phishing.
- HTTPS is not treated as proof of trustworthiness.

## 2-minute hackathon demo

1. **Email tab → Load Example → "Phishing email (lookalike domain + credential request)"**
   - Click **Analyze**. Show the score ring (High concern), evidence-based findings, and the hostname detail card identifying `attacker.example` as the real registrable domain.
   - Point out the "Uncalibrated Model Signal" card — separate from the heuristic score.
2. **Email tab → Load Example → "Legitimate urgent IT notice"**
   - Click **Analyze**. Show the Low concern score — urgency alone does not produce a high score.
3. **URL tab → Load Example → "Phishing URL (embedded user:pass)"**
   - Click **Analyze**. Show the high-severity finding for embedded credentials.
4. **Download results as JSON** — click the button on the results panel.
5. **Scan History** — toggle it on, run another analysis, show the entry. Click **Clear history**.
6. **Model & Data** — explain the demonstration data caveat, show the CSV import controls.
7. **Quiz** — answer one question, show the explanation.

## Publishing the static build

The production build is a static site in `dist/`. To publish:

1. Run `npm run build`.
2. Deploy the contents of `dist/` to any static hosting provider:
   - **Netlify**: drag `dist/` into the Netlify dashboard, or connect the repo and set build command `npm run build` with publish directory `dist`.
   - **Vercel**: run `vercel --prod` in the project root (Vercel auto-detects Vite).
   - **GitHub Pages**: push `dist/` to a `gh-pages` branch or use a CI action.
   - **Cloudflare Pages**: connect the repo, set build command `npm run build`, output directory `dist`.
3. No environment variables or server configuration are required — everything runs client-side.

Do not publish automatically from this environment. Review the build output and deploy manually.
