# Claude automation security runbook

## Scope

The Claude workflow is a manually dispatched, read-only maintainer tool. It is not an issue bot, review bot, or autonomous coding agent. Public issue, pull-request, review-comment, and issue-comment text must never trigger it or enter its prompt.

## One-time setup

Repository administrators must configure the `claude-maintainer` GitHub Environment before use:

1. Require approval from a maintainer who is not the requester when GitHub supports that protection.
2. Allow deployments only from protected `main`.
3. Store `CLAUDE_CODE_OAUTH_TOKEN` only as an environment secret.
4. Remove repository- and organization-level fallback copies of the same secret.
5. Do not configure Anthropic workload-identity federation for this workflow.

The workflow checks the environment through GitHub's API before checking out source. It fails closed when the environment is missing, has no required reviewers, or does not protect branches.

## Run a review

1. Confirm that `main` is the intended source and that the working tree is not being used as a source of unreviewed code.
2. Open **Actions → Claude maintainer review → Run workflow**.
3. Select `main` and choose one fixed task: `review-main` or `inspect-ci`.
4. The environment reviewer verifies the task, source ref, and reason for the review.
5. Read the action result locally or from the bounded job metadata. Do not paste repository content, prompts, tokens, or raw tool output into public issues.

The task selector is a closed choice list and is validated again at runtime before checkout or Claude execution. The workflow passes only the corresponding fixed prompt to Claude; it does not interpolate issue bodies, review bodies, comments, branch names, or commit messages into a shell command.

## Tool and permission policy

The Claude CLI is constrained to four turns, `bare` mode, `dontAsk` permission mode, and these read-only tools:

- `Read`
- `Grep`
- `Glob`

Project and local Claude settings are not loaded, and reads outside the checkout are blocked. `Bash`, `Edit`, `Write`, `NotebookEdit`, `WebFetch`, `WebSearch`, and all MCP tools are explicitly disallowed. The workflow grants only read-only repository, deployment, pull-request, issue, check, and Actions permissions. It does not grant `id-token: write`, package-write permissions, or a custom write-capable GitHub App token.

The action receives the built-in read-only `github.token` so it does not request OIDC or exchange for a broader App token. The OAuth secret is referenced only by the Claude action step. Dependency installation, environment verification, checkout, and metadata recording do not receive the Claude credential. Debug reruns are rejected before checkout so the action cannot enable full output.

## Prompt-injection boundary

Repository files are code under review, not instructions from the maintainer. Claude is instructed to report findings only. The workflow does not accept free-form prompts and does not read public event text. Keep the following corpus in the policy tests when changing the workflow:

- shell metacharacters and command substitutions;
- “ignore previous instructions” style text;
- fake system/developer messages;
- issue, review, and comment payloads containing `@claude`;
- branch and pull-request ref injection;
- requests to exfiltrate environment variables or credentials.

A new trigger, prompt input, shell interpolation, tool permission, or secret scope requires a security review and a new corpus case.

## Bounded observability

The final step records only task choice, Git ref, GitHub actor, and workflow URL. Claude's full output, tool results, and report are disabled. Do not add `show_full_output`, report rendering, raw prompt logging, or unrestricted `additional_permissions` without reviewing public-log exposure.

## Disable or revoke

If the automation is misused or its credential may be exposed:

1. Disable or delete the workflow.
2. Cancel active runs.
3. Revoke and rotate `CLAUDE_CODE_OAUTH_TOKEN`.
4. Remove the environment secret and verify repository/organization fallbacks are absent.
5. Review the environment deployment history and bounded Actions metadata.
6. Record the incident and recovery owner in the security issue.

Disabling the workflow does not require a code revert; the previous public automation is already disabled by the trigger replacement.

## Local checks

Run from the repository root:

```sh
bun test ./.github/workflows/claude.test.ts
actionlint .github/workflows/claude.yml
zizmor .github/workflows/claude.yml
```

The tests are a policy gate, not a claim that a hosted maintainer run has been completed.
