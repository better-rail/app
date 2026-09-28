# Review: Conductor email threading (round 4)

Tests pass (20/20) and `tsc` is clean.

## Must fix

### 1. `/reply` recipient can be spoofed from an email body (regression of round 3 item 3)
`src/email-bridge.ts` — `findThreadEmailContext`

The recipient is now taken from any bot message in the last 20 whose content starts with `**New Email from:**`. Body chunks are posted as separate bot messages, and when the body is over 4000 chars (or header + body over 1900) the chunk is posted without a prefix. A body opening with ``**New Email from:** `x@evil.com` `` therefore produces a matching bot message.

- The loop overwrites as it goes, so the oldest match in the window wins. Once the thread passes 20 messages the real starter drops out and the injected line decides where `/reply` sends.
- `handleInboundEmail`'s sender check goes through `findBotEmailSender`, so it uses the same weakened lookup.

**Fix:** read recipient and subject only from the starter message (`?after=${threadId}&limit=1`). Scan recent messages only for Message-IDs.

### 2. Message-ID parsing trusts customer-controlled content
`src/email-bridge.ts` — `extractHeaderMessageId`

The regex is unanchored and runs on every bot message, including body chunks and `/reply` echoes. A body containing ``**Message-ID:** `<anything>` `` is posted after the real header, so it becomes the newest match and ends up in `In-Reply-To`. `[^`]+` also matches newlines, so CR/LF can reach the headers sent to Resend.

**Fix:** only parse the Message-ID line from real header messages (content starts with `**New Email from:**` or `**Follow-up Email from:**`, line before the `────` separator), and validate each ID against `/^<[^<>\s]+>$/`.

## Worth addressing

### 3. Threading now relies on Reply-To plus-addressing
Removing `[#id]` from the outgoing subject drops the most robust inbound signal. Replies still match via `References`, `feedback+ID@`, or the quoted `Ref: [#id]`, but only if Resend actually delivers `feedback+<id>@` to the webhook. Confirm on the live domain before merging.

### 4. Echo truncation can still exceed Discord's 2000-char limit
`src/email-bridge.ts` — `handleReplyCommand`

Each `\n` becomes `\n> `, so 1800 chars with many line breaks can pass 2000. The email is already sent by then; a failed follow-up invites a retry and a duplicate email. Truncate after adding the quote prefixes.

### 5. Test coverage for long threads shrank
Filler messages went from 104 to 25. The starter fallback just past 20 is still exercised, but nothing covers a thread longer than one page. A test for the injection in #1 would have caught it.

## Nits

- `findBotEmailSender` is now a one-line wrapper and `findThreadEmailContext` was made public for no reason. Inline the wrapper, make the other private.
- `formatReplySubject` strips any `[digits]` (e.g. `Train 402 [2]`). Limit it to `\[#\d{17,20}\]`.
- RTL is chosen if any Hebrew/Arabic character appears, so an English reply with one Hebrew station name goes out right-to-left. Use the first strong character. `lang="he"` is also set for Arabic.
- A `(No Subject)` starter makes `extractHeaderSubject` return nothing, so every reply makes an extra Discord call for the starter.

## Still open from round 3

### 7. README is missing the Interactions Endpoint step
`README.md`

"Point Discord's Interactions Endpoint URL at `/discord/interactions`" is still required for slash commands to reach the application.
