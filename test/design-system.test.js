import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from 'eslint';
import canopyDesignSystem from '../design-system.js';
import canopyConfig from '../eslint.config.js';

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

test('placeholder-format: a trailing ellipsis on a native input is reported', () => {
  const [message] = lint('canopy/placeholder-format', '<input placeholder="Search..." />');
  assert.equal(message.messageId, 'trailingEllipsis');
  assert.equal(message.severity, 1);
});

test('placeholder-format: a trailing unicode ellipsis on a textarea is reported', () => {
  assert.equal(lint('canopy/placeholder-format', '<textarea placeholder="Add a note…" />').length, 1);
});

test('placeholder-format: Understory fields, Field variants and subcomponents are checked', () => {
  for (const tag of ['CpInput', 'CpInputField', 'CpTextarea', 'CpTextareaField', 'CpInput.Email', 'CpInputField.PhoneNumber']) {
    assert.equal(lint('canopy/placeholder-format', `<${tag} placeholder="Search..." />`).length, 1, tag);
  }
});

test('placeholder-format: a placeholder in an expression container is checked', () => {
  assert.equal(lint('canopy/placeholder-format', '<CpInput placeholder={"Search..."} />').length, 1);
  assert.equal(lint('canopy/placeholder-format', '<CpInput placeholder={`Search...`} />').length, 1);
});

test('placeholder-format: title case is reported', () => {
  const [message] = lint('canopy/placeholder-format', '<CpInput placeholder="Describe A Task" />');
  assert.equal(message.messageId, 'notSentenceCase');
  assert.match(message.message, /"Describe a task"/);
});

test('placeholder-format: a lowercase first word is reported', () => {
  const [message] = lint('canopy/placeholder-format', '<CpInput placeholder="describe a task" />');
  assert.match(message.message, /"Describe a task"/);
});

test('placeholder-format: an ellipsis and title case are reported separately', () => {
  const ids = lint('canopy/placeholder-format', '<CpInput placeholder="Search Clients..." />').map((m) => m.messageId);
  assert.deepEqual(ids.sort(), ['notSentenceCase', 'trailingEllipsis']);
});

test('placeholder-format: sentence case, acronyms, mixed-case names and example data are allowed', () => {
  const placeholders = ['Describe a task', 'Search by ID', 'Connect to QuickBooks', 'name@example.com', 'MM/DD/YYYY', '$0.00', 'Optional. Add a note', 'Search', 'Plan A', 'What I need'];
  for (const text of placeholders) {
    assert.deepEqual(lint('canopy/placeholder-format', `<CpInput placeholder="${text}" />`), [], text);
  }
});

test('placeholder-format: dynamic placeholders and other elements are not checked', () => {
  assert.deepEqual(lint('canopy/placeholder-format', '<CpInput placeholder={label} />'), []);
  assert.deepEqual(lint('canopy/placeholder-format', '<CpInput placeholder={`${label}...`} />'), []);
  assert.deepEqual(lint('canopy/placeholder-format', '<CpSelectSingle placeholder="Select One..." />'), []);
});

test('placeholder-format: allowWords exempts proper nouns', () => {
  const code = '<CpInput placeholder="Search Canopy" />;';
  const linterConfig = [config[0], ...canopyDesignSystem, { rules: { 'canopy/placeholder-format': ['warn', { allowWords: ['Canopy'] }] } }];
  assert.deepEqual(new Linter().verify(code, linterConfig, 'component.jsx'), []);
});

test('placeholder-format: the ellipsis fix removes it and keeps the quotes', () => {
  const { output } = new Linter().verifyAndFix(`<CpInput placeholder='Search...' />;`, config, 'component.jsx');
  assert.equal(output, `<CpInput placeholder='Search' />;`);
});

test('placeholder-format: an ellipsis-only placeholder is reported but not fixed', () => {
  const { output, messages } = new Linter().verifyAndFix('<CpInput placeholder="..." />;', config, 'component.jsx');
  assert.equal(output, '<CpInput placeholder="..." />;');
  assert.equal(messages.length, 1);
});

test('design-system combines with the base config without a plugin conflict', () => {
  const messages = new Linter().verify('<CpInput placeholder="Search..." />;', [...canopyConfig, ...canopyDesignSystem], 'component.jsx');
  assert.deepEqual(messages.filter((m) => m.fatal), []);
  assert.equal(messages.filter((m) => m.ruleId === 'canopy/placeholder-format').length, 1);
});
