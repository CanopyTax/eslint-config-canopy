import { RuleTester } from 'eslint';
import rule from '../../plugin/rules/comment-length.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

// A comment whose text is exactly at the limit (240) must pass; one character
// more must fail. These helpers keep the boundary explicit in each case.
const atLimit = 'a'.repeat(240);
const overLimit = 'a'.repeat(241);

ruleTester.run('comment-length', rule, {
  valid: [
    // Short comments of both syntaxes.
    { code: `// a short line comment` },
    { code: `/* a short block comment */` },
    { code: `const x = 1; // a short trailing comment` },
    // Exactly at the default limit is allowed — the rule fires only above it.
    { code: `//${atLimit}` },
    { code: `/*${atLimit}*/` },
    // Two standalone // lines that are each short and sum to under the limit.
    { code: `// first short line\n// second short line` },
    // A URL cannot be shortened, so a comment containing one is exempt even when
    // it runs long.
    { code: `// see https://example.com/${'path/'.repeat(60)} for details` },
    {
      code: `/* https://example.com/${'path/'.repeat(60)} */`,
    },
    // The limit is configurable upward.
    { code: `//${overLimit}`, options: [{ max: 300 }] },
    // A structured JSDoc block — one carrying an @tag — is genuine API
    // documentation and is exempt even when it runs long.
    {
      code: `/**\n * Does a thing.\n * @param {string} value ${'a'.repeat(250)}\n * @returns {void}\n */\nfunction f(value) {}`,
    },
    // The @tag may be the only long-comment content and still exempts the block.
    {
      code: `/** @deprecated ${'a'.repeat(250)} */`,
    },
  ],
  invalid: [
    // A single line comment one character over the limit.
    {
      code: `//${overLimit}`,
      errors: [{ messageId: 'tooLong', data: { length: 241, max: 240 } }],
    },
    // A single block comment over the limit.
    {
      code: `/*${overLimit}*/`,
      errors: [{ messageId: 'tooLong', data: { length: 241, max: 240 } }],
    },
    // Two standalone // lines, each under the limit, that together exceed it.
    // Reported once for the whole run: 130 + 1 (joining space) + 130 = 261.
    {
      code: `//${'a'.repeat(130)}\n//${'b'.repeat(130)}`,
      errors: [{ messageId: 'tooLong', data: { length: 261, max: 240 } }],
    },
    // A tagless /** */ block is inline prose in doc syntax, so it is still
    // measured — wrapping a long paragraph in /** */ must not defeat the rule.
    {
      code: `/**\n * ${'a'.repeat(250)}\n */\nfunction f() {}`,
      errors: [{ messageId: 'tooLong' }],
    },
    // A directive comment is not exempt either; the justification should be terse.
    {
      code: `// eslint-disable-next-line no-console -- ${'a'.repeat(250)}`,
      errors: [{ messageId: 'tooLong' }],
    },
    // The configured max is honored downward.
    {
      code: `// this comment is longer than ten characters`,
      options: [{ max: 10 }],
      errors: [{ messageId: 'tooLong', data: { length: 42, max: 10 } }],
    },
    // A trailing comment (code before it on the line) is measured on its own.
    {
      code: `const x = 1; //${overLimit}`,
      errors: [{ messageId: 'tooLong', data: { length: 241, max: 240 } }],
    },
  ],
});
