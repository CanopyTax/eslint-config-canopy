import { RuleTester } from 'eslint';
import rule from '../../plugin/rules/no-external-ref-in-comment.js';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
});

ruleTester.run('no-external-ref-in-comment', rule, {
  valid: [
    { code: `// but Monday 11 PM in US/Pacific (UTC-8)` },
    { code: `// decoded as UTF-8 before hashing` },
    { code: `// the fixture timestamp is 09:00 GMT-0700` },
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
    // A .md path inside a URL is a link the reader can follow.
    { code: `// https://github.com/org/repo/blob/main/docs/setup.md` },
    { code: `// see ftp://example.com/pub/notes.md` },
    // A long path-like token with no .md must not backtrack quadratically.
    { code: `// ${'a/'.repeat(50000)}` },
  ],
  invalid: [
    {
      code: `// see docs/setup.md`,
      errors: [{ messageId: 'docPointer', data: { match: 'docs/setup.md' } }],
    },
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
