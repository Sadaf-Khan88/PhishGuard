import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadHistory,
  saveHistory,
  addToHistory,
  clearHistory,
  isHistoryCorrupt,
  repairHistory,
  MAX_HISTORY_ENTRIES,
  type HistoryEntry,
} from '@/lib/history';

const STORAGE_KEY = 'phishguard_history_v1';

function makeEntry(id: string): HistoryEntry {
  return {
    id,
    timestamp: Date.now(),
    inputType: 'email',
    score: 42,
    level: 'Medium',
    findingTitles: ['Test finding'],
  };
}

describe('scan history', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns empty array when no history stored', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('adds and retrieves entries', () => {
    const updated = addToHistory({
      inputType: 'email',
      score: 55,
      level: 'Medium',
      findingTitles: ['Urgency detected'],
    });
    expect(updated).toHaveLength(1);
    expect(updated[0].score).toBe(55);
    expect(updated[0].inputType).toBe('email');
    // Reload from storage
    const loaded = loadHistory();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].score).toBe(55);
  });

  it('caps at MAX_HISTORY_ENTRIES', () => {
    for (let i = 0; i < MAX_HISTORY_ENTRIES + 5; i++) {
      addToHistory({
        inputType: 'sms',
        score: i,
        level: 'Low',
        findingTitles: [],
      });
    }
    const loaded = loadHistory();
    expect(loaded).toHaveLength(MAX_HISTORY_ENTRIES);
    // Most recent entries should be first
    expect(loaded[0].score).toBe(MAX_HISTORY_ENTRIES + 4);
  });

  it('clears history', () => {
    addToHistory({
      inputType: 'email',
      score: 10,
      level: 'Low',
      findingTitles: [],
    });
    clearHistory();
    expect(loadHistory()).toEqual([]);
  });

  it('handles corrupt storage gracefully', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    expect(isHistoryCorrupt()).toBe(true);
    const repaired = repairHistory();
    expect(repaired).toEqual([]);
    expect(isHistoryCorrupt()).toBe(false);
  });

  it('handles non-array storage gracefully', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: 'an array' }));
    expect(loadHistory()).toEqual([]);
  });

  it('filters invalid entries from storage', () => {
    const mixed = JSON.stringify([
      { timestamp: 123, inputType: 'email', score: 50, level: 'Low', findingTitles: [], id: 'a' },
      { notValid: true },
      { timestamp: 'not-a-number', inputType: 'email', score: 50, level: 'Low', findingTitles: [], id: 'c' },
    ]);
    localStorage.setItem(STORAGE_KEY, mixed);
    const loaded = loadHistory();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('a');
  });

  it('stores only metadata — no message bodies, sender addresses, or URLs', () => {
    addToHistory({
      inputType: 'email',
      score: 80,
      level: 'High',
      findingTitles: ['Credential request detected'],
    });
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    // The stored JSON should only contain metadata fields
    const parsed = JSON.parse(raw!) as HistoryEntry[];
    const entry = parsed[0];
    expect(entry).toHaveProperty('timestamp');
    expect(entry).toHaveProperty('inputType');
    expect(entry).toHaveProperty('score');
    expect(entry).toHaveProperty('level');
    expect(entry).toHaveProperty('findingTitles');
    // No body/sender/url fields should exist
    expect(entry).not.toHaveProperty('body');
    expect(entry).not.toHaveProperty('sender');
    expect(entry).not.toHaveProperty('url');
    expect(entry).not.toHaveProperty('messageText');
  });

  it('is disabled by default — no data in localStorage before opt-in', () => {
    // Fresh state: nothing should be stored
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(loadHistory()).toEqual([]);
  });
});
