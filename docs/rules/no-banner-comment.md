# Disallow decorative banner comments (no-banner-comment)

A banner made of repeated characters — a divider line, a boxed title — adds
visual weight without adding information. It also drifts: the line length
stops matching the title the moment either one is edited. File structure,
section naming, and `describe` blocks carry the same organizing intent without
the upkeep.

## Rule Details

The rule checks each comment group (see `comment-length` for how groups are
formed) for a run of five or more consecutive identical characters from the
set `= * # ~ - ─ ━`. A group is reported at most once, even if more than one
of its comments matches.

## Exemptions

Two patterns that look like banners are not:

1. **A JSDoc opener or closer.** A run of `*` directly after the block's
   opening `/*` and ending its line, or a run of `*` alone on the line before
   the closing `*/`, is block-comment syntax, not decoration. A run of `*`
   elsewhere in the block — for example wrapping a title on its own line — is
   still reported.
2. **Markdown table separators.** A row like `| --- | --- |` or
   `| :---: | ---- |` inside a comment is a table, not a banner, regardless of
   how many `-` characters it contains.

## Examples of incorrect code for this rule

```js
/*eslint canopy/no-banner-comment: "error"*/

// ─── Fixtures ─────────────────────────────

// =============== Exported Types Starts ===============

// ##### Section

// ~~~~~

/* ***** */

/****** Title ******/

/*
 * ==========
 * Helpers
 */
```

## Examples of correct code for this rule

```js
/*eslint canopy/no-banner-comment: "error"*/

/** Fetches the widget. */

/**
 * Fetches the widget.
 * @param {string} id
 */
function f(id) {}

/****************
 * Fetches the widget.
 ****************/

/**
 * | name | type |
 * |------|------|
 * | id   | text |
 */

// | a | b |
// | :---: | ---- |

// --- short divider

// a -> b -> c
```

A short run below the five-character threshold (`--- short divider`) and an
arrow made of hyphens (`a -> b -> c`) are not banners; the rule only fires on
five or more of the same character in a row.

### Rewriting a section divider

A divider that separates unrelated content in one file is usually marking a
seam that should be its own file or its own `describe` block instead:

```js
// ─── Fixtures ─────────────────────────────
const widget = { id: '1', name: 'Widget' };
const user = { id: '2', name: 'User' };
```

becomes either a `describe` block that groups the related tests:

```js
describe('fixtures', () => {
  const widget = { id: '1', name: 'Widget' };
  const user = { id: '2', name: 'User' };
});
```

or, if the fixtures are shared across files, a separate fixtures module that
each test imports.

## When Not To Use It

If a project deliberately formats source files with ASCII-art section
dividers as a house style, this rule will fight that style on every file.
