# Review: Conductor email feedback bridge (round 2)

Resolved since round 1:
- The webhook rejects requests when the secret is missing (503) or the signature is invalid (401).
- A follow-up email only goes into an existing thread if its sender matches the original customer.
- `/reply` searches up to 500 messages and ignores header lines that people posted.

Tests pass (20/20) and `tsc` is clean. The items below are still open. Delete this file before merging.

---

## Must fix

### 1. Attachments never reach Discord
`src/email-bridge.ts:246-270`

Resend's [retrieve received email](https://resend.com/docs/api-reference/emails/retrieve-received-email) response includes only attachment metadata (`id`, `filename`, `content_type`, `size`), with no `download_url` or `content`. Neither branch runs, so nothing is uploaded. The attachment test passes only because its mock adds a `download_url` that the real API never returns.

**Fix:**
- Call [`GET /emails/receiving/{email_id}/attachments`](https://resend.com/docs/api-reference/emails/list-received-email-attachments). Each item there has a `download_url`, valid until `expires_at`.
- Change the test mock to match the real response shape.
- Skip oversized files before downloading, using `size`. `MAX_ATTACHMENT_BYTES` is 25 MB, but bots get the server's upload limit, which is 10 MB on a server without boosts. Anything between 10 and 25 MB still fails with a 413. The limit could be read from the guild's boost tier.
- When the size check fails mid-download, call `reader.cancel()` so the stream is closed, not just unlocked.
- Optional: send up to 10 files in one message instead of one message per file.

### 2. Inbound email can ping people in Discord
`src/email-bridge.ts:224-264`

No message sets `allowed_mentions`. Anyone can email `@everyone`, `<@&roleId>` or `<@userId>` and notify those people.

**Fix:** Add `allowed_mentions: { parse: [] }` to every message the bridge posts: the header, body chunks, overflow file, attachments, and the `/reply` echo in `finishReply`. For multipart messages, put it inside `payload_json`.

### 3. `/reply` can still be pointed at an attacker, through the email body
`src/email-bridge.ts:324-349`

`findBotEmailSender` accepts any message the bot wrote that contains `**New Email from:**`. When an email body is too long for one message, the body chunks are separate messages posted by the bot. A body containing ``**New Email from:** `x@evil.com` `` therefore passes the author check. The search runs newest-first, so this fake line wins over the real header, and the staff reply is emailed to `x@evil.com`. The same fake line can also defeat the new sender check for follow-ups. The test only covers a fake posted by a person.

**Fix:** Read only the thread's first message, `GET /channels/{threadId}/messages?after={threadId}&limit=1`, and only if the bot wrote it. Alternatively, keep the address in an embed field, which a body chunk can't forge. This also removes the 5-page scan. Add a test where the email body contains a fake header.

### 4. Anyone who can see the thread can use `/reply`
`src/setup.ts:66`

The command is registered without `default_member_permissions`, and the handler checks only the guild and the parent channel.

**Fix:** Register it with `default_member_permissions: "8192"` (Manage Messages). Also check a staff role in `handleReplyCommand`, so a later channel-permission change can't open it up.

### 5. Resend retries post the same email twice
`src/interactions.ts:107-118`

The webhook fetches from Resend, posts several Discord messages and downloads attachments before it responds. If that runs past Resend's timeout, or any step fails with a 500, Resend retries and the email is posted again, possibly in a second thread.

**Fix:** Respond 200 right away, run `handleInboundEmail` in the background with `void`, the same way `finishReply` does, and skip repeats by `svix-id` or `email_id`.

### 6. Error details returned to the caller, and an empty API key
`src/interactions.ts:32`, `src/interactions.ts:117`

The 500 response includes `err.message`, which carries Resend and Discord error bodies. When `RESEND_API_KEY` is unset, the route still runs using `new ResendApi("")`.

**Fix:** Return a bare 500. Return 503 when either the key or the webhook secret is missing.

### 7. README is missing the Interactions Endpoint step
`README.md`

"Point Discord's Interactions Endpoint URL at `/discord/interactions`" was removed along with the Railway instructions. It's still required, and `/reply` doesn't work without it.

---

## Should fix

### 8. No timeouts on Resend calls
`src/resend.ts:94`, `src/resend.ts:109`

Neither fetch has a timeout. A stalled Resend request can hold up the webhook indefinitely (which makes #5 worse) and leave `/reply` stuck on "thinking…".

**Fix:** Add `signal: AbortSignal.timeout(10_000)`, matching `DiscordApi`.

### 9. `maxRequestBodySize` raised to 1 MB for every route
`src/index.ts:14`

The raise isn't needed for attachments. Resend's `email.received` webhook contains only metadata; the body and attachments are fetched separately through the API. A 10 MB attachment never passes through this limit. The webhook payload also doesn't include the email body, so a long body doesn't need the raise either. The limit is global, though, so it also applies to the Discord interactions route.

**Fix:** Go back to `64_000`. If any headroom is wanted, pick a value based on the largest real webhook payload seen.
