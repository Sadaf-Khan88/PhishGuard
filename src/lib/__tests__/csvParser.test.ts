import { describe, it, expect } from 'vitest';
import { parseTrainingCsv } from '@/lib/csvParser';

describe('CSV parser', () => {
  it('parses valid CSV with header', () => {
    const csv = 'text,label\n"Hello world",legitimate\n"Verify your password",phishing';
    const result = parseTrainingCsv(csv);
    expect(result.accepted).toBe(2);
    expect(result.rejected).toBe(0);
    expect(result.rows[0].text).toBe('Hello world');
    expect(result.rows[0].label).toBe('legitimate');
    expect(result.rows[1].label).toBe('phishing');
  });

  it('handles quoted commas inside fields', () => {
    const csv = 'text,label\n"Dear customer, verify your account",phishing';
    const result = parseTrainingCsv(csv);
    expect(result.accepted).toBe(1);
    expect(result.rows[0].text).toBe('Dear customer, verify your account');
  });

  it('handles quoted newlines inside fields', () => {
    const csv = 'text,label\n"Line one\nLine two",legitimate';
    const result = parseTrainingCsv(csv);
    expect(result.accepted).toBe(1);
    expect(result.rows[0].text).toBe('Line one\nLine two');
  });

  it('handles escaped double-quotes', () => {
    const csv = 'text,label\n"She said ""hi""",legitimate';
    const result = parseTrainingCsv(csv);
    expect(result.accepted).toBe(1);
    expect(result.rows[0].text).toBe('She said "hi"');
  });

  it('rejects invalid labels', () => {
    const csv = 'text,label\n"Good message",benign\n"Bad message",phishing';
    const result = parseTrainingCsv(csv);
    expect(result.accepted).toBe(1);
    expect(result.rejected).toBe(1);
    expect(result.rows[0].label).toBe('phishing');
  });

  it('rejects rows with empty text', () => {
    const csv = 'text,label\n"",legitimate\n"Real text",phishing';
    const result = parseTrainingCsv(csv);
    expect(result.accepted).toBe(1);
    expect(result.rejected).toBe(1);
  });

  it('requires both classes', () => {
    const csv = 'text,label\n"Phish 1",phishing\n"Phish 2",phishing';
    const result = parseTrainingCsv(csv);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes('both'))).toBe(true);
  });

  it('handles no header gracefully', () => {
    const csv = '"Hello world",legitimate\n"Verify password",phishing';
    const result = parseTrainingCsv(csv);
    expect(result.accepted).toBe(2);
    expect(result.errors.some((e) => e.includes('header'))).toBe(true);
  });

  it('rejects empty file', () => {
    const result = parseTrainingCsv('');
    expect(result.accepted).toBe(0);
    expect(result.errors).toContain('File is empty.');
  });

  it('caps at 5000 rows', () => {
    let csv = 'text,label\n';
    for (let i = 0; i < 5500; i++) {
      csv += `"msg ${i}",${i % 2 === 0 ? 'phishing' : 'legitimate'}\n`;
    }
    const result = parseTrainingCsv(csv);
    expect(result.accepted).toBe(5000);
    expect(result.errors.some((e) => e.includes('5,000'))).toBe(true);
  });
});
