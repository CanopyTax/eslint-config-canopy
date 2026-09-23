# Comment Content Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five comment content rules to `eslint-config-canopy` and prepare the 5.5.0 release PR.

**Architecture:** A shared helper groups comments the way `comment-length` already does (block, trailing `//`, run of standalone `//` lines). A second helper extracts the prose from a group, dropping directive syntax, and matches phrase lists. Each rule is a `Program` visitor over those groups. `comment-length` moves onto the grouping helper with no behavior change.

**Tech Stack:** Node 24, ESLint 9 (flat config, `RuleTester`, `Linter`), ESM (`"type": "module"`), `node --test`.

**Spec:** `docs/superpowers/specs/2026-09-23-comment-content-rules-design.md`. Read it before starting; this plan does not repeat its reasoning.

**Out of scope:** the fleet rollout (separate plan), the fe-ai-config hook, and the `code-comment-discipline` skill edit.

## Global Constraints

- Severities: `no-external-ref-in-comment`, `no-history-in-comment`, `no-hedge-in-comment`, `no-banner-comment` at `error`; `no-obvious-comment` at `warn`; `comment-length` unchanged (`error`, 240).
- No rule options: every new rule has `schema: []`.
- Package version: `5.5.0`.
- Do not merge the PR. `.github/workflows/publish.yml` publishes on every push to `master`.
- The repo lints itself (`yarn lint`). Comments added by this work must pass the new rules and follow the `code-comment-discipline` skill.
- Rule messages are copied verbatim from the spec. They are repeated in each task.
- Docs follow the format of `docs/rules/comment-length.md`. Plain technical English, no metaphor.
- `comment-length`'s existing test file is not edited.

## Review Focus

1. A `//` disable directive directly above a violating `//` comment. The spec says it does not suppress the finding, because the directive joins the run and the run is reported at the directive's line. The block form `/* eslint-disable-next-line … */` does suppress it. Pinned in Task 7 (`test/config/comment-rules.test.js`).
2. A JSX comment (`{/* … */}`) in a `.tsx` file parsed by `@typescript-eslint/parser`. Expected: checked like any block comment. Pinned in Task 7.
3. Empty comments (`//`, `/**/`). Expected: no report, no crash. Pinned in Tasks 3, 5, 6.
4. A shebang line (`#!/usr/bin/env node`). `getAllComments()` returns it with `type: 'Shebang'`. Expected: never reported by `no-obvious-comment`, and no crash elsewhere. Pinned in Tasks 5 and 6.
5. A candidate obvious comment on the last line of a file, with no code after it. Expected: no report. Pinned in Task 6.

---

### Task 1: Comment-grouping helper; move `comment-length` onto it

**Files:**
- Create: `plugin/utils/comment-groups.js`
- Modify: `plugin/rules/comment-length.js` (replace the body of `create`)
- Test: `test/utils/comment-groups.test.js`

**Interfaces:**
- Produces: `getCommentGroups(sourceCode) → Array<{ kind: 'block' | 'trailing' | 'run', comments: Comment[], text: string, loc: SourceLocation }>`. `text` is the trimmed value for `block`/`trailing`. For `run` it is each line's trimmed value joined with one space. `loc` runs from the first comment's start to the last comment's end.

- [ ] **Step 0: Set up the worktree**

Use superpowers:using-git-worktrees. Branch `feat/comment-content-rules` off `origin/master`. Copy the spec and this plan from the main checkout into the worktree at the same paths. Run `yarn install --immutable`. Commit:

```bash
git add docs/superpowers/specs/2026-09-23-comment-content-rules-design.md docs/superpowers/plans/2026-09-23-comment-content-rules.md
git commit -m "docs: add comment content rules spec and plan"
```

- [ ] **Step 1: Write the failing test**

```js
// test/utils/comment-groups.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from 'eslint';
import { getCommentGroups } from '../../plugin/utils/comment-groups.js';

function groupsOf(code) {
  let groups;
  const capture = {
    create(context) {
      return {
        Program() {
          groups = getCommentGroups(context.sourceCode);
        },
      };
    },
  };
  new Linter().verify(code, {
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    plugins: { t: { rules: { capture } } },
    rules: { 't/capture': 'error' },
  });
  return groups.map((g) => ({ kind: g.kind, text: g.text, start: g.loc.start.line, end: g.loc.end.line }));
}

test('consecutive standalone // lines form one run', () => {
  assert.deepEqual(groupsOf('// one\n// two\nconst a = 1;'), [{ kind: 'run', text: 'one two', start: 1, end: 2 }]);
});

test('a blank line ends a run', () => {
  assert.deepEqual(groupsOf('// one\n\n// two'), [
    { kind: 'run', text: 'one', start: 1, end: 1 },
    { kind: 'run', text: 'two', start: 3, end: 3 },
  ]);
});

test('a block comment is its own group and breaks a run', () => {
  assert.deepEqual(groupsOf('// one\n/* two */\n// three'), [
    { kind: 'run', text: 'one', start: 1, end: 1 },
    { kind: 'block', text: 'two', start: 2, end: 2 },
    { kind: 'run', text: 'three', start: 3, end: 3 },
  ]);
});

test('a trailing // comment stands alone and does not join the run below it', () => {
  assert.deepEqual(groupsOf('const a = 1; // trail\n// below'), [
    { kind: 'trailing', text: 'trail', start: 1, end: 1 },
    { kind: 'run', text: 'below', start: 2, end: 2 },
  ]);
});

test('a file with no comments has no groups', () => {
  assert.deepEqual(groupsOf('const a = 1;'), []);
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test test/utils/comment-groups.test.js`
Expected: FAIL, `Cannot find module '…/plugin/utils/comment-groups.js'`.

- [ ] **Step 3: Implement the helper**

```js
// plugin/utils/comment-groups.js

// Splits a file's comments into the units a reader treats as one comment: each
// /* */ block, each // comment that trails code, and each run of standalone //
// lines on consecutive lines, which reads as one paragraph.
export function getCommentGroups(sourceCode) {
  const comments = sourceCode.getAllComments();
  const groups = [];

  function isTrailing(comment) {
    const tokenBefore = sourceCode.getTokenBefore(comment, { includeComments: false });
    return Boolean(tokenBefore) && tokenBefore.loc.end.line === comment.loc.start.line;
  }

  for (let i = 0; i < comments.length; ) {
    const comment = comments[i];

    if (comment.type === 'Block' || isTrailing(comment)) {
      groups.push({
        kind: comment.type === 'Block' ? 'block' : 'trailing',
        comments: [comment],
        text: comment.value.trim(),
        loc: comment.loc,
      });
      i++;
      continue;
    }

    const run = [comment];
    let j = i + 1;
    while (j < comments.length) {
      const next = comments[j];
      if (
        next.type === 'Line' &&
        !isTrailing(next) &&
        next.loc.start.line === run[run.length - 1].loc.end.line + 1
      ) {
        run.push(next);
        j++;
      } else {
        break;
      }
    }

    groups.push({
      kind: 'run',
      comments: run,
      text: run.map((c) => c.value.trim()).join(' '),
      loc: { start: run[0].loc.start, end: run[run.length - 1].loc.end },
    });
    i = j;
  }

  return groups;
}
```

- [ ] **Step 4: Run the helper test and confirm it passes**

Run: `node --test test/utils/comment-groups.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Move `comment-length` onto the helper**

In `plugin/rules/comment-length.js`, add `import { getCommentGroups } from '../utils/comment-groups.js';` at the top. Replace everything inside `create(context) { … }` with:

```js
    const max = context.options[0]?.max ?? DEFAULT_MAX;
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    function check(text, loc) {
      if (URL_RE.test(text)) return;
      if (text.length <= max) return;
      context.report({ loc, messageId: 'tooLong', data: { length: text.length, max } });
    }

    return {
      Program() {
        for (const group of getCommentGroups(sourceCode)) {
          // A JSDoc block (`/** … */`) carrying an @tag is exempt as structured
          // API documentation; the leading `*` survives in `comment.value`.
          if (group.kind === 'block') {
            const { value } = group.comments[0];
            if (value.startsWith('*') && JSDOC_TAG_RE.test(value)) continue;
          }
          check(group.text, group.loc);
        }
      },
    };
```

Leave `DEFAULT_MAX`, `URL_RE`, `JSDOC_TAG_RE`, and `meta` as they are.

- [ ] **Step 6: Run the full suite and confirm `comment-length` is unchanged**

Run: `yarn test`
Expected: PASS, including every existing case in `test/rules/comment-length.test.js`, which is not edited.

- [ ] **Step 7: Commit**

```bash
git add plugin/utils/comment-groups.js plugin/rules/comment-length.js test/utils/comment-groups.test.js
git commit -m "refactor: extract comment grouping from comment-length"
```

---

### Task 2: Comment prose and phrase-matching helpers

**Files:**
- Create: `plugin/utils/comment-text.js`
- Test: `test/utils/comment-text.test.js`

**Interfaces:**
- Consumes: the group shape from Task 1 (only `group.comments[].type` and `.value`).
- Produces:
  - `getContentText(group) → string`: the group's prose. A directive comment adds nothing, except its reason: the text after ` -- ` for eslint directives, or the text after the directive word for `@ts-` directives. Returns `''` when the group is only bare directives.
  - `phraseMatcher(phrases: string[]) → (text: string) => string | undefined`: returns the first phrase found, case-insensitive, with no letter or digit on either side of it.

- [ ] **Step 1: Write the failing test**

```js
// test/utils/comment-text.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getContentText, phraseMatcher } from '../../plugin/utils/comment-text.js';

const line = (value) => ({ type: 'Line', value });
const block = (value) => ({ type: 'Block', value });
const group = (...comments) => ({ comments });

test('plain prose is returned trimmed and joined', () => {
  assert.equal(getContentText(group(line(' one '), line(' two'))), 'one two');
});

test('a bare eslint directive contributes nothing', () => {
  assert.equal(getContentText(group(block(' eslint-disable-next-line canopy/comment-length '))), '');
  assert.equal(getContentText(group(line(' eslint-disable-line no-console'))), '');
});

test('an eslint directive contributes only its reason', () => {
  assert.equal(getContentText(group(line(' eslint-disable-next-line no-console -- BLU-12 debug output'))), 'BLU-12 debug output');
});

test('a @ts- directive contributes the text after the directive word', () => {
  assert.equal(getContentText(group(line(' @ts-expect-error SAP-451 upstream types'))), 'SAP-451 upstream types');
});

test('inline config and globals are directives only in block form', () => {
  assert.equal(getContentText(group(block('eslint canopy/comment-length: "error"'))), '');
  assert.equal(getContentText(group(block('global SystemJS'))), '');
  assert.equal(getContentText(group(line(' eslint config lives in the package root'))), 'eslint config lives in the package root');
});

test('a directive line inside a // run is dropped and the prose kept', () => {
  assert.equal(getContentText(group(line(' eslint-disable-next-line x'), line(' hopefully fine'))), 'hopefully fine');
});

test('phraseMatcher matches whole phrases case-insensitively', () => {
  const find = phraseMatcher(['should work', 'this pr', 'root-caused']);
  assert.equal(find('This SHOULD WORK now'), 'should work');
  assert.equal(find('the scenario This PR fixes'), 'this pr');
  assert.equal(find('Root-caused to a race'), 'root-caused');
});

test('phraseMatcher ignores a phrase inside a longer word', () => {
  const find = phraseMatcher(['should work', 'this bug']);
  assert.equal(find('should workers restart'), undefined);
  assert.equal(find('covers this bugfix path'), undefined);
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test test/utils/comment-text.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```js
// plugin/utils/comment-text.js

// A directive configures a tool instead of explaining code, so only the reason
// attached to it is prose. ESLint reads inline config and globals only from
// block comments; disable/enable directives work in both forms.
const ANY_DIRECTIVE_RE = /^(?:eslint-disable(?:-next-line|-line)?|eslint-enable|prettier-ignore|istanbul|c8)(?:\s|$)/;
const BLOCK_DIRECTIVE_RE = /^(?:eslint|globals?|exported)(?:\s|$)/;
const TS_DIRECTIVE_RE = /^@ts-[\w-]+\s*/;

function proseOf(comment) {
  const text = comment.value.trim();
  if (TS_DIRECTIVE_RE.test(text)) return text.replace(TS_DIRECTIVE_RE, '');
  const isDirective =
    ANY_DIRECTIVE_RE.test(text) || (comment.type === 'Block' && BLOCK_DIRECTIVE_RE.test(text));
  if (!isDirective) return text;
  const reasonAt = text.indexOf(' -- ');
  return reasonAt === -1 ? '' : text.slice(reasonAt + 4).trim();
}

export function getContentText(group) {
  return group.comments.map(proseOf).filter(Boolean).join(' ');
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function phraseMatcher(phrases) {
  const patterns = phrases.map((phrase) => [
    phrase,
    new RegExp(`(?<![a-z0-9])${escapeRegExp(phrase)}(?![a-z0-9])`),
  ]);
  return (text) => {
    const lower = text.toLowerCase();
    return patterns.find(([, pattern]) => pattern.test(lower))?.[0];
  };
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `node --test test/utils/comment-text.test.js`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add plugin/utils/comment-text.js test/utils/comment-text.test.js
git commit -m "feat: add comment prose and phrase-matching helpers"
```

---

### Task 3: `no-external-ref-in-comment`

**Files:**
- Create: `plugin/rules/no-external-ref-in-comment.js`
- Create: `docs/rules/no-external-ref-in-comment.md`
- Test: `test/rules/no-external-ref-in-comment.test.js`

**Interfaces:**
- Consumes: `getCommentGroups` (Task 1), `getContentText` (Task 2).
- Produces: default-exported rule object; message IDs `ticket` and `docPointer`, each with data `{ match }`.

- [ ] **Step 1: Write the failing test**

```js
// test/rules/no-external-ref-in-comment.test.js
import { RuleTester } from 'eslint';
import rule from '../../plugin/rules/no-external-ref-in-comment.js';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
});

ruleTester.run('no-external-ref-in-comment', rule, {
  valid: [
    { code: `// but Monday 11 PM in US/Pacific (UTC-8)` },
    { code: `// decoded as UTF-8 before hashing` },
    { code: `// Licensed under https://www.apache.org/licenses/LICENSE-2.0` },
    { code: `// see RFC-6902 for the patch format, and CVE-2021-44228` },
    // Upstream issue links carry no ALLCAPS-NUMBER token.
    { code: `// Destructure needed for linting https://github.com/facebook/react/issues/16265` },
    { code: `// Fixture shapes are documented in fixtures/README.md` },
    { code: `// see CHANGELOG.md` },
    { code: `// the phase 2 animation starts after layout` },
    { code: `// the helper lives in format.ts` },
    // Not a comment.
    { code: `const ticket = "BLU-123";` },
    // A bare directive has no prose. eslint directives are covered in the
    // config test (Task 7), where unused-directive reports can be filtered out.
    { code: `// @ts-ignore\nconst a = 1;` },
    { code: `//` },
    { code: `/**/` },
  ],
  invalid: [
    {
      code: `// TODO(BLU-697): handle archived rows`,
      errors: [{ messageId: 'ticket', data: { match: 'BLU-697' } }],
    },
    {
      code: `// https://canopytax.atlassian.net/browse/TRFORMS-478`,
      errors: [{ messageId: 'ticket', data: { match: 'TRFORMS-478' } }],
    },
    {
      code: `// Covers AC-13 of the ticket`,
      errors: [{ messageId: 'ticket', data: { match: 'AC-13' } }],
    },
    {
      code: `/**\n * Loads the row.\n * @see SAP-451\n */\nfunction load() {}`,
      errors: [{ messageId: 'ticket', data: { match: 'SAP-451' } }],
    },
    {
      code: `// @ts-expect-error SAP-451 upstream types\nconst a = 1;`,
      errors: [{ messageId: 'ticket', data: { match: 'SAP-451' } }],
    },
    // A run is reported once, spanning every line.
    {
      code: `// first line of the note\n// second line cites RED-5`,
      errors: [{ messageId: 'ticket', line: 1, endLine: 2 }],
    },
    // Ticket is checked first; one report per group.
    {
      code: `// per api-reference.md, see GS-740`,
      errors: [{ messageId: 'ticket', data: { match: 'GS-740' } }],
    },
    {
      code: `// wire shape per api-reference.md § "Location object shape"`,
      errors: [{ messageId: 'docPointer', data: { match: 'api-reference.md' } }],
    },
    {
      code: `// see master-plan § Default Location`,
      errors: [{ messageId: 'docPointer', data: { match: '§' } }],
    },
    {
      code: `// Mock variants per the locked decision for PR 1`,
      errors: [{ messageId: 'docPointer', data: { match: 'PR 1' } }],
    },
    {
      code: `// shared LocationFields (PR #224 review)`,
      errors: [{ messageId: 'docPointer', data: { match: 'PR #224' } }],
    },
    {
      code: `// wire real tier data when a source exists (candidate: Phase 3)`,
      errors: [{ messageId: 'docPointer', data: { match: 'Phase 3' } }],
    },
    {
      code: `// already loosely typed — see coworker.types.ts:198-234`,
      errors: [{ messageId: 'docPointer', data: { match: 'types.ts:198' } }],
    },
  ],
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test test/rules/no-external-ref-in-comment.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```js
// plugin/rules/no-external-ref-in-comment.js
import { getCommentGroups } from '../utils/comment-groups.js';
import { getContentText } from '../utils/comment-text.js';

// Uppercase prefixes that form ticket-shaped tokens without being tickets.
const NOT_TICKET_PREFIXES = new Set(['UTC', 'UTF', 'ISO', 'RFC', 'CVE', 'GHSA', 'SHA', 'AES', 'RGB', 'LICENSE']);
const TICKET_RE = /\b([A-Z][A-Z0-9]{1,9})-\d+\b/g;

// Committed docs a reader can open from the repo. Any other .md file is assumed
// to be a planning document that does not ship with the code.
const OPENABLE_DOCS = new Set(['readme.md', 'changelog.md', 'contributing.md']);
const MD_FILE_RE = /[\w./-]+\.md\b/gi;
const POINTER_RES = [/§/, /\bPR ?#?\d+\b/, /\bPhase \d+\b/, /\b[\w-]+\.(?:tsx?|jsx?|mjs|cjs):\d+/];

function findTicket(text) {
  for (const match of text.matchAll(TICKET_RE)) {
    if (!NOT_TICKET_PREFIXES.has(match[1])) return match[0];
  }
  return undefined;
}

function findDocPointer(text) {
  for (const match of text.matchAll(MD_FILE_RE)) {
    const name = match[0].split('/').pop().toLowerCase();
    if (!OPENABLE_DOCS.has(name)) return match[0];
  }
  for (const pattern of POINTER_RES) {
    const match = pattern.exec(text);
    if (match) return match[0];
  }
  return undefined;
}

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow references a reader cannot follow from the repo: ticket IDs, and pointers into planning documents, PRs, or line numbers.',
      url: 'https://github.com/CanopyTax/eslint-config-canopy/blob/master/docs/rules/no-external-ref-in-comment.md',
    },
    schema: [],
    messages: {
      ticket:
        'Comment references ticket "{{match}}". Put ticket links in the commit or PR, and state the reason here.',
      docPointer:
        'Comment points at "{{match}}", which a reader of this file cannot open. Inline the fact the comment depends on.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    return {
      Program() {
        for (const group of getCommentGroups(sourceCode)) {
          const text = getContentText(group);
          const ticket = findTicket(text);
          if (ticket) {
            context.report({ loc: group.loc, messageId: 'ticket', data: { match: ticket } });
            continue;
          }
          const pointer = findDocPointer(text);
          if (pointer) {
            context.report({ loc: group.loc, messageId: 'docPointer', data: { match: pointer } });
          }
        }
      },
    };
  },
};
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `node --test test/rules/no-external-ref-in-comment.test.js`
Expected: PASS.

- [ ] **Step 5: Write the docs**

Create `docs/rules/no-external-ref-in-comment.md` with the same section order as `docs/rules/comment-length.md`: title line `# Disallow external references in comments (no-external-ref-in-comment)`, then an intro, Rule Details, What is not reported, Examples of incorrect code, Examples of correct code, and When Not To Use It. Content:

- Intro: a comment should stand on its own for a reader who has only the repo. A ticket ID, a section of a planning document, or a PR number moves the explanation somewhere that reader cannot see.
- Rule Details: the two message IDs and exactly what each matches. Copy the lists from the spec's `no-external-ref-in-comment` section: the ticket regex and denylist; `§`, `.md` other than README/CHANGELOG/CONTRIBUTING, `PR #N`/`PR N`, `Phase N`, and `name.ts:N`. State that the rule checks tagged JSDoc, URLs, and directive reasons. State that there is no TODO exemption and no URL exemption, and that Jira links are caught through the ID in the URL.
- What is not reported: the denylisted prefixes, upstream issue URLs without an ALLCAPS-NUMBER token, README/CHANGELOG/CONTRIBUTING, and lowercase `phase`.
- Incorrect examples: use the invalid cases from the test file. Correct examples: use the valid cases, plus a rewrite of `// TODO(BLU-697): handle archived rows` to `// TODO: archived rows are returned too; filter them before rendering`.
- When Not To Use It: a codebase that requires ticket IDs in comments by policy.
- Opt-out: `/* eslint-disable-next-line canopy/no-external-ref-in-comment */`, in block form (see the spec's Rollout section for why).

- [ ] **Step 6: Commit**

```bash
git add plugin/rules/no-external-ref-in-comment.js test/rules/no-external-ref-in-comment.test.js docs/rules/no-external-ref-in-comment.md
git commit -m "feat: add canopy/no-external-ref-in-comment"
```

---

### Task 4: `no-history-in-comment` and `no-hedge-in-comment`

**Files:**
- Create: `plugin/rules/no-history-in-comment.js`, `plugin/rules/no-hedge-in-comment.js`
- Create: `docs/rules/no-history-in-comment.md`, `docs/rules/no-hedge-in-comment.md`
- Test: `test/rules/no-history-in-comment.test.js`, `test/rules/no-hedge-in-comment.test.js`

**Interfaces:**
- Consumes: `getCommentGroups` (Task 1); `getContentText`, `phraseMatcher` (Task 2).
- Produces: two default-exported rules. Message IDs `history` and `hedge`, each with data `{ match }`. `match` is the lowercase phrase.

- [ ] **Step 1: Write the failing tests**

```js
// test/rules/no-history-in-comment.test.js
import { RuleTester } from 'eslint';
import rule from '../../plugin/rules/no-history-in-comment.js';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: 'module' } });

ruleTester.run('no-history-in-comment', rule, {
  valid: [
    // "no longer" almost always describes runtime state, so it is not in the list.
    { code: `// Reconcile: if selectedAccount is no longer in the accounts list, re-select` },
    // "used to" usually means "is used for".
    { code: `// Used to prevent double borders on right sticky columns` },
    { code: `// get the previously shared/sent information for a file` },
    { code: `// covers this bugfix path` },
    { code: `// @ts-ignore\nconst a = 1;` },
  ],
  invalid: [
    {
      code: `// CpLoader and CpTooltip used to come from canopy-styleguide!sofe`,
      errors: [{ messageId: 'history', data: { match: 'used to come' } }],
    },
    {
      code: `// The inbox-race scenario this PR fixes: an unrelated re-render must not clobber the id`,
      errors: [{ messageId: 'history', data: { match: 'this pr' } }],
    },
    {
      code: `// Regression: an earlier version invalidated every query`,
      errors: [{ messageId: 'history', data: { match: 'an earlier version' } }],
    },
    {
      code: `// Before the fix, two fields on different pages could be treated as one row.`,
      errors: [{ messageId: 'history', data: { match: 'before the fix' } }],
    },
    {
      code: `// Backend now correctly returns directory_user_id as id`,
      errors: [{ messageId: 'history', data: { match: 'now correctly' } }],
    },
    {
      code: `// the Cp* imports moved after the rename, so name the mock explicitly`,
      errors: [{ messageId: 'history', data: { match: 'after the rename' } }],
    },
    {
      code: `/* catch here, otherwise the stream silently swallows the error */`,
      errors: [{ messageId: 'history', data: { match: 'silently swallows' } }],
    },
  ],
});
```

```js
// test/rules/no-hedge-in-comment.test.js
import { RuleTester } from 'eslint';
import rule from '../../plugin/rules/no-hedge-in-comment.js';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: 'module' } });

ruleTester.run('no-hedge-in-comment', rule, {
  valid: [
    { code: `// should workers restart, the queue drains first` },
    { code: `// Think of the reducer's input as the raw feed` },
    { code: `// The retry must work offline; the cache is read first` },
  ],
  invalid: [
    {
      code: `// Not sure why, but the svg has a title of "filled circle" we can check`,
      errors: [{ messageId: 'hedge', data: { match: 'not sure why' } }],
    },
    {
      code: `//just a default that is hopefully close to what it really comes out to`,
      errors: [{ messageId: 'hedge', data: { match: 'hopefully' } }],
    },
    {
      code: `// I think red must be passing in a bulkTaskJql prop`,
      errors: [{ messageId: 'hedge', data: { match: 'i think' } }],
    },
    {
      code: `/* For some reason storybook has an issue with parsing the title */`,
      errors: [{ messageId: 'hedge', data: { match: 'for some reason' } }],
    },
    // Known false positive from fleet calibration: a defensive branch. Reported
    // on purpose; the fix is to state the condition plainly.
    {
      code: `// For when for some reason there is no section header on the page`,
      errors: [{ messageId: 'hedge', data: { match: 'for some reason' } }],
    },
  ],
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test test/rules/no-history-in-comment.test.js test/rules/no-hedge-in-comment.test.js`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement `no-history-in-comment`**

```js
// plugin/rules/no-history-in-comment.js
import { getCommentGroups } from '../utils/comment-groups.js';
import { getContentText, phraseMatcher } from '../utils/comment-text.js';

// Phrases were checked against fleet comments before inclusion. "no longer",
// "used to", and "previously" are left out: in this codebase they mostly
// describe runtime state or purpose, not history.
const HISTORY_PHRASES = [
  'was missing', 'used to be', 'previously was', 'previously did', 'previously had',
  'before this fix', 'before this change', 'before this commit', 'before this pr',
  'never actually', 'have never', 'root-caused', 'root caused', 'this fix', 'this bug',
  'the bug was', 'was broken', 'now correctly', 'silently no-ops', 'silently noops',
  'silently fails', 'silently skips', 'silently swallows',
  'used to come', 'we used to', 'after the rename', 'before the fix', 'after the fix',
  'this pr', 'this pull request', 'an earlier version', 'previous implementation', 'the old code',
];

const findHistory = phraseMatcher(HISTORY_PHRASES);

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow comments that narrate how the code changed instead of how it works.',
      url: 'https://github.com/CanopyTax/eslint-config-canopy/blob/master/docs/rules/no-history-in-comment.md',
    },
    schema: [],
    messages: {
      history:
        'Comment narrates history ("{{match}}"). Describe how the code works now; git records how it changed.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    return {
      Program() {
        for (const group of getCommentGroups(sourceCode)) {
          const match = findHistory(getContentText(group));
          if (match) context.report({ loc: group.loc, messageId: 'history', data: { match } });
        }
      },
    };
  },
};
```

- [ ] **Step 4: Implement `no-hedge-in-comment`**

```js
// plugin/rules/no-hedge-in-comment.js
import { getCommentGroups } from '../utils/comment-groups.js';
import { getContentText, phraseMatcher } from '../utils/comment-text.js';

const HEDGE_PHRASES = [
  'should work', 'hopefully', 'probably fine', 'probably works', 'probably safe',
  'not sure why', 'not sure if', 'not sure this', 'i think', 'i believe',
  'as far as i can tell', 'afaik', 'seems to work', 'should be fine', 'should fix',
  'not 100% sure', 'not entirely sure', 'might not work', 'for some reason',
  'no idea why', 'in theory', 'should be ok',
];

const findHedge = phraseMatcher(HEDGE_PHRASES);

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow comments that hedge instead of stating a fact about the code.',
      url: 'https://github.com/CanopyTax/eslint-config-canopy/blob/master/docs/rules/no-hedge-in-comment.md',
    },
    schema: [],
    messages: {
      hedge: 'Comment hedges ("{{match}}"). Find out and state it, or remove the comment.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    return {
      Program() {
        for (const group of getCommentGroups(sourceCode)) {
          const match = findHedge(getContentText(group));
          if (match) context.report({ loc: group.loc, messageId: 'hedge', data: { match } });
        }
      },
    };
  },
};
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `node --test test/rules/no-history-in-comment.test.js test/rules/no-hedge-in-comment.test.js`
Expected: PASS.

- [ ] **Step 6: Write the docs**

Two files in the `comment-length.md` format. For each: an intro (why the pattern hurts a later reader); Rule Details (whole-phrase, case-insensitive matching over all comment prose, including directive reasons; the full phrase list copied from the rule file); incorrect and correct examples taken from the tests, with one rewrite shown per rule; When Not To Use It; and the block-form opt-out.

- `no-history-in-comment.md` must say why `no longer`, `used to`, and `previously` are not listed, and include the "no longer in the accounts list" example.
- `no-hedge-in-comment.md` must document the `for some reason` defensive-branch false positive and its rewrite, e.g. `// The page may have no section header; fall back to the form's first field`.

- [ ] **Step 7: Commit**

```bash
git add plugin/rules/no-history-in-comment.js plugin/rules/no-hedge-in-comment.js test/rules/no-history-in-comment.test.js test/rules/no-hedge-in-comment.test.js docs/rules/no-history-in-comment.md docs/rules/no-hedge-in-comment.md
git commit -m "feat: add canopy/no-history-in-comment and canopy/no-hedge-in-comment"
```

---

### Task 5: `no-banner-comment`

**Files:**
- Create: `plugin/rules/no-banner-comment.js`
- Create: `docs/rules/no-banner-comment.md`
- Test: `test/rules/no-banner-comment.test.js`

**Interfaces:**
- Consumes: `getCommentGroups` (Task 1).
- Produces: default-exported rule; message ID `banner`, no data.

- [ ] **Step 1: Write the failing test**

```js
// test/rules/no-banner-comment.test.js
import { RuleTester } from 'eslint';
import rule from '../../plugin/rules/no-banner-comment.js';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: 'module' } });

ruleTester.run('no-banner-comment', rule, {
  valid: [
    { code: `/** Fetches the widget. */` },
    { code: `/**\n * Fetches the widget.\n * @param {string} id\n */\nfunction f(id) {}` },
    // A long JSDoc opener or closer on its own line is not a banner.
    { code: `/****************\n * Fetches the widget.\n ****************/` },
    { code: `/**\n * | name | type |\n * |------|------|\n * | id   | text |\n */` },
    { code: `// | a | b |\n// | :---: | ---- |` },
    { code: `// --- short divider` },
    { code: `// a -> b -> c` },
    { code: `//` },
    { code: `/**/` },
    { code: `#!/usr/bin/env node\nconst a = 1;` },
  ],
  invalid: [
    { code: `// ─── Fixtures ─────────────────────────────`, errors: [{ messageId: 'banner' }] },
    { code: `// =============== Exported Types Starts ===============`, errors: [{ messageId: 'banner' }] },
    { code: `// ##### Section`, errors: [{ messageId: 'banner' }] },
    { code: `// ~~~~~`, errors: [{ messageId: 'banner' }] },
    { code: `/* ***** */`, errors: [{ messageId: 'banner' }] },
    { code: `/****** Title ******/`, errors: [{ messageId: 'banner' }] },
    { code: `/*\n * ==========\n * Helpers\n */`, errors: [{ messageId: 'banner' }] },
    // One report per run.
    { code: `// ----------\n// Helpers\n// ----------`, errors: [{ messageId: 'banner', line: 1, endLine: 3 }] },
  ],
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test test/rules/no-banner-comment.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```js
// plugin/rules/no-banner-comment.js
import { getCommentGroups } from '../utils/comment-groups.js';

const BANNER_RE = /([=*#~\-─━])\1{4,}/;
// A run of `*` that opens a block and ends its line, or that sits alone on the
// block's last line, is block syntax, not decoration.
const OPENER_RE = /^\*+(?=[ \t]*\r?\n)/;
const CLOSER_RE = /(?<=\n[ \t]*)\*+$/;
const TABLE_SEPARATOR_RE = /\|(?:\s*:?-+:?\s*\|)+/g;

function decorationText(comment) {
  let text = comment.value;
  if (comment.type === 'Block') text = text.replace(OPENER_RE, '').replace(CLOSER_RE, '');
  return text.replace(TABLE_SEPARATOR_RE, '|');
}

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow decorative banner comments made of repeated characters.',
      url: 'https://github.com/CanopyTax/eslint-config-canopy/blob/master/docs/rules/no-banner-comment.md',
    },
    schema: [],
    messages: {
      banner: 'Decorative banner comment. Remove it; use file structure and naming to separate sections.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    return {
      Program() {
        for (const group of getCommentGroups(sourceCode)) {
          if (group.comments.some((comment) => BANNER_RE.test(decorationText(comment)))) {
            context.report({ loc: group.loc, messageId: 'banner' });
          }
        }
      },
    };
  },
};
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `node --test test/rules/no-banner-comment.test.js`
Expected: PASS. If the `// | a | b |` valid case fails, check that `TABLE_SEPARATOR_RE` matches `| :---: | ---- |`. Fix the regex, not the test.

- [ ] **Step 5: Write the docs**

`docs/rules/no-banner-comment.md` in the `comment-length.md` format. Cover: the character set and the five-character threshold; the JSDoc opener/closer and Markdown-table exemptions; one report per comment or run; incorrect and correct examples from the test; and a correct rewrite that replaces a `// ─── Fixtures ───` divider with a `describe` block or a separate fixtures module.

- [ ] **Step 6: Commit**

```bash
git add plugin/rules/no-banner-comment.js test/rules/no-banner-comment.test.js docs/rules/no-banner-comment.md
git commit -m "feat: add canopy/no-banner-comment"
```

---

### Task 6: `no-obvious-comment`

**Files:**
- Create: `plugin/rules/no-obvious-comment.js`
- Create: `docs/rules/no-obvious-comment.md`
- Test: `test/rules/no-obvious-comment.test.js`

**Interfaces:**
- Consumes: `getCommentGroups` (Task 1), `getContentText` (Task 2).
- Produces: default-exported rule; message ID `obvious`, no data.

- [ ] **Step 1: Write the failing test**

```js
// test/rules/no-obvious-comment.test.js
import { RuleTester } from 'eslint';
import rule from '../../plugin/rules/no-obvious-comment.js';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: 'module' } });

ruleTester.run('no-obvious-comment', rule, {
  valid: [
    // A reason marker vetoes the report.
    { code: `// increment the counter so that retries back off\ncounter += 1;` },
    { code: `// increment the counter because the server is 1-indexed\ncounter += 1;` },
    // No stock verb.
    { code: `// the counter\ncounter += 1;` },
    // No identifier echoed from the code.
    { code: `// increment it\ncount++;` },
    // Not attached: blank line between comment and code.
    { code: `// increment the counter\n\ncounter += 1;` },
    // Last line of the file.
    { code: `counter += 1;\n// increment the counter` },
    // Multi-line run.
    { code: `// increment the counter\n// before the next page\ncounter += 1;` },
    // Trailing comment.
    { code: `counter += 1; // increment the counter` },
    // Documented code spans more than two lines.
    { code: `// loop over the items\nfor (const item of items) {\n  use(item);\n}` },
    // Too many words.
    { code: `// set the user name on the user record that the name form edits for the user\nsetUserName(name);` },
    { code: `/* increment the counter */\ncounter += 1;` },
    { code: `// @ts-expect-error\ncounter++;` },
    { code: `//\ncounter += 1;` },
    { code: `#!/usr/bin/env node\ncounter += 1;` },
  ],
  invalid: [
    { code: `// increment the counter\ncounter += 1;`, errors: [{ messageId: 'obvious' }] },
    { code: `// set the user name\nsetUserName(name);`, errors: [{ messageId: 'obvious' }] },
    { code: `function f(items) {\n  // return the items\n  return items;\n}`, errors: [{ messageId: 'obvious', line: 2 }] },
    { code: `// initialize state\nconst state = {};`, errors: [{ messageId: 'obvious' }] },
    { code: `// remove listeners\nremoveListener(handler);`, errors: [{ messageId: 'obvious' }] },
  ],
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test test/rules/no-obvious-comment.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```js
// plugin/rules/no-obvious-comment.js
import { getCommentGroups } from '../utils/comment-groups.js';
import { getContentText } from '../utils/comment-text.js';

// Word lists and thresholds are windbag's OBVIOUS_COMMENT defaults, plus
// "because" as a reason marker.
const MAX_WORDS = 12;
const MIN_MATCH_RATIO = 0.85;
const STOCK_VERBS = new Set([
  'increment', 'increments', 'decrement', 'decrements', 'initialize', 'initializes', 'init',
  'declare', 'declares', 'define', 'defines', 'create', 'creates', 'creating', 'set', 'sets',
  'setting', 'assign', 'assigns', 'assigning', 'update', 'updates', 'updating', 'return',
  'returns', 'returning', 'call', 'calls', 'calling', 'invoke', 'invokes', 'check', 'checks',
  'checking', 'loop', 'loops', 'looping', 'iterate', 'iterates', 'iterating', 'import',
  'imports', 'importing', 'print', 'prints', 'printing', 'log', 'logs', 'logging', 'append',
  'appends', 'appending', 'add', 'adds', 'adding', 'remove', 'removes', 'removing', 'delete',
  'deletes',
]);
const STOPWORDS = new Set([
  'the', 'a', 'an', 'to', 'of', 'for', 'this', 'that', 'on', 'by', 'in', 'and', 'it', 'its',
  'with', 'from', 'as', 'is', 'are', 'our', 'we',
]);
const REASON_MARKERS = ['so that', 'in order to', 'to avoid', 'to prevent', 'note:', 'warning:', 'important:', 'because'];

function identifierWords(code) {
  const words = new Set();
  for (const id of code.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []) {
    for (const part of id.split('_').flatMap((p) => p.split(/(?<=[a-z])(?=[A-Z])/))) {
      if (part.length > 1) words.add(part.toLowerCase());
    }
  }
  return words;
}

function isObvious(commentText, codeText) {
  const lower = commentText.toLowerCase();
  if (REASON_MARKERS.some((marker) => lower.includes(marker))) return false;

  const words = lower.split(/[^\p{L}\p{N}_]+/u).filter(Boolean);
  if (words.length === 0 || words.length > MAX_WORDS) return false;

  const codeWords = identifierWords(codeText);
  const echoes = (w) => codeWords.has(w) || (w.endsWith('s') && codeWords.has(w.slice(0, -1)));

  let hasVerb = false;
  let hasEcho = false;
  let significant = 0;
  for (const word of words) {
    if (STOCK_VERBS.has(word)) {
      hasVerb = true;
      significant++;
    } else if (STOPWORDS.has(word)) {
      significant++;
    } else if (echoes(word)) {
      hasEcho = true;
      significant++;
    }
  }
  return hasVerb && hasEcho && significant / words.length >= MIN_MATCH_RATIO;
}

// The outermost node that starts at the first token on the line after the comment.
function attachedNode(sourceCode, comment) {
  const token = sourceCode.getTokenAfter(comment, { includeComments: false });
  if (!token || token.loc.start.line !== comment.loc.end.line + 1) return null;
  let node = sourceCode.getNodeByRangeIndex(token.range[0]);
  while (node?.parent && node.parent.type !== 'Program' && node.parent.range[0] === node.range[0]) {
    node = node.parent;
  }
  return node && node.type !== 'Program' ? node : null;
}

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow a short comment that only restates the line of code below it.',
      url: 'https://github.com/CanopyTax/eslint-config-canopy/blob/master/docs/rules/no-obvious-comment.md',
    },
    schema: [],
    messages: {
      obvious: 'Comment restates the code below it. Remove it, or say why the code does this.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    return {
      Program() {
        for (const group of getCommentGroups(sourceCode)) {
          if (group.kind !== 'run' || group.comments.length !== 1) continue;
          const [comment] = group.comments;
          if (comment.type !== 'Line') continue;
          const text = getContentText(group);
          if (!text) continue;
          const node = attachedNode(sourceCode, comment);
          if (!node || node.loc.end.line - node.loc.start.line + 1 > 2) continue;
          if (isObvious(text, sourceCode.getText(node))) {
            context.report({ loc: comment.loc, messageId: 'obvious' });
          }
        }
      },
    };
  },
};
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `node --test test/rules/no-obvious-comment.test.js`
Expected: PASS. For the `return items` case, check that `attachedNode` returns the `ReturnStatement`: `items` starts later, so the walk from the `return` keyword's node should stop at the statement.

- [ ] **Step 5: Write the docs**

`docs/rules/no-obvious-comment.md` in the `comment-length.md` format. Cover: all six conditions from the spec, the word lists, the reason-marker veto, and why the rule is `warn` (it is a heuristic; findings are advisory and not part of the fleet rollout). Include incorrect and correct examples from the test.

- [ ] **Step 6: Commit**

```bash
git add plugin/rules/no-obvious-comment.js test/rules/no-obvious-comment.test.js docs/rules/no-obvious-comment.md
git commit -m "feat: add canopy/no-obvious-comment"
```

---

### Task 7: Register the rules, enable them in the config, bump to 5.5.0

**Files:**
- Modify: `plugin/index.js` (imports and `rules` map)
- Modify: `eslint.config.js:111` (next to `'canopy/comment-length': 'error'`)
- Modify: `README.md` (rules table, after the `comment-length` row at line 85)
- Modify: `package.json` (`version`)
- Test: `test/config/comment-rules.test.js`

**Interfaces:**
- Consumes: the five rules from Tasks 3–6.
- Produces: rule IDs `canopy/no-external-ref-in-comment`, `canopy/no-history-in-comment`, `canopy/no-hedge-in-comment`, `canopy/no-banner-comment`, `canopy/no-obvious-comment` in the shared config.

- [ ] **Step 1: Write the failing config test**

```js
// test/config/comment-rules.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from 'eslint';
import config from '../../eslint.config.js';

const linter = new Linter();
const canopyMessages = (code, filename = 'example.js') =>
  linter.verify(code, config, filename).filter((m) => m.ruleId?.startsWith('canopy/'));

test('content rules are errors, no-obvious-comment is a warning, comment-length is unchanged', () => {
  const { rules } = config.find((c) => c.plugins?.canopy);
  assert.equal(rules['canopy/no-external-ref-in-comment'], 'error');
  assert.equal(rules['canopy/no-history-in-comment'], 'error');
  assert.equal(rules['canopy/no-hedge-in-comment'], 'error');
  assert.equal(rules['canopy/no-banner-comment'], 'error');
  assert.equal(rules['canopy/no-obvious-comment'], 'warn');
  assert.equal(rules['canopy/comment-length'], 'error');
});

test('a block-form disable above the comment suppresses the finding', () => {
  const code = `/* eslint-disable-next-line canopy/no-hedge-in-comment */\n// hopefully this holds\nexport const a = 1;\n`;
  assert.deepEqual(canopyMessages(code), []);
});

test('a // disable directly above a // comment does not suppress it', () => {
  const code = `// eslint-disable-next-line canopy/no-hedge-in-comment\n// hopefully this holds\nexport const a = 1;\n`;
  const messages = canopyMessages(code);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].ruleId, 'canopy/no-hedge-in-comment');
  assert.equal(messages[0].line, 1);
});

test('a JSX comment in a .tsx file is checked', () => {
  const code = `export const A = () => <div>{/* hopefully renders */}</div>;\n`;
  const messages = canopyMessages(code, 'example.tsx');
  assert.deepEqual(messages.map((m) => m.ruleId), ['canopy/no-hedge-in-comment']);
});

test('an eslint directive reason is checked', () => {
  const code = `// eslint-disable-next-line no-console -- BLU-12 debug output\nconsole.log(1);\n`;
  assert.deepEqual(canopyMessages(code).map((m) => m.ruleId), ['canopy/no-external-ref-in-comment']);
});

test('a @ts- directive reason in a .ts file is checked', () => {
  const code = `// @ts-expect-error SAP-451 upstream typing\nexport const x: number = 'a';\n`;
  const messages = canopyMessages(code, 'example.ts');
  assert.deepEqual(messages.map((m) => m.ruleId), ['canopy/no-external-ref-in-comment']);
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `node --test test/config/comment-rules.test.js`
Expected: FAIL. The severity assertion fails (`undefined !== 'error'`), and ESLint reports the rule definitions as not found.

- [ ] **Step 3: Register the rules**

In `plugin/index.js`, add imports after `import commentLength …`:

```js
import noExternalRefInComment from './rules/no-external-ref-in-comment.js';
import noHistoryInComment from './rules/no-history-in-comment.js';
import noHedgeInComment from './rules/no-hedge-in-comment.js';
import noBannerComment from './rules/no-banner-comment.js';
import noObviousComment from './rules/no-obvious-comment.js';
```

Add entries after `'comment-length': commentLength,`:

```js
    'no-external-ref-in-comment': noExternalRefInComment,
    'no-history-in-comment': noHistoryInComment,
    'no-hedge-in-comment': noHedgeInComment,
    'no-banner-comment': noBannerComment,
    'no-obvious-comment': noObviousComment,
```

- [ ] **Step 4: Enable them in `eslint.config.js`**

After `'canopy/comment-length': 'error',`:

```js
      'canopy/no-external-ref-in-comment': 'error',
      'canopy/no-history-in-comment': 'error',
      'canopy/no-hedge-in-comment': 'error',
      'canopy/no-banner-comment': 'error',
      'canopy/no-obvious-comment': 'warn',
```

- [ ] **Step 5: Run the config test and confirm it passes**

Run: `node --test test/config/comment-rules.test.js`
Expected: PASS, 6 tests. If the `//`-directive test reports 0 messages, the directive's line is being treated as covered. Stop and report to Miriam: the spec's Rollout directive rule depends on this behavior.

- [ ] **Step 6: Update the README and version**

In `README.md`, add one row per rule after the `comment-length` row, in the same style: a linked rule name and a one-to-three-sentence summary taken from the rule's docs intro. Mark `no-obvious-comment` as a warning-level heuristic. In `package.json`, set `"version": "5.5.0"`.

- [ ] **Step 7: Lint the repo with its own rules**

Run: `yarn lint`
Expected: 0 errors. For any finding in this repo's own source, fix the comment; do not add a disable. Test fixture strings are code, not comments, and are not reported. If a finding is in a comment that quotes a banned phrase to explain the rule (for example, a comment in `no-history-in-comment.js` naming "no longer"), reword it so it does not contain the phrase verbatim.

- [ ] **Step 8: Run the full suite**

Run: `yarn test`
Expected: PASS, every file.

- [ ] **Step 9: Commit**

```bash
git add plugin/index.js eslint.config.js README.md package.json test/config/comment-rules.test.js
git add -u
git commit -m "feat: enable comment content rules; release 5.5.0"
```

---

### Task 8: Pre-release precision check (read-only) and the `no-obvious-comment` gate

Read-only against other repos. It produces a decision, recorded in the spec.

**Files:**
- Modify: `docs/superpowers/specs/2026-09-23-comment-content-rules-design.md` (append `## Validation results`)
- Possibly delete: the `no-obvious-comment` files, registration, config entry, and README row (Step 5)

**Interfaces:**
- Consumes: the registered config from Task 7. `$ECC` is the worktree path. `$CAL` is a scratch directory outside any repo.

- [ ] **Step 1: Run the config over every local frontend checkout**

```bash
ECC="$(git rev-parse --show-toplevel)"
CAL="<scratch dir>"; mkdir -p "$CAL"
for dir in ~/code/canopy/*/; do
  name=$(basename "$dir")
  case "$name" in *-alt|eslint-config-canopy|.*) continue;; esac
  [ -d "$dir/src" ] && [ -d "$dir/.git" ] || continue
  (cd "$dir" && "$ECC/node_modules/.bin/eslint" -c "$ECC/eslint.config.js" --no-warn-ignored -f json -o "$CAL/$name.json" src) || true
done
```

Non-zero exits are expected: other rules report errors. Checkouts are stale, which is fine for precision. The rollout plan re-measures on `master`.

- [ ] **Step 2: Summarize the findings**

```js
// $CAL/summarize.mjs — run: node $CAL/summarize.mjs $CAL
import fs from 'node:fs';

const dir = process.argv[2];
const RULES = new Set([
  'canopy/no-external-ref-in-comment', 'canopy/no-history-in-comment', 'canopy/no-hedge-in-comment',
  'canopy/no-banner-comment', 'canopy/no-obvious-comment',
]);
const findings = [];
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'findings.json')) {
  let files;
  try { files = JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8')); } catch { continue; }
  for (const file of files) {
    const lines = fs.readFileSync(file.filePath, 'utf8').split('\n');
    for (const m of file.messages) {
      if (!RULES.has(m.ruleId)) continue;
      findings.push({
        repo: f.replace(/\.json$/, ''), file: file.filePath, line: m.line, rule: m.ruleId, message: m.message,
        source: lines.slice(m.line - 1, (m.endLine ?? m.line) + 1).join('\n'),
      });
    }
  }
}
fs.writeFileSync(`${dir}/findings.json`, JSON.stringify(findings, null, 1));
const counts = {};
for (const x of findings) counts[x.rule] = (counts[x.rule] ?? 0) + 1;
console.table(counts);
console.log('repos with findings:', new Set(findings.map((x) => x.repo)).size);
```

- [ ] **Step 3: Check precision of the error rules**

For each error rule, read 10 findings chosen at random from `findings.json`, or all of them if there are fewer than 10. Count the true positives. **Stop and report to Miriam** if any rule has fewer than 8 of 10. Include the samples, and do not edit phrase lists without her.

Compare counts to the spec's estimates (external refs ~210, banners ~290, hedges ~30, history ~15). If any count is more than double or less than half its estimate, note it in Step 6 and find out why. This is not a blocker.

- [ ] **Step 4: Run the `no-obvious-comment` gate**

Read 30 random `no-obvious-comment` findings, or all if there are fewer than 30. Classify each: **obvious** (it restates the code) or **fine** (it adds information not in the code). If 15 or more are **fine**, go to Step 5. Otherwise skip Step 5.

- [ ] **Step 5 (only if the gate failed): Drop `no-obvious-comment`**

Delete `plugin/rules/no-obvious-comment.js`, `test/rules/no-obvious-comment.test.js`, and `docs/rules/no-obvious-comment.md`. Remove its import and entry in `plugin/index.js`, its line in `eslint.config.js`, its README row, and its assertion in `test/config/comment-rules.test.js`. Run `yarn test` and `yarn lint` (both must pass), then:

```bash
git add -A plugin test docs/rules README.md eslint.config.js
git commit -m "revert: drop no-obvious-comment after fleet calibration"
```

- [ ] **Step 6: Record the results in the spec and commit**

Append to the spec:

```markdown
## Validation results

Run on <date> over <N> local checkouts (stale; rollout re-measures on master).

| Rule | Findings | Repos | Sample precision |
|---|---|---|---|
| no-external-ref-in-comment | … | … | x/10 |
| no-history-in-comment | … | … | x/10 |
| no-hedge-in-comment | … | … | x/10 |
| no-banner-comment | … | … | x/10 |
| no-obvious-comment | … | … | x/30 obvious — kept / dropped |

<one line per count that differs from the estimate by more than 2×, with the reason>
```

Fill every cell with measured values.

```bash
git add docs/superpowers/specs/2026-09-23-comment-content-rules-design.md
git commit -m "docs: record comment content rules fleet validation"
```

---

### Task 9: Open the PR

**Files:** none changed.

- [ ] **Step 1: Final checks**

Run: `yarn test && yarn lint`
Expected: both pass.

- [ ] **Step 2: Push and open the PR**

Delegate to a subagent using the `canopy-development:commit-push-pr` skill. PR title: `feat: comment content rules (5.5.0)`. The PR body (keep it short; see the `writing-for-readers` skill) must state:

- The rules and their severities, and that `comment-length` is unchanged.
- The validation table from the spec.
- That **merging publishes 5.5.0** through `publish.yml`, and that the new `error` rules reach any `^5.4.0` repo on its next lockfile refresh. The fleet rollout starts right after merge.

End the body with:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Do not merge. Report the PR URL to Miriam.
