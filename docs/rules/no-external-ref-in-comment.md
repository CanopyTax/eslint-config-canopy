# Disallow external references in comments (no-external-ref-in-comment)

A comment should stand on its own for a reader who has only the repo open. A
ticket ID, a section of a planning document, or a PR number moves the real
explanation somewhere that reader cannot see — a Jira board, a doc that was
never committed, a closed PR. This rule reports those references.

## Rule Details

The rule checks each comment group — including tagged JSDoc, comments that are
only a URL, and the reason text of a directive comment (`// eslint-disable-line
rule -- reason`) — for two kinds of unreachable reference.

**`ticket`** matches `\b[A-Z][A-Z0-9]{1,9}-\d+\b`, case-sensitive, unless the
prefix is one of `UTC GMT UTF ISO RFC CVE GHSA SHA AES RGB LICENSE`. There is no
`TODO(ABC-123)` exemption and no URL exemption — a Jira link is caught through
the ticket ID it contains (`.../browse/TRFORMS-478` still matches `TRFORMS-478`).

Message: `Comment references ticket "{{match}}". Put ticket links in the commit
or PR, and state the reason here.`

**`docPointer`** matches any of:

- `§`
- a `.md` filename, other than `README.md`, `CHANGELOG.md`, or `CONTRIBUTING.md`
  (case-insensitive)
- `PR #N` or `PR N`
- `Phase N`
- a source path with a line number: `name.(ts|tsx|js|jsx|mjs|cjs):N`

Message: `Comment points at "{{match}}", which a reader of this file cannot
open. Inline the fact the comment depends on.`

A group is checked for `ticket` first; if it matches, `docPointer` is not also
checked, so each group produces at most one report.

## What is not reported

- The denylisted uppercase prefixes (`UTC-8`, `GMT-0700`, `UTF-8`, `RFC-6902`,
  `CVE-2021-44228`, and the rest) — these are ticket-shaped but are standards and
  identifiers, not tickets.
- An upstream issue URL with no ALLCAPS-NUMBER token, such as a GitHub issue
  link (`.../issues/16265`).
- `README.md`, `CHANGELOG.md`, and `CONTRIBUTING.md` — files that ship with the
  repo and stay reachable from it.
- Lowercase `phase` (`the phase 2 animation`) — only the capitalized `Phase N`
  form is treated as a planning-document pointer.

## Examples of incorrect code for this rule

```js
/*eslint canopy/no-external-ref-in-comment: "error"*/

// TODO(BLU-697): handle archived rows

// https://canopytax.atlassian.net/browse/TRFORMS-478

// Covers AC-13 of the ticket

/**
 * Loads the row.
 * @see SAP-451
 */
function load() {}

// @ts-expect-error SAP-451 upstream types
const a = 1;

// first line of the note
// second line cites RED-5

// per api-reference.md, see GS-740

// wire shape per api-reference.md § "Location object shape"

// see master-plan § Default Location

// Mock variants per the locked decision for PR 1

// shared LocationFields (PR #224 review)

// wire real tier data when a source exists (candidate: Phase 3)

// already loosely typed — see coworker.types.ts:198-234
```

## Examples of correct code for this rule

```js
/*eslint canopy/no-external-ref-in-comment: "error"*/

// but Monday 11 PM in US/Pacific (UTC-8)

// decoded as UTF-8 before hashing

// the fixture timestamp is 09:00 GMT-0700

// Licensed under https://www.apache.org/licenses/LICENSE-2.0

// see RFC-6902 for the patch format, and CVE-2021-44228

// Destructure needed for linting https://github.com/facebook/react/issues/16265

// Fixture shapes are documented in fixtures/README.md

// see CHANGELOG.md

// the phase 2 animation starts after layout

// the helper lives in format.ts

// TODO: archived rows are returned too; filter them before rendering
```

The last example is a rewrite of the first incorrect one above: instead of
pointing at the ticket, it states what the code still needs to do.

## When Not To Use It

If your codebase requires ticket IDs in comments by policy — for example, a
compliance rule that every workaround must cite its tracking ticket inline —
this rule will fight that convention.

If a specific comment genuinely needs to keep a reference, opt out at that
comment:

```js
/* eslint-disable-next-line canopy/no-external-ref-in-comment */
// see TRFORMS-478 for the full history of this workaround
```
