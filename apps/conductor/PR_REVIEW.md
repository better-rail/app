# Review: Conductor email feedback bridge

The basic flow works: each email gets a thread, follow-ups unarchive it, and `/reply` is deferred and leaves a public audit trail. Tests pass (24/24), but none cover attachments.

The problems: email attachments are never forwarded, and there are several security gaps that let outsiders ping or spam the Discord or redirect a staff reply to another address. None of them allows taking over the bot. Items 1–8 should be fixed in this PR. Items 9–14 are optional design improvements.

---

## Must fix

### 1. Webhook accepts unsigned requests when the secret is unset
`src/interactions.ts:100`

The signature is only checked when `RESEND_WEBHOOK_SECRET` is set. Without it, anyone who finds the URL can POST events. If they know or leak an `email_id`, they can re-post that email into Discord. The 500 response (`:116`) also returns the raw error message to the caller.

**Fix:** Return 404 from `/resend/webhook` unless both `RESEND_API_KEY` and `RESEND_WEBHOOK_SECRET` are set. This also removes the `new ResendApi("")` fallback at `:32`. Return a bare status code on errors, not `err.message`.

### 2. Inbound email can ping people in Discord
`src/email-bridge.ts:185-227`

The subject, sender and body are posted with Discord's default mention handling. Anyone on the internet can send an email containing `@everyone`, `<@&roleId>` or `<@userId>`, and it will notify those people. `@everyone` works if the bot has that permission.

**Fix:** Add `allowed_mentions: { parse: [] }` to every message the bridge posts: the header, body chunks, overflow file, attachment posts, and the `/reply` echo in `finishReply`.

### 3. `/reply` can email the wrong person
`src/email-bridge.ts:257-270`

The recipient is found by regex-matching `**New/Follow-up Email from:** \`…\`` in the last 25 messages and taking the oldest match. This has three problems:

- **Spoofable.** The author isn't checked. Any member can post that line in the thread. A customer can also put it in their email body, which gets posted as a separate bot message when the body is chunked.
- **Breaks in long threads.** After 25 messages the real first header falls out of the window, and a later or fake one wins.
- **Fragile.** A backtick in the sender's display name breaks the `` `…` `` wrapping, and the regex stops matching.

A staff reply, which may include the customer's details, can end up emailed to an attacker.

**Fix:** Read the recipient from one known message, not by scanning. Either fetch the thread's first message (`GET /channels/{id}/messages?after={threadId}&limit=1`) and accept it only if `author.id` is the bot's, or store the address in an embed field on that message. Item 9 (reply button) removes the lookup completely.

### 4. Any sender can post into any thread
`src/email-bridge.ts:141-162`

A `[#<threadId>]` in the subject, a `+id@` address or a `Ref:` in the body is enough to post a follow-up into an existing thread. The sender is never compared with the thread's original customer, and the From header can be spoofed. Thread IDs appear in every reply subject and are visible to anyone who can see the channel. Combined with #3, this is how an attacker's address gets into a customer's thread.

**Fix:** When the sender doesn't match the thread's original customer, open a new thread.

### 5. Anyone in the guild may be able to run `/reply`
`src/setup.ts:66`

The command is registered without `default_member_permissions`. The handler only checks the guild and that the command runs in an #email-feedback thread. If that channel is visible to community members, any of them can send email as `feedback@better-rail.co.il`.

**Fix:** Register the command with `default_member_permissions` (e.g. Manage Messages). Also check a staff role in the handler so it stays locked down if channel permissions change later.

### 6. Email attachments are never forwarded
`src/email-bridge.ts:207-233`

Resend's "retrieve received email" response includes only attachment metadata: no `download_url` and no `content`. Neither branch runs, so nothing is uploaded. Tests don't catch this because none cover attachments.

**Fix:**
- Call `GET /emails/receiving/{id}/attachments`. It returns `download_url` links that are valid for 1 hour.
- Skip files over Discord's upload limit using `size`, so they don't fail with a 413.
- Fetch with a timeout. Right now `fetch(att.download_url)` has no timeout or size cap and loads the whole file into memory.
- Send up to 10 files in one message instead of one message per file.
- Add a test.

### 7. Resend retries post duplicates or open duplicate threads
`src/interactions.ts:96-118`

The webhook does all the work before it responds: the Resend fetch, several Discord posts in sequence, and attachment downloads. If this runs past Resend's timeout, or any step fails with a 500, Resend retries. The retry posts the messages again and may open a second thread.

**Fix:** Respond 200 immediately and do the work in the background with `void`, the same way `finishReply` does. Skip repeats by `svix-id` or `email_id` using the existing `handled` map.

### 8. README dropped the Interactions Endpoint step
`README.md`

Removing the Railway instructions also removed "Point Discord's Interactions Endpoint URL at `/discord/interactions`". That step is still required, and `/reply` doesn't work without it. Put it back.

---

## Optional: better use of Discord features

### 9. Reply button and modal instead of `/reply message:`
Slash command text options can't contain line breaks, so every reply is one line. Add a "Reply" button to the email message that opens a modal with a multi-line text field (up to 4,000 characters). The button's `custom_id` carries the context, which removes the lookup in #3. The app already handles button interactions.

### 10. Embeds for the email itself
Put the sender in the embed author, the subject in the title, and the timestamp in the embed timestamp. The description holds 4,096 characters, compared with 2,000 for plain content. For longer bodies, attach a `.txt` file to the same message.

This removes `chunkEmailBody`, the `(1/3)` prefixes, the `<=1900` check and the separate overflow message, and cuts Discord calls to about one per email. Customer text also stops being rendered as Discord markdown, and #3 goes away if the recipient is stored in an embed field.

### 11. Forum channel instead of a text channel with threads
Each email becomes a forum post. Tags such as `Open`, `Replied` and `Resolved` give status tracking, filtering and search, and the bot can set `Replied` after it sends a reply. Right now there's no way to see which emails have been handled.

### 12. Thread by reply-to address, and fix `In-Reply-To`
- Set `reply_to: feedback+<threadId>@better-rail.co.il`. It's more reliable than the subject tag, because Resend accepts mail to any address on the domain and `extractThreadId` already parses that format.
- Point `In-Reply-To`/`References` at the customer's real `message_id` instead of the invented `<thread-…@better-rail.co.il>`, so replies thread correctly in the customer's mail client.

### 13. Strip quoted history from follow-ups
Follow-up emails currently repeat the whole earlier conversation. Cut everything after lines like `On … wrote:` and drop lines starting with `>`.

### 14. Rate limiting
Nothing limits inbound volume, so an email flood creates unlimited threads. A per-sender limit would be enough.

---

## Nits

- `src/index.ts:14`: revert `maxRequestBodySize` to `64_000`. The 1 MB limit applies to every route, including Discord interactions, and the webhook payload is only metadata because the body is fetched separately.
- `src/resend.ts`: add `AbortSignal.timeout` to both fetches, as `DiscordApi` already does.
- `src/resend.ts:98`: remove `Content-Type` from the GET request.
- Merge the duplicated `SlashCommandInteraction` and `Interaction` types.
- Remove the trailing blank lines at the end of `src/interactions.ts` and `src/setup.ts`.
- `src/setup.ts:45`: the `setupFilePath` change is unrelated to this feature. Consider moving it to a separate commit.
