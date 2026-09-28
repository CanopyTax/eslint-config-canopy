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
    `import { CpButton, CpCard, CpWell, CpModal, CpModalBody, CpModalFooter, CpOverlayBody } from '@canopytax/understory';`,
    `import { Button } from './button';`,
    `import { tw, maybe } from './classname-helpers';`,
    `const isActive = true;`,
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

test('no-restyle: padding and gap on CpCard are allowed', () => {
  assert.deepEqual(lint('shadcn/no-restyle', '<CpCard className="p-4 gap-2" />'), []);
});

test('no-restyle: padding and gap on CpWell are allowed', () => {
  assert.deepEqual(lint('shadcn/no-restyle', '<CpWell className="p-4 gap-2" />'), []);
});

test('no-restyle: a color class on CpWell is reported', () => {
  assert.equal(lint('shadcn/no-restyle', '<CpWell className="bg-gray-100" />').length, 1);
});

test('no-restyle: gap on CpModalFooter is allowed', () => {
  assert.deepEqual(lint('shadcn/no-restyle', '<CpModalFooter className="gap-2" />'), []);
});

test('no-restyle: gap on CpOverlayBody is allowed', () => {
  assert.deepEqual(lint('shadcn/no-restyle', '<CpOverlayBody className="gap-2" />'), []);
});

test('no-restyle: padding on CpOverlayBody is reported', () => {
  assert.equal(lint('shadcn/no-restyle', '<CpOverlayBody className="p-4" />').length, 1);
});

test('no-restyle: a variant gap on CpModalBody is allowed', () => {
  assert.deepEqual(lint('shadcn/no-restyle', '<CpModalBody className="desktop:gap-2" />'), []);
});

test('no-restyle: gap on CpModal.Body is allowed', () => {
  assert.deepEqual(lint('shadcn/no-restyle', '<CpModal.Body className="gap-2" />'), []);
});

test('no-restyle: padding on CpModal.Body is reported', () => {
  assert.equal(lint('shadcn/no-restyle', '<CpModal.Body className="p-4" />').length, 1);
});

test('no-restyle: a component not imported from Understory is not checked', () => {
  assert.deepEqual(lint('shadcn/no-restyle', '<Button className="p-4" />'), []);
});

test('no-restyle: cp-* and cps-* classes on CpButton are allowed', () => {
  assert.deepEqual(lint('shadcn/no-restyle', '<CpButton className="cp-mt-8 cps-margin-top-8" />'), []);
});

test('no-restyle: an allowed gray color on CpButton is still reported', () => {
  assert.equal(lint('shadcn/no-restyle', '<CpButton className="bg-gray-100" />').length, 1);
});

test('no-restyle: padding inside tw() on CpButton is reported', () => {
  assert.equal(lint('shadcn/no-restyle', '<CpButton className={tw("p-4")} />').length, 1);
});

test('no-raw-colors: a default palette color is reported', () => {
  assert.equal(lint('shadcn/no-raw-colors', '<div className="bg-pink-500" />').length, 1);
});

test('no-raw-colors: a default palette color inside tw() is reported', () => {
  assert.equal(lint('shadcn/no-raw-colors', 'tw("bg-pink-500")').length, 1);
});

test('no-raw-colors: a default palette color inside maybe() is reported', () => {
  assert.equal(lint('shadcn/no-raw-colors', 'maybe(isActive, "bg-pink-500")').length, 1);
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
  const classes = 'text-[13px] grid-cols-[1fr_2fr] grid-rows-[auto_1fr] bg-[var(--cp-color-app-border)]';
  assert.deepEqual(lint('shadcn/no-arbitrary-values', `<div className="${classes}" />`), []);
});
