# Limit comment length (comment-length)

A comment that runs to a screenful is usually a sign the explanation belongs
somewhere more durable — a linked doc, a commit message, or a shorter comment
that says *why* rather than narrating *what*. This rule caps a single comment at
a configurable length (default **240** characters, roughly 2-3 lines at an 80-120
column width) so long prose is a conscious choice rather than a default.

## Rule Details

The rule measures the comment's text — the content between the `//` or `/* */`
markers, trimmed — and reports when it exceeds the limit.

- **Consecutive `//` lines are measured as one comment.** A run of standalone
  `//` lines with no code between them is joined and checked together, so
  breaking a long paragraph across several `//` lines does not slip past the
  limit. A `//` comment that trails code on its line (`foo(); // note`) is
  measured on its own.
- **Each `/* */` block is measured whole.**

Directive comments are deliberately **not** exempt — a directive's justification
(`// eslint-disable-next-line rule -- reason`) should be terse, and a limit
encourages that.

## Exemptions

Two kinds of comment are skipped:

1. **Structured JSDoc.** A `/** … */` block that carries at least one JSDoc tag
   (`@param`, `@returns`, `@example`, `@deprecated`, …) is genuine API
   documentation, which legitimately runs long. A **tagless** `/** … */` block is
   treated as ordinary prose in doc syntax and is still measured — wrapping a long
   paragraph in `/** */` does not defeat the rule.
2. **URLs.** A comment (or `//` run) containing a URL cannot be shortened, so it
   is skipped. This mirrors the built-in `max-len` rule's own `ignoreUrls` option.

If a comment genuinely must be long and neither exemption applies, opt out
explicitly at the point it is written:

```js
// eslint-disable-next-line canopy/comment-length
```

That keeps every long comment a visible, justified decision rather than a silent
built-in carve-out.

## Options

```js
'canopy/comment-length': ['warn', { max: 240 }]
```

- `max` (integer, default `240`) — the maximum number of characters allowed in a
  comment's text.

Examples of **incorrect** code for this rule:

```js
/*eslint canopy/comment-length: "error"*/

// This comment keeps going and going, well past the point where it would fit in the two or three lines the limit is meant to allow, so it should be shortened or moved into linked documentation instead of living inline here.

/* A block comment is measured the same way. A tagless doc-syntax block earns no
   exemption either — if the prose is this long it belongs in a real doc, not a
   comment that scrolls off the screen and drifts out of date. ... */

/**
 * A /** */ block with no JSDoc tag is just prose in doc syntax, so it is still
 * measured and this long paragraph trips the limit exactly as the plain block
 * above does. Adding a real @tag would exempt it — as genuine API docs. ...
 */

// The first half of a long explanation split across two lines to look shorter,
// but the two lines are measured together so the total still trips the limit.
```

Examples of **correct** code for this rule:

```js
/*eslint canopy/comment-length: "error"*/

// Explain why, not what — a short comment usually can.
/* A block comment under the limit is fine. */

// A comment that is mostly an unshortenable URL is exempt:
// see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce

/**
 * Fetches the widget and normalizes its payload for the table view.
 * @param {string} id the widget id
 * @returns {Promise<Widget>} the normalized widget — a tagged JSDoc block is exempt however long it grows
 */

// eslint-disable-next-line canopy/comment-length
// When a comment genuinely must be long, an explicit disable makes it a visible, deliberate decision rather than a silent exception baked into the linter.
```

## How the length is measured

- Line comment: the text after `//`, trimmed.
- Block comment: the text between `/*` and `*/`, trimmed (internal `*` decoration
  and newlines count toward the length).
- A run of consecutive standalone `//` lines: each line's trimmed text joined
  with a single space, then measured.

## When Not To Use It

If your codebase relies on long **tagless** block comments as prose documentation
and you do not want to convert them to tagged JSDoc or add explicit disables, this
rule will fight that convention. Either raise `max`, or disable the rule for the
files where those comments live.
