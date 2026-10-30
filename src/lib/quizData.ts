export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'An email says "Your account will be closed in 24 hours — verify your password now." What is the biggest red flag?',
    options: [
      'The 24-hour timeframe is too short for any real organization.',
      'No legitimate service asks for your password by email or SMS.',
      'The word "account" always indicates phishing.',
      'Real organizations never close accounts.',
    ],
    correctIndex: 1,
    explanation: 'Requests for passwords or one-time codes are one of the strongest phishing signals. Legitimate services never ask you to send credentials by email.',
  },
  {
    id: 'q2',
    question: 'A link shows a padlock icon and begins with "https://". Does this mean the site is safe?',
    options: [
      'Yes — HTTPS guarantees the site is legitimate.',
      'No — HTTPS only confirms encryption, not trustworthiness. Scammers get free certificates too.',
      'Only if the padlock is green.',
      'Yes, but only for well-known brands.',
    ],
    correctIndex: 1,
    explanation: 'HTTPS encrypts the connection between you and the server. It does not verify the identity of the site owner. Phishing sites routinely use HTTPS.',
  },
  {
    id: 'q3',
    question: 'A message says "Dear valued customer" and asks you to "confirm your account details." Why is the greeting suspicious?',
    options: [
      'Organizations never use the word "customer."',
      'Generic greetings like "Dear valued customer" are common in mass phishing — real organizations usually address you by name.',
      'The word "confirm" is always malicious.',
      'There is nothing suspicious about it.',
    ],
    correctIndex: 1,
    explanation: 'Mass-produced phishing emails use generic greetings because they do not know your name. A personalized greeting is a weak positive signal but not proof of safety.',
  },
  {
    id: 'q4',
    question: 'Someone asks you to pay an urgent fee with gift cards or cryptocurrency. What should you do?',
    options: [
      'Pay quickly to resolve the issue.',
      'Gift cards and crypto are standard payment methods for fees.',
      'Treat this as a strong scam signal — no legitimate organization demands gift cards or crypto for urgent fees.',
      'Verify the amount first, then pay.',
    ],
    correctIndex: 2,
    explanation: 'Gift cards and cryptocurrency are nearly impossible to reverse and are a hallmark of scam payment demands. Legitimate organizations do not request them for fees or penalties.',
  },
  {
    id: 'q5',
    question: 'An email appears to come from "support@paypa1-security.example" but claims to be from PayPal. What is wrong?',
    options: [
      'Nothing — the domain contains "paypal" so it must be real.',
      'The domain "paypa1-security.example" is not PayPal\'s real domain. The digit "1" replaces the letter "l" — a lookalike domain technique.',
      'All .example domains are official.',
      'The email is safe because it uses HTTPS.',
    ],
    correctIndex: 1,
    explanation: 'Lookalike domains use substituted characters, extra words, or punycode to impersonate real brands. Always compare the sender domain to the organization\'s known official domain.',
  },
  {
    id: 'q6',
    question: 'PhishGuard gives a message a Low concern score. What does that mean?',
    options: [
      'The message is verified safe and you can trust it completely.',
      'The message is definitely not phishing.',
      'Few heuristic indicators were found — this is not a guarantee of safety. When in doubt, verify independently.',
      'You should still click all links in the message.',
    ],
    correctIndex: 2,
    explanation: 'A low score means the tool did not detect common phishing patterns. It does not confirm safety. Sophisticated phishing can evade heuristic detection. Always verify through an official channel when in doubt.',
  },
];
