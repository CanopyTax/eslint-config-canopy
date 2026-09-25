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

function restyleMessages(jsx) {
  const code = `import { CpButton, CpModalBody } from '@canopytax/understory';\nexport const el = ${jsx};\n`;
  const messages = new Linter().verify(code, config, 'component.jsx');
  const fatal = messages.filter((m) => m.fatal);
  assert.deepEqual(fatal, [], 'code should parse');
  return messages.filter((m) => m.ruleId === 'shadcn/no-restyle');
}

test('padding on CpButton is reported', () => {
  assert.equal(restyleMessages('<CpButton className="p-4" />').length, 1);
});

test('margin on CpButton is allowed', () => {
  assert.deepEqual(restyleMessages('<CpButton className="mt-4" />'), []);
});

test('gap on CpModalBody is allowed', () => {
  assert.deepEqual(restyleMessages('<CpModalBody className="gap-2" />'), []);
});

test('padding on CpModalBody is reported', () => {
  assert.equal(restyleMessages('<CpModalBody className="p-4" />').length, 1);
});
