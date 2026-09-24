# Disallow hedging in comments (no-hedge-in-comment)

A comment that hedges — "not sure why," "hopefully," "I think" — tells the
reader that whoever wrote it did not find out. That leaves the next person to
either repeat the investigation or trust an unverified guess. A comment should
state a fact about the code, or not exist.

## Rule Details

The rule checks each comment group — including the reason text of a directive
comment (`// eslint-disable-line rule -- reason`) — for a case-insensitive,
whole-phrase match against a fixed phrase list, using the same matching as
`no-history-in-comment`: bounded on both sides by a non-alphanumeric character,
so `should work` does not match inside `should workers`.

Phrase list:

```
should work, hopefully, probably fine, probably works, probably safe,
not sure why, not sure if, not sure this, i think, i believe,
as far as i can tell, afaik, seems to work, should be fine, should fix,
not 100% sure, not entirely sure, might not work, for some reason,
no idea why, in theory, should be ok
```

Message: `Comment hedges ("{{match}}"). Find out and state it, or remove the
comment.`

### The `for some reason` false positive on defensive branches

Fleet calibration turned up one recurring false positive: a defensive branch
comment like `// For when for some reason there is no section header on the
page`. The phrase is there, and the rule reports it, on purpose — the report is
correct even though the branch itself is legitimate. The comment is still
hedging: it names a condition without saying what causes it or why the code
guards against it. The fix is to state the condition plainly instead of
disabling the rule:

```js
// The page may have no section header; fall back to the form's first field
```

## Examples of incorrect code for this rule

```js
/*eslint canopy/no-hedge-in-comment: "error"*/

// Not sure why, but the svg has a title of "filled circle" we can check

//just a default that is hopefully close to what it really comes out to

// I think red must be passing in a bulkTaskJql prop

/* For some reason storybook has an issue with parsing the title */

// For when for some reason there is no section header on the page
```

## Examples of correct code for this rule

```js
/*eslint canopy/no-hedge-in-comment: "error"*/

// should workers restart, the queue drains first

// Think of the reducer's input as the raw feed

// The retry must work offline; the cache is read first

// The page may have no section header; fall back to the form's first field
```

The last example is a rewrite of the final incorrect one above: instead of
naming the condition as a hedge, it states the condition and the fallback
directly.

## When Not To Use It

If your team uses hedge phrases as an intentional marker for comments that
still need follow-up investigation — a searchable convention rather than a
mistake — this rule will fight that convention.

If a specific comment genuinely needs to hedge, opt out at that comment:

```js
/* eslint-disable-next-line canopy/no-hedge-in-comment */
// Not sure why, but the svg has a title of "filled circle" we can check
```

Either directive form works for this rule: `// eslint-disable-next-line
canopy/no-hedge-in-comment` on its own line suppresses it too. Use the block
form when the same directive also covers `comment-length`, which joins a `//`
directive into the comment below it.
