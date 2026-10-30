// Opt-in local scan history. Stores only metadata — never message bodies,
// sender addresses, or URLs. Maximum 20 entries in localStorage.

export interface HistoryEntry {
  id: string;
  timestamp: number;
  inputType: 'email' | 'sms' | 'url';
  score: number;
  level: 'Low' | 'Medium' | 'High';
  findingTitles: string[];
}

const STORAGE_KEY = 'phishguard_history_v1';
const MAX_ENTRIES = 20;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate entries
    const valid = parsed.filter(
      (e: unknown): e is HistoryEntry =>
        typeof e === 'object' &&
        e !== null &&
        typeof (e as HistoryEntry).timestamp === 'number' &&
        typeof (e as HistoryEntry).inputType === 'string' &&
        typeof (e as HistoryEntry).score === 'number'
    );
    return valid.slice(0, MAX_ENTRIES);
  } catch {
    // Corrupt or inaccessible storage — start clean
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Storage may be full or disabled — silently ignore
  }
}

export function addToHistory(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): HistoryEntry[] {
  const current = loadHistory();
  const newEntry: HistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  };
  const updated = [newEntry, ...current].slice(0, MAX_ENTRIES);
  saveHistory(updated);
  return updated;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function isHistoryCorrupt(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    JSON.parse(raw);
    return false;
  } catch {
    return true;
  }
}

export function repairHistory(): HistoryEntry[] {
  if (isHistoryCorrupt()) {
    clearHistory();
  }
  return loadHistory();
}

export { MAX_ENTRIES as MAX_HISTORY_ENTRIES };
