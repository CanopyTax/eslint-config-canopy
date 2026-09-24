# Comment content rules — design

Status: approved 2026-09-23; implemented on branch feat/comment-content-rules.

## Context

`canopy/comment-length` (v5.4.0, `error`) caps a comment at 240 characters. The
5.4 rollout resolved 252 of its findings: 162 with an eslint-disable, 90 by
shortening, and every shortened comment was model-drafted. Length is a proxy.
The problems it approximates in model-drafted comments are specific: ticket
references, pointers to documents the reader cannot open, narration of change
history, hedging, and decorative banners.

This release adds rules that name those problems directly. The approach is
adapted from [windbag](https://github.com/scale-venture-partners/windbag), a
Rust comment-prose linter; only its rule ideas are reused, reimplemented as
ESLint rules.

## Goal

An LLM cannot merge a comment that contains a ticket reference, a doc pointer,
history narration, hedging, or a banner, because CI fails. `warn` does not
block CI, so every content rule except `no-obvious-comment` ships at `error`.

## Non-goals

- Changing `comment-length`. It stays at 240 characters and `error`.
- A comment-to-code ratio check. Measured and rejected (Appendix C).
- The fe-ai-config PostToolUse hook. CI enforcement makes it an optimization;
  it can ship later on its own.
- Rule options. A false positive gets an eslint-disable, matching
  `comment-length`.

## Rules

All rules run in `Program` over `sourceCode.getAllComments()`. None traverse
the AST except `no-obvious-comment`, which reads the line after the comment.

### Shared helper: `plugin/utils/comment-groups.js`

Extracted from `comment-length`. Returns comment groups:

- A `/* */` block is one group.
- A `//` comment with code before it on the same line is one group.
- A maximal run of standalone `//` comments on consecutive lines is one group;
  its text is each line's trimmed value joined with a space.

Each group carries `text`, `loc` (first comment's start to last comment's
end), and the underlying comments. `comment-length` is refactored onto the
helper with no behavior change; its existing RuleTester suite must pass
unmodified.

Each rule reports a group at most once, on the first match, with the matched
text in the message.

### Scope of the content rules

The content rules check every group, including tagged JSDoc blocks, URLs, and
the reason text of directive comments (`eslint-disable-next-line x -- reason`).
The JSDoc and URL exemptions in `comment-length` exist because long structured
docs and URLs cannot be shortened; they do not apply to content. `@see BLU-123`
is a ticket reference.

The rules skip a group whose entire text is a directive with no reason
(`eslint-disable…`, `eslint-enable…`, `@ts-…`, `prettier-ignore`, `istanbul …`, `c8 …`, and in block comments inline config `eslint …`, `global`/`globals`, `exported`), so the
disables this rollout adds never trip a rule.

### `no-external-ref-in-comment` (error)

Reports a reference the reader cannot follow from the repo. Two message IDs:

- `ticket` — `\b[A-Z][A-Z0-9]{1,9}-\d+\b`, case-sensitive, where the prefix is
  not one of `UTC GMT UTF ISO RFC CVE GHSA SHA AES RGB LICENSE`. No URL exemption
  (Jira links contain the ID and are caught). No `TODO(ABC-123)` exemption.
  Message: `Comment references ticket "{{match}}". Put ticket links in the
  commit or PR, and state the reason here.`
- `docPointer` — any of:
  - `§`
  - a `.md` filename other than `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`
    (case-insensitive)
  - `PR #N` or `PR N`
  - `Phase N`
  - a source path with a line number: `name.(ts|tsx|js|jsx|mjs|cjs):N`

  Message: `Comment points at "{{match}}", which a reader of this file cannot
  open. Inline the fact the comment depends on.`

### `no-history-in-comment` (error)

Case-insensitive phrase match with non-alphanumeric boundaries on both sides.

Phrases (windbag's list, minus `no longer`, `used to be`, `previously was`,
and `was broken`, plus Canopy additions):

```
was missing, previously did, previously had,
before this fix, before this change, before this commit, before this pr,
never actually, have never, root-caused, root caused, this fix, this bug,
the bug was, now correctly, silently no-ops, silently noops,
silently fails, silently skips, silently swallows,
used to come, we used to, after the rename, before the fix, after the fix,
this pr, this pull request, an earlier version, previous implementation,
the old code
```

Message: `Comment narrates history ("{{match}}"). Describe how the code works
now; git records how it changed.`

### `no-hedge-in-comment` (error)

Same matching as `no-history-in-comment`. windbag's list as it is:

```
should work, hopefully, probably fine, probably works, probably safe,
not sure why, not sure if, not sure this, i think, i believe,
as far as i can tell, afaik, seems to work, should be fine, should fix,
not 100% sure, not entirely sure, might not work, for some reason,
no idea why, in theory, should be ok
```

Message: `Comment hedges ("{{match}}"). Find out and state it, or remove the
comment.`

### `no-banner-comment` (error)

Reports a group containing a run of five or more of the same character from
`= * # ~ - ─ ━`.

Not reported:

- A JSDoc opener or closer: a leading run of `*` directly after `/*`, or a
  trailing run directly before `*/`, is ignored.
- Markdown table separators inside a comment (`|---|`, `| --- |`, with or
  without `:` alignment).

Message: `Decorative banner comment. Remove it; use file structure and naming
to separate sections.`

### `no-obvious-comment` (warn)

Port of windbag's `OBVIOUS_COMMENT`. Reports a group when all hold:

- It is a single standalone `//` line (not trailing, not part of a run).
- The code it documents — the outermost node starting on the next line —
  spans one or two lines.
- It has at most 12 words.
- It contains at least one stock restatement verb **and** at least one word
  that matches an identifier part from that code (camelCase and snake_case
  split; a trailing `s` is also tried).
- At least 85% of its words are a stock verb, a stopword, or an identifier
  echo.
- It contains no reason marker.

Word lists are windbag's: `STOCK_VERBS` (increment, decrement, initialize,
init, declare, define, create, set, assign, update, return, call, invoke,
check, loop, iterate, import, print, log, append, add, remove, delete, with
their inflected forms); `STOPWORDS` (the, a, an, to, of, for, this, that, on,
by, in, and, it, its, with, from, as, is, are, our, we); reason markers
`so that`, `in order to`, `to avoid`, `to prevent`, `note:`, `warning:`,
`important:`, plus Canopy's addition `because`. Thresholds are windbag's
defaults. It is uncalibrated on this fleet; the
implementation plan includes a calibration pass against the labeled corpus
(Appendix A). If a sample of its findings is mostly correct comments, the rule
is dropped from 5.5.0, not shipped.

Message: `Comment restates the code below it. Remove it, or say why the code
does this.`

### Config

`eslint.config.js` enables the four content rules at `error` and
`no-obvious-comment` at `warn`, next to `comment-length`.

## Documentation and tests

Each rule gets `docs/rules/<rule>.md` in the existing format (details,
incorrect/correct examples, when not to use) and a RuleTester suite. Suites
include fleet examples as fixtures, both matches and known non-matches:

- `no longer` describing runtime state ("if selectedAccount is no longer in
  the list") — not history.
- `used to` meaning "is used for" — not in the list.
- `for some reason` in a defensive branch — a known false positive of the
  hedge list, kept in the suite as documented behavior.
- `UTC-8`, `UTF-8` — not tickets.
- `https://github.com/facebook/react/issues/16265` — not a ticket.
- `README.md` — not a doc pointer.

The `code-comment-discipline` skill in fe-ai-config gets one line naming the
rules. That change ships separately.

## Versioning

Published as **5.5.0**. New `error` rules in a minor release mean any repo on
`^5.4.0` resolves 5.5.0 on its next lockfile refresh and fails lint on an
unrelated PR. Accepted: the fleet rollout starts as soon as 5.5.0 is
published, which keeps that window short.

## Rollout

Reuses the 5.4 rollout tooling (`~/code/canopy/eslint-5.4-rollout/`): one
subagent per repo, `provenance.mjs` (`git log -L`, not blame), per-repo
manifests, the audit diff, and `prove-lint.sh`.

Resolution per finding follows the 5.4 provenance gate:

- Authored before 2025-07-01, human-written, or uncertain: a bare
  `eslint-disable-next-line <rule>` above the comment. The text is not
  changed.
- Model-drafted: rewritten to remove the violation — drop the ticket or
  pointer and keep the reason; state the fact instead of the hedge; describe
  current behavior instead of history; delete the banner.
- Every finding goes through the gate on its own. An existing disable
  (from the 5.4 rollout or anywhere else) is not evidence of provenance, and
  its manifest label is not reused. A model-drafted comment that already
  carries a `comment-length` disable is rewritten like any other
  model-drafted finding. If the rewrite brings it under 240 characters, the
  `comment-length` entry is removed from the directive, or the directive is
  deleted if nothing else is left in it.
- Directive mechanics come after the gate. When the gate says disable, the
  rule is added to an existing directive above the comment if there is one;
  otherwise a new directive is added. A comment hit by several rules that the
  gate says to disable gets one directive listing all of them.
- Directives use the block form `/* eslint-disable-next-line … */`, as in
  5.4. The content rules treat a directive-only `//` line as its own comment,
  so the `//` form works for them, but `comment-length` still joins it into
  the run below, so any directive that covers `comment-length` must be the
  block form. Using the block form everywhere keeps one convention.
- `no-obvious-comment` findings (`warn`) are not part of the rollout.

Estimated scale from local checkouts (stale; the plan re-measures on
`master`):

| Rule | Findings |
|---|---|
| external refs | ~210 |
| banners | ~290 |
| hedges | ~30 |
| history | ~15 |
| **total** | **~550, about 60 repos** |

A dry run on 3–4 repos checks these counts against the calibration numbers
before the fleet pass.

## Risks

- **Minor-version exposure.** Covered under Versioning.
- **Phrase lists are short.** The history and hedge rules catch specific
  phrasings, not the underlying habit. Recall on new model output is unknown;
  lists can grow in later minors with the same calibration step.
- **Banners are the largest share of rollout work** (~290), mostly in test
  files.

## Appendix A — labeled corpus

12,752 non-trailing comment groups from 66 local repos, `src/**/*.{js,jsx,ts,tsx}`.
Each group was blamed (`git blame -w`) to its commits and labeled:

- `model` (2,867): any commit carries an AI co-author trailer.
- `human` (5,687): all commits predate 2025-07-01 with no trailer.
- `unknown` (4,196): everything else.

Blame reports last touch, so labels are approximate; the rollout itself uses
`git log -L`.

## Appendix B — calibration

| Check | model | human | Result |
|---|---|---|---|
| ticket regex | 123 | 10 | ~99% true tickets across 174 fleet matches |
| doc pointer | 29 | 0 | all sampled matches are planning-doc refs |
| history additions | 5 | 0 | kept |
| banner | 66 | 18 | kept; +204 unknown |
| hedge list | — | — | 29 fleet matches, ~95% true hedges |
| history list, windbag | — | — | 38 matches, ~20% true; `no longer` was 32 of them and mostly runtime state |
| history list, revised | — | — | ~90% true |

Measured and rejected:

| Check | model | human | Reason |
|---|---|---|---|
| em dash `—` | 541 | 2 | Marks model authorship, not poor drafting |
| intentionally / load-bearing / single source of truth / in lockstep | 15–57× lift | | Usually carry a real constraint |
| `Regression:` | 27 | 1 | Often states a contract worth keeping |
| commented-out code | 1 | 51 | A human habit; outside this goal |
| Slack, name-dropping, follow-up PR, self-reference | ~0 | | No signal in the fleet |
| `used to`, `previously`, `no longer` | | | Mostly "is used for" or runtime state |

## Appendix C — ratio check (rejected)

windbag's `VERBOSE_COMMENT` flags a comment over 6 lines or over 2× the lines
of the next AST node. A character-based version was measured on the corpus:
at a 120-character floor and a 4× ratio it adds 329 findings under the
240-character cap. In a 30-comment sample, about 7 were too wordy; the rest
were explanations of short, non-obvious statements (`break;`, `return;`,
`delete x.archived_at`, `invalidate()`). Without the ratio, raising the
`comment-length` cap would only let more model-drafted text through, so the
cap stays at 240.

## Validation results

Run on 2026-09-24 over 66 local checkouts (stale; rollout re-measures on master).

| Rule | Findings | Repos | Sample precision |
|---|---|---|---|
| no-external-ref-in-comment | 187 | 15 | 10/10 |
| no-history-in-comment | 18 | 8 | 8/10 |
| no-hedge-in-comment | 35 | 17 | 8/10 |
| no-banner-comment | 305 | 15 | 10/10 |
| no-obvious-comment | 56 | 17 | 27/30 obvious — kept |

No count differs from its estimate by more than 2×.

The first run (2026-09-23) failed two rules: external-ref at 6/10, because `GMT-0700` timestamps matched the ticket pattern (47 findings), and history at 7/10, because of runtime-state phrases. Commit 309ac0f added `GMT` to the ticket-prefix exclusions and removed `used to be`, `previously was`, and `was broken`. The external-ref and history rows above are from a second run with a new sample (seed 20260924). The hedge, banner, and no-obvious precision figures come from run 1 (seed 20260923), since those rules did not change. All counts are from run 2.
