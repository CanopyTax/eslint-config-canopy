# Disallow history narration in comments (no-history-in-comment)

A comment that describes how the code used to behave, or what a fix changed,
stops being useful the moment the reader cannot see what came before. The
narration also rots: the next change makes the "before" state wrong, and
nothing forces the comment to keep up. Git already keeps the history; the
comment should describe the code as it stands.

## Rule Details

The rule checks each comment group — including the reason text of a directive
comment (`// eslint-disable-line rule -- reason`) — for a case-insensitive,
whole-phrase match against a fixed phrase list. A match is bounded on both
sides by a non-alphanumeric character (or the edge of the text), so `used to
come` does not match inside a longer word.

Phrase list:

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

### Phrases left out on purpose

`no longer`, `used to`, and `previously` are not in the list, even though a
narrower windbag list of history phrases includes them. In this codebase they
were checked against fleet comments before inclusion and mostly describe
runtime state or purpose rather than history:

- `no longer` — `if selectedAccount is no longer in the accounts list,
  re-select` describes a condition to check right now, not something that
  changed.
- `used to` — `Used to prevent double borders on right sticky columns` means
  "is used for," not "formerly."

Listing them would have made the rule noisy on exactly the comments that are
already stating a fact about the code.

A fleet calibration pass (2026-09-23) dropped three more phrase variants for
the same reason: each one, in practice, mostly described a present condition
of some record or state rather than a change that happened to the code, so
keeping them denylisted cost more true comments than it caught narration.

## Examples of incorrect code for this rule

```js
/*eslint canopy/no-history-in-comment: "error"*/

// CpLoader and CpTooltip used to come from canopy-styleguide!sofe

// The inbox-race scenario this PR fixes: an unrelated re-render must not clobber the id

// Regression: an earlier version invalidated every query

// Before the fix, two fields on different pages could be treated as one row.

// Backend now correctly returns directory_user_id as id

// the Cp* imports moved after the rename, so name the mock explicitly

/* catch here, otherwise the stream silently swallows the error */
```

## Examples of correct code for this rule

```js
/*eslint canopy/no-history-in-comment: "error"*/

// Reconcile: if selectedAccount is no longer in the accounts list, re-select

// Used to prevent double borders on right sticky columns

// get the previously shared/sent information for a file

// covers this bugfix path

// CpLoader and CpTooltip come from canopy-styleguide!sofe
```

The last example is a rewrite of the first incorrect one above: instead of
saying where the import used to live, it states where it lives now.

## When Not To Use It

If your team deliberately keeps a changelog-style comment at the top of a file
to summarize recent fixes for readers who won't check git history, this rule
will fight that convention.

If a specific comment genuinely needs to narrate history, opt out at that
comment:

```js
/* eslint-disable-next-line canopy/no-history-in-comment */
// Before the fix, two fields on different pages could be treated as one row.
```

Either directive form works for this rule: `// eslint-disable-next-line
canopy/no-history-in-comment` on its own line suppresses it too. Use the block
form when the same directive also covers `comment-length`, which joins a `//`
directive into the comment below it.
