import { describe, it, expect } from 'vitest';
import {
  validateMessage,
  validateUrl,
  analyzeEmail,
  analyzeSms,
  analyzeUrl,
  extractUrls,
  extractHostDetail,
  EMAIL_LEGIT_URGENT_EXAMPLE,
} from '@/lib/analyzer';

describe('input validation', () => {
  it('rejects empty message', () => {
    expect(validateMessage('')).toBe('Message is empty.');
  });

  it('rejects oversized message', () => {
    const long = 'a'.repeat(10001);
    expect(validateMessage(long)).toMatch(/exceeds/);
  });

  it('accepts valid message', () => {
    expect(validateMessage('hello')).toBeNull();
  });

  it('rejects empty URL', () => {
    expect(validateUrl('')).toBe('URL is empty.');
  });

  it('rejects non-http protocol', () => {
    expect(validateUrl('ftp://example.com')).toMatch(/http and https/);
  });

  it('rejects malformed URL', () => {
    expect(validateUrl('not-a-url')).toMatch(/not valid/);
  });

  it('rejects oversized URL', () => {
    const long = 'https://example.com/' + 'a'.repeat(2050);
    expect(validateUrl(long)).toMatch(/exceeds/);
  });

  it('accepts valid https URL', () => {
    expect(validateUrl('https://example.com')).toBeNull();
  });
});

describe('domain parsing with multi-part suffixes', () => {
  it('extracts registrable domain for .co.uk', () => {
    const detail = extractHostDetail('https://shop.example.co.uk/path');
    expect(detail).not.toBeNull();
    expect(detail!.registrableDomain).toBe('example.co.uk');
    expect(detail!.subdomainDepth).toBe(1);
  });

  it('extracts registrable domain for .com.au', () => {
    const detail = extractHostDetail('https://mail.example.com.au');
    expect(detail).not.toBeNull();
    expect(detail!.registrableDomain).toBe('example.com.au');
  });

  it('handles plain .com', () => {
    const detail = extractHostDetail('https://example.com');
    expect(detail).not.toBeNull();
    expect(detail!.registrableDomain).toBe('example.com');
    expect(detail!.subdomainDepth).toBe(0);
  });
});

describe('misleading hostname', () => {
  it('identifies the real registrable domain, not the prefix brand', () => {
    const detail = extractHostDetail('https://trusted.example.attacker.example/login');
    expect(detail).not.toBeNull();
    // The registrable domain is attacker.example, not trusted.example
    expect(detail!.registrableDomain).toBe('attacker.example');
    // The "trusted.example" prefix is a subdomain, not the real domain
    expect(detail!.subdomainDepth).toBeGreaterThanOrEqual(2);
  });

  it('flags excessive subdomain nesting', () => {
    const result = analyzeUrl({ url: 'https://a.b.c.d.attacker.example' });
    const subdomainFinding = result.findings.find((f) => f.id === 'subdomains');
    expect(subdomainFinding).toBeDefined();
  });
});

describe('embedded credentials in URL', () => {
  it('detects user:pass syntax', () => {
    const detail = extractHostDetail('https://real@paypal.com:steal@attacker.example/login');
    expect(detail).not.toBeNull();
    // The URL API parses userinfo; the real host is attacker.example
    expect(detail!.hasUserInfo).toBe(true);
  });

  it('produces a high-severity finding for embedded credentials', () => {
    const result = analyzeUrl({
      url: 'https://user:pass@attacker.example/path',
    });
    const userinfoFinding = result.findings.find((f) => f.id === 'userinfo');
    expect(userinfoFinding).toBeDefined();
    expect(userinfoFinding!.severity).toBe('high');
  });
});

describe('HTTPS is not proof of safety', () => {
  it('includes an info note about HTTPS when findings exist', () => {
    const result = analyzeUrl({ url: 'https://attacker.example/path' });
    const httpsNote = result.findings.find((f) => f.id === 'https-note');
    expect(httpsNote).toBeDefined();
    expect(httpsNote!.severity).toBe('info');
    expect(httpsNote!.reason).toMatch(/encryption/);
    expect(httpsNote!.action).toMatch(/not.*legitimat|does not prove/i);
  });

  it('does not treat HTTPS URL as safe by giving a zero score when other indicators exist', () => {
    const result = analyzeUrl({
      url: 'https://user:pass@attacker.example',
    });
    // Should have a high score due to embedded credentials despite HTTPS
    expect(result.score).toBeGreaterThan(0);
  });
});

describe('legitimate urgent message', () => {
  it('does not receive High concern from urgency alone', () => {
    const result = analyzeEmail({
      body: EMAIL_LEGIT_URGENT_EXAMPLE,
      sender: 'it-support@company.example',
      replyTo: 'it-support@company.example',
      officialDomain: 'company.example',
    });
    // Urgency is present but no credential requests, no threats, no malicious links
    expect(result.level).not.toBe('High');
    expect(result.score).toBeLessThan(60);
    // Should still flag urgency as a low-severity finding
    const urgency = result.findings.find((f) => f.id === 'urgency');
    if (urgency) {
      expect(urgency.severity).toBe('low');
    }
  });
});

describe('deduplication and score bounds', () => {
  it('deduplicates findings by stable ID', () => {
    // Multiple links to the same IP host should not produce duplicate findings
    const result = analyzeEmail({
      body: 'Click here http://192.168.1.1/path1 or here http://192.168.1.1/path2',
    });
    const ipFindings = result.findings.filter((f) => f.id.startsWith('ip-host'));
    // Same host → same ID → deduplicated to one
    expect(ipFindings.length).toBe(1);
  });

  it('score is always bounded 0–100', () => {
    // Maximally suspicious message
    const result = analyzeEmail({
      body: 'URGENT: Your account will be suspended within 24 hours. Verify your password and OTP verification code immediately. You won a $5,000 prize. Pay via bitcoin wallet address now. Legal action will be taken. Dear valued customer, confirm your account details. http://192.168.1.1/login http://user:pass@attacker.example/steal',
      sender: 'security@paypa1-support.example',
      replyTo: 'billing@secure-payments.example',
      officialDomain: 'paypal.com',
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('empty-body-like message with no indicators gets Low score', () => {
    const result = analyzeEmail({ body: 'Hi, how are you doing today?' });
    expect(result.score).toBeLessThanOrEqual(30);
    expect(result.level).toBe('Low');
  });
});

describe('missing email metadata produces no invented findings', () => {
  it('produces no domain comparison when officialDomain is absent', () => {
    const result = analyzeEmail({
      body: 'Hello, please review the document at https://docs.example.com/file',
    });
    expect(result.domainComparison).toBeNull();
    // No sender-domain-mismatch finding should appear
    expect(result.findings.find((f) => f.id === 'sender-domain-mismatch')).toBeUndefined();
    expect(result.findings.find((f) => f.id === 'sender-replyto-mismatch')).toBeUndefined();
  });

  it('does not invent findings for empty optional fields', () => {
    const result = analyzeEmail({
      body: 'Meeting at 3pm tomorrow.',
      sender: undefined,
      replyTo: undefined,
      officialDomain: undefined,
    });
    // No domain comparison, no sender mismatch, no reply-to mismatch
    expect(result.domainComparison).toBeNull();
    expect(result.senderReplyToComparison).toBeNull();
    // Findings should only be real indicators (or insufficient-evidence note)
    const inventedIds = result.findings.filter(
      (f) =>
        f.id === 'sender-domain-mismatch' ||
        f.id === 'sender-replyto-mismatch' ||
        f.id === 'domain-mismatch-links'
    );
    expect(inventedIds).toHaveLength(0);
  });
});

describe('URL extraction', () => {
  it('extracts unique URLs from text', () => {
    const urls = extractUrls('Visit https://example.com and https://example.com again');
    expect(urls).toHaveLength(1);
  });

  it('returns empty array for no URLs', () => {
    expect(extractUrls('no links here')).toEqual([]);
  });
});

describe('SMS analysis', () => {
  it('analyzes SMS text the same as email body', () => {
    const result = analyzeSms({ text: 'URGENT: verify your password at http://attacker.example' });
    expect(result.score).toBeGreaterThan(0);
    expect(result.findings.find((f) => f.id === 'credential-request')).toBeDefined();
  });
});
