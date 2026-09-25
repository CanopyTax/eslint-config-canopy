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

test('a // disable directly above a // comment suppresses it', () => {
  const code = `// eslint-disable-next-line canopy/no-hedge-in-comment\n// hopefully this holds\nexport const a = 1;\n`;
  assert.deepEqual(canopyMessages(code), []);
});

test('a // disable of comment-length directly above a long // run does not suppress it', () => {
  const long = 'x'.repeat(250);
  const code = `// eslint-disable-next-line canopy/comment-length\n// ${long}\nexport const a = 1;\n`;
  const messages = canopyMessages(code);
  assert.deepEqual(messages.map((m) => m.ruleId), ['canopy/comment-length']);
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
