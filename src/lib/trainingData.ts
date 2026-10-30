import type { TrainingRow } from './classifier';

// Demonstration training data — clearly labeled, not production-grade.
// Do not claim real-world accuracy from this dataset.
export const DEMO_TRAINING_DATA: TrainingRow[] = [
  // --- Phishing examples ---
  { label: 'phishing', text: 'Dear valued customer, your account will be suspended within 24 hours. Verify your identity immediately by confirming your password.' },
  { label: 'phishing', text: 'URGENT: We detected suspicious activity on your account. Click the link to verify your login credentials before your account is closed.' },
  { label: 'phishing', text: 'Congratulations! You have won a $500 gift card. Claim your prize now by entering your verification code and password.' },
  { label: 'phishing', text: 'Your package is held for payment. Pay $4.50 now to avoid return to sender. Send bitcoin to the wallet address provided.' },
  { label: 'phishing', text: 'Final notice: Your tax refund is pending. Confirm your account details and OTP to receive your refund of $1,200.' },
  { label: 'phishing', text: 'Dear user, we detected unusual login activity. Update your account information immediately or your account will be terminated.' },
  { label: 'phishing', text: 'You have an unclaimed inheritance of $50,000. Send your bank details and a wire transfer fee to process the claim.' },
  { label: 'phishing', text: 'Security alert: Your PayPal account has been limited. Click here to verify your identity and restore access.' },
  { label: 'phishing', text: 'You have been selected for a cash prize reward. Reply with your full name, date of birth, and account number to claim.' },
  { label: 'phishing', text: 'Your Amazon order has been cancelled. Confirm your payment method and card details to reprocess the order.' },
  { label: 'phishing', text: 'Warning: Legal action will be taken against you. Pay the outstanding penalty immediately via prepaid card to avoid prosecution.' },
  { label: 'phishing', text: 'Your account security needs attention. Enter your 2FA verification code and password to secure your account.' },
  { label: 'phishing', text: 'Limited time offer! Claim your free Bitcoin worth $1000. Sign in with your wallet credentials before the deadline expires today.' },
  { label: 'phishing', text: 'Dear account holder, your direct deposit is on hold. Verify your banking information and login credentials to release funds.' },
  { label: 'phishing', text: 'You won the lottery sweepstakes! To collect your winnings, provide your personal identification and pay the processing fee.' },
  // --- Legitimate examples ---
  { label: 'legitimate', text: 'Hi Sarah, just following up on our meeting tomorrow at 2pm. Let me know if you need to reschedule. Thanks, Alex' },
  { label: 'legitimate', text: 'Your order #4821 has shipped and will arrive on Friday. Track your package at the store website. Thank you for your purchase.' },
  { label: 'legitimate', text: 'Reminder: Your library book is due in 3 days. You can renew online or visit the front desk. No action is required if already returned.' },
  { label: 'legitimate', text: 'Your weekly project digest is ready. View the summary of completed tasks and upcoming deadlines on the team dashboard.' },
  { label: 'legitimate', text: 'Hi Mom, I will be home by 6pm for dinner. Can you save me some of the pasta? See you soon!' },
  { label: 'legitimate', text: 'Your appointment with Dr. Chen is confirmed for March 15 at 10am. Please arrive 15 minutes early to complete paperwork.' },
  { label: 'legitimate', text: 'The team meeting has been rescheduled to Thursday at 3pm. The agenda and video link are in the calendar invite. See you there.' },
  { label: 'legitimate', text: 'Your password was recently changed. If this was you, no further action is needed. If not, please contact support through the app.' },
  { label: 'legitimate', text: 'Your monthly bank statement is now available. Log in to your account to view it. We will never ask for your password by email.' },
  { label: 'legitimate', text: 'Hey everyone, the office potluck is next Friday. Please sign up on the shared sheet if you plan to bring something. Thanks!' },
  { label: 'legitimate', text: 'Your subscription renews on the 15th of each month. You can manage your plan or cancel anytime in account settings.' },
  { label: 'legitimate', text: 'This is a friendly reminder that your annual performance review is scheduled for next week. Please complete the self-assessment form by Friday.' },
  { label: 'legitimate', text: 'Thank you for your purchase. Your receipt and return policy are attached. If you have any questions, reply to this email or call us.' },
  { label: 'legitimate', text: 'Your verification code is 839204. This code expires in 10 minutes. We will never call or text you to ask for it.' },
  { label: 'legitimate', text: 'The shipping address for your delivery has been updated. If you did not make this change, please review your account settings.' },
];
