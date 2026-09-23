# Disallow comments that restate the code (no-obvious-comment)

A comment that just re-describes the line below it in different words adds
reading time without adding information. `// increment the counter` above
`counter += 1;` tells the reader nothing they couldn't get from the code
itself. This rule flags that pattern so the comment can be removed, or turned
into something that says *why* the code does this.

This rule is a heuristic, not an exact match: it looks for word overlap
between the comment and the identifiers in the code it documents, and it can
both miss real restatements and flag a comment that happens to share words
with the code for another reason. Because of that, the rule ships at **warn**
rather than **error**, and its findings are advisory — they are not part of
the fleet-wide rollout enforced by the other content rules (`comment-length`,
`no-external-ref-in-comment`, `no-history-in-comment`, `no-hedge-in-comment`,
`no-banner-comment`), and are not something CI blocks on.

## Rule Details

The rule checks each comment group (see `comment-length` for how groups are
formed) and reports it only when **all** of the following hold:

1. **It is a single standalone `//` line.** Not a `/* */` block, not a
   comment trailing code on the same line, and not part of a multi-line run
   of consecutive `//` comments.
2. **The code it documents spans one or two lines.** The documented code is
   the outermost statement or declaration starting on the line right after
   the comment (a blank line between the comment and the code means there is
   nothing to attach it to, and the comment is skipped). A short comment
   above a multi-line block is more likely to be summarizing several steps
   than restating one.
3. **It has at most 12 words.**
4. **It contains at least one stock restatement verb** (see `STOCK_VERBS`
   below) **and at least one word that echoes an identifier** from the
   documented code. An identifier is split on `_` and camelCase boundaries
   before matching, and a trailing `s` on the comment's word is also tried
   (so `counters` matches `counter`).
5. **At least 85% of its words** are a stock verb, a stopword, or an
   identifier echo — this keeps the rule from firing on a comment that only
   incidentally contains a stock verb and an echoed identifier among mostly
   unrelated words.
6. **It contains no reason marker.** A comment that explains *why*, even
   briefly, is not obvious regardless of word overlap.

### Word lists

`STOCK_VERBS` (with their common inflections): `increment`, `decrement`,
`initialize`/`init`, `declare`, `define`, `create`, `set`, `assign`, `update`,
`return`, `call`, `invoke`, `check`, `loop`, `iterate`, `import`, `print`,
`log`, `append`, `add`, `remove`, `delete`.

`STOPWORDS` (don't count against the 85% threshold, and don't count as an
echo): `the`, `a`, `an`, `to`, `of`, `for`, `this`, `that`, `on`, `by`, `in`,
`and`, `it`, `its`, `with`, `from`, `as`, `is`, `are`, `our`, `we`.

Reason markers (any of these anywhere in the comment vetoes the report):
`so that`, `in order to`, `to avoid`, `to prevent`, `note:`, `warning:`,
`important:`, `because`.

## Examples of incorrect code for this rule

```js
/*eslint canopy/no-obvious-comment: "warn"*/

// increment the counter
counter += 1;

// set the user name
setUserName(name);

function f(items) {
  // return the items
  return items;
}

// initialize state
const state = {};

// remove listeners
removeListener(handler);
```

## Examples of correct code for this rule

```js
/*eslint canopy/no-obvious-comment: "warn"*/

// increment the counter so that retries back off
counter += 1;

// increment the counter because the server is 1-indexed
counter += 1;

// the counter (no stock verb)
counter += 1;

// increment it (no identifier echoed from the code)
count++;

// increment the counter (blank line before the code: not attached)

counter += 1;

// increment the counter (last line of the file: nothing to attach to)

// increment the counter
// before the next page (multi-line run, not a single line)
counter += 1;

counter += 1; // increment the counter (trailing comment, not standalone)

// loop over the items (documented code spans more than two lines)
for (const item of items) {
  use(item);
}

// set the user name on the user record that the name form edits for the user (too many words)
setUserName(name);

/* increment the counter */
counter += 1;
```

## When Not To Use It

If the fleet-wide calibration pass (tracked alongside this rule's rollout)
finds the rule mostly flags correct, non-obvious comments, disable it rather
than working around individual false positives — the heuristic is intended
to be dropped, not tuned per file, if it doesn't hold up on real code.
