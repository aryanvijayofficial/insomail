import type { SpamSignal, SpamVerdict } from './types';
import { SPAM_THRESHOLDS } from './weights';
// Owner-approved prospective policy: confirmed Spamhaus spam/phishing/malware
// listings go to Spam. Weak/dynamic/abused-legitimate signals keep normal scoring.
const DIRECT_SPAM = new Set(['spamhaus_ip_listed','spamhaus_domain_spam','spamhaus_domain_phish']);
export function spamVerdict(score: number, signals: readonly SpamSignal[]): SpamVerdict {
 if(signals.some(signal=>DIRECT_SPAM.has(signal.id)))return 'spam';
 return score>=SPAM_THRESHOLDS.spam?'spam':score>=SPAM_THRESHOLDS.suspicious?'suspicious':'inbox';
}
