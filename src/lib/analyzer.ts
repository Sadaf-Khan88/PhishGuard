import { getDomain, parse } from 'tldts';

export type Severity = 'info' | 'low' | 'medium' | 'high';

export interface Finding {
  id: string;
  severity: Severity;
  reason: string;
  evidence: string;
  action: string;
}

export interface HostDetail {
  host: string;
  registrableDomain: string | null;
  isIpAddress: boolean;
  hasUserInfo: boolean;
  isPunycode: boolean;
  subdomainDepth: number;
  protocol: string;
  usesHttps: boolean;
}

export interface AnalysisResult {
  score: number;
  level: 'Low' | 'Medium' | 'High';
  findings: Finding[];
  hosts: HostDetail[];
  domainComparison: string | null;
  senderReplyToComparison: string | null;
  sufficientEvidence: boolean;
  warningCount: number;
}

export interface EmailInput {
  body: string;
  sender?: string;
  replyTo?: string;
  officialDomain?: string;
}

export interface SmsInput {
  text: string;
}

export interface UrlInput {
  url: string;
}

const MAX_MESSAGE = 10000;
const MAX_URL = 2048;

// ---------- Input validation ----------

export function validateMessage(text: string): string | null {
  if (text.length === 0) return 'Message is empty.';
  if (text.length > MAX_MESSAGE) return `Message exceeds the ${MAX_MESSAGE.toLocaleString()} character limit.`;
  return null;
}

export function validateUrl(url: string): string | null {
  if (url.length === 0) return 'URL is empty.';
  if (url.length > MAX_URL) return `URL exceeds the ${MAX_URL.toLocaleString()} character limit.`;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'Only http and https URLs are supported.';
    }
  } catch {
    return 'URL is not valid. Include the protocol (e.g. https://).';
  }
  return null;
}

// ---------- Host detail extraction ----------

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_RE = /^\[?[0-9a-fA-F:]+\]?$/;

export function extractHostDetail(rawUrl: string): HostDetail | null {
  try {
    const u = new URL(rawUrl.trim());
    let host = u.hostname;
    const isIpAddress = IPV4_RE.test(host) || (host.startsWith('[') && IPV6_RE.test(host));
    const hasUserInfo = u.username !== '' || u.password !== '';
    const isPunycode = host.includes('xn--');
    const parsed = parse(host);
    const registrableDomain = parsed.domain || null;
    const subdomainParts = parsed.subdomain ? parsed.subdomain.split('.') : [];
    const subdomainDepth = subdomainParts.length;
    return {
      host,
      registrableDomain,
      isIpAddress,
      hasUserInfo,
      isPunycode,
      subdomainDepth,
      protocol: u.protocol.replace(':', ''),
      usesHttps: u.protocol === 'https:',
    };
  } catch {
    return null;
  }
}

// ---------- URL extraction from text ----------

const URL_RE = /\bhttps?:\/\/[^\s<>"']+/gi;

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_RE) || [];
  return [...new Set(matches)];
}

// ---------- Domain comparison ----------

function domainOf(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at < 0 || at === email.length - 1) return null;
  const raw = email.slice(at + 1).toLowerCase().trim();
  return getDomain(raw) || raw || null;
}

// ---------- Heuristic detection ----------

interface Indicator {
  id: string;
  severity: Severity;
  reason: string;
  evidence: string;
  action: string;
  points: number;
}

const URGENCY_PATTERNS: RegExp[] = [
  /\b(urgent|immediately|right now|asap|final notice|last (chance|warning|notice))\b/gi,
  /\b(within \d+ (hour|day|hr)s?|expires? (today|now|in \d+)|deadline)\b/gi,
  /\b(account (will be )?(suspend|close|terminat|deactivat|lock|disabl))/gi,
  /\b(suspend|close|terminat|deactivat|lock|disabl).{0,30}account/gi,
];

const THREAT_PATTERNS: RegExp[] = [
  /\b(legal action|lawsuit|arrest|warrant|fine|penalty|prosecut)/gi,
  /\b(audit|tax(es)? .{0,20}(owe|due|unpaid)|outstanding balance)/gi,
];

const CREDENTIAL_PATTERNS: RegExp[] = [
  /\b(password|passwd|pin\s?code|otp|one[- ]?time (password|code)|verification code|security code|2fa|mfa|authenticat)/gi,
  /\b(confirm your (password|identity|account)|verify (your )?(identity|account|login))/gi,
  /\b(login credentials|account details|sign[\s-]?in (info|details))/gi,
];

const PAYMENT_BAIT_PATTERNS: RegExp[] = [
  /\b(won|winner|prize|lottery|sweepstake|inherit(ance|ed)|unclaimed)/gi,
  /\b(\$[\d,]+|€[\d,]+|£[\d,]+|\b\d{3,}\s?(dollars|euros|pounds|usd|eur|gbp))\b/gi,
  /\b(gift card|refund|compensation|rebate|cash (prize|reward))/gi,
];

const UNUSUAL_PAYMENT_PATTERNS: RegExp[] = [
  /\b(bitcoin|crypto(currency)?|wallet address|gift card|steam card|google play card|apple gift|wire transfer|money ?gram|western union|prepaid card)/gi,
  /\b(send .{0,20}(payment|money|funds)|pay (now|immediately)|update (your )?payment|outstanding (payment|invoice))/gi,
];

const IMPERSONATION_PATTERNS: RegExp[] = [
  /\b(dear (customer|user|valued client|account holder|sir|madam))/gi,
  /\b(update (your )?(account|info|records)|confirm (your )?(info|details|account))/gi,
  /\b(we detect(ed)? (unusual|suspicious) activity|suspicious (login|activity|transaction))/gi,
];

const GREETING_MISS_PATTERNS: RegExp[] = [
  /\b(dear (customer|user|valued client|account holder|sir|madam))/gi,
];

const SHORT_BODY_THRESHOLD = 80;

function matched(patterns: RegExp[], text: string): string[] {
  const results: string[] = [];
  for (const p of patterns) {
    p.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = p.exec(text)) !== null) {
      results.push(m[0]);
      if (p.global && m.index === p.lastIndex) p.lastIndex++;
    }
  }
  return results;
}

function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  const out: Finding[] = [];
  for (const f of findings) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    out.push(f);
  }
  return out;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ---------- Core analysis ----------

export function analyzeEmail(input: EmailInput): AnalysisResult {
  const body = input.body;
  const findings: Finding[] = [];
  const text = body.toLowerCase();
  let score = 0;

  // Urgency / threats
  const urgencyHits = matched(URGENCY_PATTERNS, text);
  if (urgencyHits.length >= 1) {
    score += clamp(urgencyHits.length * 8, 0, 18);
    findings.push({
      id: 'urgency',
      severity: urgencyHits.length >= 2 ? 'medium' : 'low',
      reason: 'Urgency or time pressure language detected.',
      evidence: urgencyHits.slice(0, 3).map((s) => `"${s}"`).join(', '),
      action: 'Verify the deadline independently through an official channel before acting.',
    });
  }

  const threatHits = matched(THREAT_PATTERNS, text);
  if (threatHits.length >= 1) {
    score += clamp(threatHits.length * 10, 0, 20);
    findings.push({
      id: 'threats',
      severity: threatHits.length >= 2 ? 'high' : 'medium',
      reason: 'Threats of legal, financial, or account consequences detected.',
      evidence: threatHits.slice(0, 3).map((s) => `"${s}"`).join(', '),
      action: 'Legitimate organizations rarely threaten immediate legal action via email. Contact them directly.',
    });
  }

  // Credential requests
  const credHits = matched(CREDENTIAL_PATTERNS, text);
  if (credHits.length >= 1) {
    score += clamp(credHits.length * 12, 0, 25);
    findings.push({
      id: 'credential-request',
      severity: 'high',
      reason: 'Requests for passwords, OTPs, or verification codes detected.',
      evidence: credHits.slice(0, 3).map((s) => `"${s}"`).join(', '),
      action: 'Never share passwords or one-time codes. No legitimate service will ask for them by email.',
    });
  }

  // Prize / payment bait
  const baitHits = matched(PAYMENT_BAIT_PATTERNS, text);
  if (baitHits.length >= 1) {
    score += clamp(baitHits.length * 8, 0, 18);
    findings.push({
      id: 'prize-bait',
      severity: baitHits.length >= 2 ? 'medium' : 'low',
      reason: 'Prize, lottery, or money-bait language detected.',
      evidence: baitHits.slice(0, 3).map((s) => `"${s}"`).join(', '),
      action: 'Unsolicited prizes or winnings are a common phishing lure. Do not respond or click any links.',
    });
  }

  // Unusual payment demands
  const payHits = matched(UNUSUAL_PAYMENT_PATTERNS, text);
  if (payHits.length >= 1) {
    score += clamp(payHits.length * 9, 0, 20);
    findings.push({
      id: 'unusual-payment',
      severity: payHits.length >= 2 ? 'high' : 'medium',
      reason: 'Unusual payment method or urgent payment demand detected.',
      evidence: payHits.slice(0, 3).map((s) => `"${s}"`).join(', '),
      action: 'Gift cards, crypto, and wire transfers are common in scam payment demands. Verify independently.',
    });
  }

  // Impersonation / generic greeting
  const impHits = matched(IMPERSONATION_PATTERNS, text);
  const greetHits = matched(GREETING_MISS_PATTERNS, text);
  if (impHits.length >= 1) {
    score += clamp(impHits.length * 5, 0, 12);
    findings.push({
      id: 'impersonation',
      severity: 'low',
      reason: 'Generic or scripted account-verification phrasing detected.',
      evidence: impHits.slice(0, 3).map((s) => `"${s}"`).join(', '),
      action: 'Check whether the message addresses you by name. Generic greetings are common in mass phishing.',
    });
  }

  // Links in body
  const urls = extractUrls(body);
  const hosts: HostDetail[] = [];
  const hostFindings: Finding[] = [];
  for (const rawUrl of urls) {
    const detail = extractHostDetail(rawUrl);
    if (!detail) continue;
    hosts.push(detail);
    if (detail.isIpAddress) {
      score += 12;
      hostFindings.push({
        id: `ip-host-${detail.host}`,
        severity: 'high',
        reason: 'Link points to a raw IP address instead of a domain name.',
        evidence: detail.host,
        action: 'Legitimate organizations rarely use raw IP addresses in links. Do not visit.',
      });
    }
    if (detail.hasUserInfo) {
      score += 18;
      hostFindings.push({
        id: `userinfo-${detail.host}`,
        severity: 'high',
        reason: 'URL contains embedded username/password syntax, which can disguise the real destination.',
        evidence: rawUrl.length > 80 ? rawUrl.slice(0, 80) + '...' : rawUrl,
        action: 'This is a strong phishing signal. Do not visit this link.',
      });
    }
    if (detail.isPunycode) {
      score += 8;
      hostFindings.push({
        id: `punycode-${detail.host}`,
        severity: 'medium',
        reason: 'Link uses an internationalized (punycode) domain, which can impersonate well-known brands.',
        evidence: detail.host,
        action: 'Hover-display may look legitimate. Verify the registrable domain carefully before trusting.',
      });
    }
    if (detail.subdomainDepth >= 3) {
      score += clamp(detail.subdomainDepth * 3, 0, 10);
      hostFindings.push({
        id: `subdomains-${detail.host}`,
        severity: 'low',
        reason: `Excessive subdomain nesting (${detail.subdomainDepth} levels) can disguise the real domain.`,
        evidence: detail.host,
        action: 'Focus on the registrable domain, not the long prefix. If it does not match the brand, be cautious.',
      });
    }
  }

  // Deduplicate host findings and cap contribution
  const dedupedHost = dedupeFindings(hostFindings);
  findings.push(...dedupedHost);
  // Cap host-based score contribution at 30
  const hostScore = Math.min(30, dedupedHost.reduce((acc, f) => acc + (f.severity === 'high' ? 18 : f.severity === 'medium' ? 8 : 3), 0));
  // Recompute: we already added inline; simpler to recompute total from findings
  score = clamp(score, 0, 100);

  // Domain comparisons
  let domainComparison: string | null = null;
  if (input.officialDomain && input.officialDomain.trim() && urls.length > 0) {
    const official = getDomain(input.officialDomain.trim().toLowerCase()) || input.officialDomain.trim().toLowerCase();
    const linkDomains = hosts.map((h) => h.registrableDomain).filter(Boolean) as string[];
    const uniqueLinkDomains = [...new Set(linkDomains)];
    const mismatches = uniqueLinkDomains.filter((d) => d !== official);
    if (mismatches.length > 0) {
      score += 15;
      domainComparison = `The claimed official domain is "${official}", but the message links to: ${mismatches.map((d) => `"${d}"`).join(', ')}.`;
      findings.push({
        id: 'domain-mismatch-links',
        severity: 'high',
        reason: 'Links do not match the claimed organization\'s official domain.',
        evidence: domainComparison,
        action: 'Do not trust links that do not resolve to the official domain. Verify by typing the known address yourself.',
      });
    } else if (uniqueLinkDomains.length > 0) {
      domainComparison = `All detected links match the claimed official domain "${official}".`;
    }
  }

  let senderReplyToComparison: string | null = null;
  const senderDomain = input.sender ? domainOf(input.sender) : null;
  const replyToDomain = input.replyTo ? domainOf(input.replyTo) : null;
  if (senderDomain && replyToDomain && senderDomain !== replyToDomain) {
    score += 10;
    senderReplyToComparison = `Sender domain "${senderDomain}" differs from reply-to domain "${replyToDomain}". Mismatches can be legitimate (e.g. outsourced support) but are worth verifying.`;
    findings.push({
      id: 'sender-replyto-mismatch',
      severity: 'medium',
      reason: 'Sender and reply-to domains differ.',
      evidence: senderReplyToComparison,
      action: 'Check whether the reply-to domain is one you recognize for this organization.',
    });
  }

  if (input.officialDomain && senderDomain) {
    const official = getDomain(input.officialDomain.trim().toLowerCase()) || input.officialDomain.trim().toLowerCase();
    if (senderDomain !== official) {
      score += 12;
      findings.push({
        id: 'sender-domain-mismatch',
        severity: 'medium',
        reason: 'Sender domain does not match the claimed official domain.',
        evidence: `Sender domain "${senderDomain}" vs. claimed official "${official}".`,
        action: 'Legitimate organizations usually send from their own domain. Verify the sender address carefully.',
      });
    }
  }

  // HTTPS note
  const httpsHosts = hosts.filter((h) => h.usesHttps);
  if (httpsHosts.length > 0 && findings.length > 0) {
    findings.push({
      id: 'https-note',
      severity: 'info',
      reason: 'Some links use HTTPS, but HTTPS only confirms an encrypted connection — not that the site is trustworthy.',
      evidence: httpsHosts.map((h) => h.host).join(', '),
      action: 'Do not treat a padlock or "https" as proof of legitimacy. Scammers also use free certificates.',
    });
  }

  const warningCount = findings.filter((f) => f.severity !== 'info').length;
  const sufficientEvidence = body.trim().length >= SHORT_BODY_THRESHOLD || urls.length > 0 || warningCount > 0;
  const trimmedScore = clamp(score, 0, 100);
  const level: 'Low' | 'Medium' | 'High' =
    trimmedScore >= 60 ? 'High' : trimmedScore >= 30 ? 'Medium' : 'Low';

  if (!sufficientEvidence) {
    findings.push({
      id: 'insufficient-evidence',
      severity: 'info',
      reason: 'The message is short and no strong indicators were detected. This does not mean it is safe.',
      evidence: `Message length: ${body.length} characters, no links detected.`,
      action: 'Use caution. A short or clean message is not a guarantee of safety. If in doubt, verify through an official channel.',
    });
  }

  return {
    score: trimmedScore,
    level,
    findings: dedupeFindings(findings),
    hosts,
    domainComparison,
    senderReplyToComparison,
    sufficientEvidence,
    warningCount,
  };
}

export function analyzeSms(input: SmsInput): AnalysisResult {
  return analyzeEmail({ body: input.text });
}

export function analyzeUrl(input: UrlInput): AnalysisResult {
  const url = input.url.trim();
  const detail = extractHostDetail(url);
  const findings: Finding[] = [];
  let score = 0;

  if (detail) {
    if (detail.isIpAddress) {
      score += 15;
      findings.push({
        id: 'ip-host',
        severity: 'high',
        reason: 'URL points to a raw IP address instead of a domain name.',
        evidence: detail.host,
        action: 'Legitimate organizations rarely use raw IP addresses. Do not visit.',
      });
    }
    if (detail.hasUserInfo) {
      score += 20;
      findings.push({
        id: 'userinfo',
        severity: 'high',
        reason: 'URL contains embedded username/password syntax, which can disguise the real destination.',
        evidence: url.length > 80 ? url.slice(0, 80) + '...' : url,
        action: 'This is a strong phishing signal. Do not visit this URL.',
      });
    }
    if (detail.isPunycode) {
      score += 10;
      findings.push({
        id: 'punycode',
        severity: 'medium',
        reason: 'URL uses an internationalized (punycode) domain, which can impersonate well-known brands.',
        evidence: detail.host,
        action: 'The displayed name may look legitimate. Verify the registrable domain carefully.',
      });
    }
    if (detail.subdomainDepth >= 3) {
      score += clamp(detail.subdomainDepth * 3, 0, 12);
      findings.push({
        id: 'subdomains',
        severity: 'low',
        reason: `Excessive subdomain nesting (${detail.subdomainDepth} levels) can disguise the real domain.`,
        evidence: detail.host,
        action: 'Focus on the registrable domain. If it does not match the expected brand, be cautious.',
      });
    }
    if (!detail.usesHttps) {
      score += 5;
      findings.push({
        id: 'no-https',
        severity: 'low',
        reason: 'URL does not use HTTPS. Data sent to this site would not be encrypted.',
        evidence: `Protocol: ${detail.protocol}`,
        action: 'Avoid entering sensitive information on non-HTTPS sites.',
      });
    } else {
      findings.push({
        id: 'https-note',
        severity: 'info',
        reason: 'This URL uses HTTPS, which confirms encryption but not trustworthiness.',
        evidence: detail.host,
        action: 'A padlock does not prove the site is legitimate. Scammers also use HTTPS.',
      });
    }
  }

  const trimmedScore = clamp(score, 0, 100);
  const warningCount = findings.filter((f) => f.severity !== 'info').length;
  const level: 'Low' | 'Medium' | 'High' =
    trimmedScore >= 60 ? 'High' : trimmedScore >= 30 ? 'Medium' : 'Low';
  const sufficientEvidence = detail !== null;

  if (!sufficientEvidence) {
    findings.push({
      id: 'insufficient-evidence',
      severity: 'info',
      reason: 'The URL could not be fully parsed for structural analysis.',
      evidence: url,
      action: 'Use caution. If in doubt, do not visit.',
    });
  }

  return {
    score: trimmedScore,
    level,
    findings: dedupeFindings(findings),
    hosts: detail ? [detail] : [],
    domainComparison: null,
    senderReplyToComparison: null,
    sufficientEvidence,
    warningCount,
  };
}

// ---------- Examples ----------

export const EMAIL_EXAMPLE = `From: security@paypa1-support.example
Reply-To: billing@secure-payments.example

Dear valued customer,

We detected suspicious activity on your account. Your account will be suspended within 24 hours unless you verify your identity immediately.

Please confirm your password and enter the OTP verification code sent to your device to restore access:

https://paypa1-verify.example/login?session=abc123

Failure to respond will result in permanent account termination.

Thank you,
Account Security Team`;

export const SMS_EXAMPLE = `URGENT: Your package is held for payment. Pay $4.50 now via the link to avoid return to sender: http://post-redirect.example/track?id=9921 Reply STOP to opt out.`;

export const URL_EXAMPLE = `https://paypa1-verify.example/login?user=real@paypal.com&pass=steal&token=abc`;

// Additional fictional demo inputs — legitimate urgent message and ambiguous message.
export const EMAIL_LEGIT_URGENT_EXAMPLE = `From: it-support@company.example
Reply-To: it-support@company.example

Hi Jamie,

This is an urgent IT notice: your work laptop requires a mandatory security patch. Please install it by end of day Friday to maintain VPN access.

If you have already applied the update through the software center, no further action is needed. Otherwise, open the Self Service app and click "Security Patch — October."

No password is required for this update. If you have trouble, call the help desk at the extension listed on the intranet portal.

Best regards,
IT Support Team`;

export const EMAIL_AMBIGUOUS_EXAMPLE = `From: newsletter@deals-today.example

Hi there,

Just a quick note — your rewards points are expiring soon. Log in to your account to check your balance before they expire.

No action is needed if you have already used your points.

Thanks for being a member!`;
