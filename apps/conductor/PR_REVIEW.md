# Review: Conductor email feedback bridge (round 3)

## Resolved in round 3:
- **1. Attachments:** Attachments are fetched via Resend's `GET /emails/receiving/{email_id}/attachments` (`listReceivedEmailAttachments`). Pre-screened against the 10 MB Discord unboosted bot limit, and `reader.cancel()` is called if stream size limit is exceeded.
- **2. Inbound email mentions:** Added `allowed_mentions: { parse: [] }` across all outgoing Discord messages (headers, chunks, overflow body files, attachments, and `/reply` response echoes).
- **3. Recipient extraction security:** `findBotEmailSender` queries strictly the starter message (`?after={threadId}&limit=1`), verifies bot authorship, and matches `^**New Email from:**`, preventing attacker headers in email body chunks or multi-page traversals from spoofing the recipient.
- **4. Command permissions:** Registered `/reply` with `default_member_permissions: "8192"` (Manage Messages) and enforced `MANAGE_MESSAGES` or `ADMINISTRATOR` check on the member in `handleReplyCommand`.
- **5. Webhook deduplication & retries:** Webhook responds `200 { ok: true }` immediately and processes email fetching/posting in the background. Duplicate requests matching recent `svix-id` or `email_id` are deduplicated.
- **6. Fail-closed config & bare 500:** Webhook returns 503 if either `RESEND_API_KEY` or `RESEND_WEBHOOK_SECRET` is unset, and returns a bare 500 without exposing internal error bodies.
- **8. Resend call timeouts:** Added `signal: AbortSignal.timeout(10_000)` to all Resend API requests (`getReceivedEmail`, `listReceivedEmailAttachments`, `sendEmail`).
- **9. Body size limit:** Reverted `maxRequestBodySize` back to `64_000`.

Tests pass (20/20) and `tsc` is clean.

---

## Open

### 7. README is missing the Interactions Endpoint step
`README.md`

"Point Discord's Interactions Endpoint URL at `/discord/interactions`" is still required for slash commands to reach the application.
