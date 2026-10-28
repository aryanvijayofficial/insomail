# Spam protection

Mailflare analyzes stored incoming messages locally. The filter combines trusted authentication results, sender relationships, mailbox-scoped reputation, bounded Bayesian token learning, URL checks, message structure, and attachment metadata. No message content or spam intelligence is sent to an external service.

Scores range from 0 to 100. Confirmed Spamhaus SBL/XBL-class sending-IP listings and DBL spam/phishing/malware domain listings move future messages directly to Spam, even when other signals reduce the score. They are not deleted. Dynamic-IP/PBL and abused-legitimate-domain signals keep combined scoring. Other messages scoring 70 or higher move to Spam. Scores from 40 through 69 are recorded as suspicious but remain in their normal Inbox or custom folder. Analysis failures also deliver normally. Automatic replies and new-message notifications are suppressed for messages placed in Spam.

The Spam Filter switch is under **Settings → Inbox → Spam protection** and is enabled by default. Disabling it affects future incoming messages; it does not move or rescan existing mail.

Use **Report spam** to train a message as spam. Use **Not spam** from the Spam folder to train it as legitimate and return it to Inbox. Learning is scoped to the message's mailbox, only explicit user feedback trains the classifier, and changing a decision reverses the previous training first.

Mailflare accepts mail before this analysis. Forward-only routing occurs before stored-message filtering and is outside the filter's v1 scope.
