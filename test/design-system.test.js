import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from 'eslint';
import canopyDesignSystem from '../design-system.js';

const config = [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  ...canopyDesignSystem,
];

function lint(ruleId, expression) {
  const code = [
    `import { CpButton, CpModalBody } from '@canopytax/understory';`,
    `import { tw } from './classname-helpers';`,
    `export const el = ${expression};`,
  ].join('\n');
  const messages = new Linter().verify(code, config, 'component.jsx');
  const fatal = messages.filter((m) => m.fatal);
  assert.deepEqual(fatal, [], 'code should parse');
  return messages.filter((m) => m.ruleId === ruleId);
}

test('no-restyle: padding on CpButton is reported', () => {
  assert.equal(lint('shadcn/no-restyle', '<CpButton className="p-4" />').length, 1);
});

test('no-restyle: margin on CpButton is allowed', () => {
  assert.deepEqual(lint('shadcn/no-restyle', '<CpButton className="mt-4" />'), []);
});

test('no-restyle: gap on CpModalBody is allowed', () => {
  assert.deepEqual(lint('shadcn/no-restyle', '<CpModalBody className="gap-2" />'), []);
});

test('no-restyle: padding on CpModalBody is reported', () => {
  assert.equal(lint('shadcn/no-restyle', '<CpModalBody className="p-4" />').length, 1);
});

test('no-raw-colors: a default palette color is reported', () => {
  assert.equal(lint('shadcn/no-raw-colors', '<div className="bg-pink-500" />').length, 1);
});

test('no-raw-colors: a default palette color inside tw() is reported', () => {
  assert.equal(lint('shadcn/no-raw-colors', 'tw("bg-pink-500")').length, 1);
});

test('no-raw-colors: the Understory gray scale is allowed', () => {
  assert.deepEqual(lint('shadcn/no-raw-colors', '<div className="bg-gray-50" />'), []);
});

test('no-raw-colors: brand is not a Tailwind palette name, so it is not reported', () => {
  assert.deepEqual(lint('shadcn/no-raw-colors', '<div className="text-brand-500" />'), []);
});

test('no-arbitrary-values: an arbitrary padding is reported', () => {
  assert.equal(lint('shadcn/no-arbitrary-values', '<div className="p-[13px]" />').length, 1);
});

test('no-arbitrary-values: an arbitrary padding inside tw() is reported', () => {
  assert.equal(lint('shadcn/no-arbitrary-values', 'tw("p-[13px]")').length, 1);
});

test('no-arbitrary-values: text sizes, grid templates and --cp-color-* variables are allowed', () => {
  const classes = 'text-[13px] grid-cols-[1fr_2fr] bg-[var(--cp-color-app-border)]';
  assert.deepEqual(lint('shadcn/no-arbitrary-values', `<div className="${classes}" />`), []);
});
