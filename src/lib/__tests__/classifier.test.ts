import { describe, it, expect } from 'vitest';
import { train, classify, tokenize, type TrainingRow } from '@/lib/classifier';
import { DEMO_TRAINING_DATA } from '@/lib/trainingData';

describe('tokenizer', () => {
  it('lowercases and splits on non-word characters', () => {
    const tokens = tokenize('Hello, World! 123');
    expect(tokens).toContain('hello');
    expect(tokens).toContain('world');
    expect(tokens).toContain('123');
  });

  it('replaces URLs with a placeholder token', () => {
    const tokens = tokenize('Visit https://evil.example.com now');
    expect(tokens).toContain('urllink');
    expect(tokens).not.toContain('https');
  });

  it('filters very short and very long tokens', () => {
    const tokens = tokenize('a bb ' + 'x'.repeat(50));
    expect(tokens).not.toContain('a');
    expect(tokens).toContain('bb');
    expect(tokens).not.toContain('x'.repeat(50));
  });

  it('handles empty text', () => {
    expect(tokenize('')).toEqual([]);
  });
});

describe('training', () => {
  it('trains on demo data and produces valid state', () => {
    const state = train(DEMO_TRAINING_DATA);
    expect(state.totalRows).toBe(DEMO_TRAINING_DATA.length);
    expect(state.phishingRows).toBeGreaterThan(0);
    expect(state.legitimateRows).toBeGreaterThan(0);
    expect(state.vocabulary.size).toBeGreaterThan(10);
    expect(state.logPriorPhishing).toBeLessThan(0);
    expect(state.logPriorLegitimate).toBeLessThan(0);
  });

  it('handles empty training data', () => {
    const state = train([]);
    expect(state.totalRows).toBe(0);
    expect(state.vocabulary.size).toBe(0);
    const signal = classify(state, 'anything');
    expect(signal.signalScore).toBe(50);
    expect(signal.topTokens).toHaveLength(0);
  });

  it('token log probs are finite numbers', () => {
    const state = train(DEMO_TRAINING_DATA);
    for (const [, probs] of state.tokenLogProb) {
      expect(Number.isFinite(probs.phishing)).toBe(true);
      expect(Number.isFinite(probs.legitimate)).toBe(true);
    }
  });
});

describe('inference', () => {
  it('classifies a phishing-like message as phishing', () => {
    const state = train(DEMO_TRAINING_DATA);
    const signal = classify(state, 'URGENT: verify your password and OTP immediately. Your account will be suspended.');
    expect(signal.label).toBe('phishing');
    expect(signal.signalScore).toBeGreaterThan(50);
    expect(signal.logRatio).toBeGreaterThan(0);
  });

  it('classifies a benign message as legitimate', () => {
    const state = train(DEMO_TRAINING_DATA);
    const signal = classify(state, 'Hi Mom, I will be home by 6pm for dinner. See you soon!');
    expect(signal.label).toBe('legitimate');
    expect(signal.signalScore).toBeLessThan(50);
    expect(signal.logRatio).toBeLessThan(0);
  });

  it('handles unseen tokens without crashing or NaN', () => {
    const state = train(DEMO_TRAINING_DATA);
    const signal = classify(state, 'xyzzy frobnicate quuxwilbur');
    expect(Number.isFinite(signal.logRatio)).toBe(true);
    expect(Number.isFinite(signal.signalScore)).toBe(true);
    // Unseen tokens should not strongly skew the result
    expect(signal.signalScore).toBeGreaterThanOrEqual(0);
    expect(signal.signalScore).toBeLessThanOrEqual(100);
  });

  it('handles empty text at inference', () => {
    const state = train(DEMO_TRAINING_DATA);
    const signal = classify(state, '');
    // With no tokens, result is determined by priors only
    expect(Number.isFinite(signal.logRatio)).toBe(true);
    expect(signal.topTokens).toHaveLength(0);
  });

  it('returns top contributing tokens', () => {
    const state = train(DEMO_TRAINING_DATA);
    const signal = classify(state, 'password verify urgent account suspended');
    expect(signal.topTokens.length).toBeGreaterThan(0);
    expect(signal.topTokens.length).toBeLessThanOrEqual(5);
    for (const t of signal.topTokens) {
      expect(typeof t.token).toBe('string');
      expect(Number.isFinite(t.weight)).toBe(true);
    }
  });

  it('signalScore is bounded 0–100', () => {
    const state = train(DEMO_TRAINING_DATA);
    const signal = classify(
      state,
      'urgent password otp verify account suspended bitcoin prize legal action suspended suspended suspended'
    );
    expect(signal.signalScore).toBeGreaterThanOrEqual(0);
    expect(signal.signalScore).toBeLessThanOrEqual(100);
  });
});

describe('numerical stability', () => {
  it('does not produce Infinity or -Infinity for repetitive tokens', () => {
    const rows: TrainingRow[] = [
      { label: 'phishing', text: 'word '.repeat(1000) },
      { label: 'legitimate', text: 'other '.repeat(1000) },
    ];
    const state = train(rows);
    const signal = classify(state, 'word '.repeat(500));
    expect(Number.isFinite(signal.logRatio)).toBe(true);
    expect(Number.isFinite(signal.signalScore)).toBe(true);
  });
});
