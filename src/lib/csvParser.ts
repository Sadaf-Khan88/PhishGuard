import type { TrainingRow, Label } from './classifier';

export interface CsvParseResult {
  rows: TrainingRow[];
  errors: string[];
  accepted: number;
  rejected: number;
}

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 5000;
const VALID_LABELS = new Set<string>(['phishing', 'legitimate']);

// RFC 4180-ish CSV parser supporting quoted fields with embedded commas,
// newlines, and escaped double-quotes.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\r') {
        // skip; handle \n below
      } else if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }
  // last field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function parseTrainingCsv(fileText: string): CsvParseResult {
  const errors: string[] = [];
  const rows: TrainingRow[] = [];
  let rejected = 0;
  let hasPhishing = false;
  let hasLegitimate = false;

  if (fileText.length > MAX_FILE_BYTES) {
    return {
      rows: [],
      errors: [`File exceeds the 2 MB limit (received ${(fileText.length / 1024 / 1024).toFixed(1)} MB).`],
      accepted: 0,
      rejected: 0,
    };
  }

  const raw = parseCsv(fileText);
  if (raw.length === 0) {
    return { rows: [], errors: ['File is empty.'], accepted: 0, rejected: 0 };
  }

  // Find header
  const header = raw[0].map((c) => c.trim().toLowerCase());
  const textIdx = header.indexOf('text');
  const labelIdx = header.indexOf('label');

  let startRow = 0;
  if (textIdx === -1 || labelIdx === -1) {
    // No header — assume text,label column order
    errors.push('No "text,label" header found. Assuming columns are [text, label].');
    startRow = 0;
  } else {
    startRow = 1;
  }

  for (let i = startRow; i < raw.length; i++) {
    const cols = raw[i];
    if (cols.length < 2) {
      rejected++;
      continue;
    }
    const text = (cols[textIdx >= 0 ? textIdx : 0] || '').trim();
    const labelRaw = (cols[labelIdx >= 0 ? labelIdx : 1] || '').trim().toLowerCase() as Label;

    if (!text) {
      rejected++;
      continue;
    }
    if (!VALID_LABELS.has(labelRaw)) {
      rejected++;
      continue;
    }

    if (labelRaw === 'phishing') hasPhishing = true;
    if (labelRaw === 'legitimate') hasLegitimate = true;

    rows.push({ text, label: labelRaw as Label });
  }

  if (rows.length > MAX_ROWS) {
    errors.push(`File exceeds the ${MAX_ROWS.toLocaleString()} row limit. Only the first ${MAX_ROWS.toLocaleString()} valid rows will be used.`);
    rows.length = MAX_ROWS;
  }

  if (rows.length > 0 && (!hasPhishing || !hasLegitimate)) {
    errors.push('Training data must include both "phishing" and "legitimate" labeled rows. Some rows were rejected.');
  }

  return { rows, errors, accepted: rows.length, rejected };
}
