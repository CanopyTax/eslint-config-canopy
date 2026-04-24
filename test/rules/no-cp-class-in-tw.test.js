import { RuleTester } from 'eslint';
import rule from '../../plugin/rules/no-cp-class-in-tw.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-cp-class-in-tw', rule, {
  valid: [
    { code: `tw("flex flex-col gap-4")` },
    { code: `always("cp-body", tw("flex"))` },
    { code: `always("cp-body flex")` },
    // CSS-var bracket notation should NOT trip — the char before `cp-` is `-`, which the regex excludes
    { code: `tw("bg-[var(--cp-color-app-border)]")` },
    { code: `tw("text-[var(--cp-color-app-secondary-text)] italic")` },
    // Substring-only matches should be ignored
    { code: `tw("font-cpx-regular")` },
    // Template literal with no cp- token
    { code: 'tw(`flex ${variant} gap-4`)' },
    // Different function name
    { code: `twx("cp-body flex")` },
    // cp-* inside maybe() outside tw() is fine
    { code: `maybe(x, "cp-body")` },
  ],
  invalid: [
    {
      code: `tw("cp-body flex")`,
      errors: [{ messageId: 'cpInTw', data: { token: 'cp-body' } }],
    },
    {
      code: `tw("flex cp-body")`,
      errors: [{ messageId: 'cpInTw', data: { token: 'cp-body' } }],
    },
    {
      code: `tw("cp-body-sm cp-wt-semibold")`,
      errors: [
        { messageId: 'cpInTw', data: { token: 'cp-body-sm' } },
        { messageId: 'cpInTw', data: { token: 'cp-wt-semibold' } },
      ],
    },
    {
      code: `tw("w-full italic cp-caption", maybe(x, "flex"))`,
      errors: [{ messageId: 'cpInTw', data: { token: 'cp-caption' } }],
    },
    // nested through maybe() inside tw()
    {
      code: `tw("flex", maybe(x, "cp-body"))`,
      errors: [{ messageId: 'cpInTw', data: { token: 'cp-body' } }],
    },
    // nested through ternary inside tw()
    {
      code: `tw("flex", cond ? "cp-body" : "cp-caption")`,
      errors: [
        { messageId: 'cpInTw', data: { token: 'cp-body' } },
        { messageId: 'cpInTw', data: { token: 'cp-caption' } },
      ],
    },
    // template literal
    {
      code: 'tw(`cp-body ${x}`)',
      errors: [{ messageId: 'cpInTw', data: { token: 'cp-body' } }],
    },
    // String concatenation inside tw()
    {
      code: `tw("cp-body " + extra)`,
      errors: [{ messageId: 'cpInTw', data: { token: 'cp-body' } }],
    },
    {
      code: `tw("flex " + "cp-body")`,
      errors: [{ messageId: 'cpInTw', data: { token: 'cp-body' } }],
    },
    // Tailwind variant-prefixed tokens
    {
      code: `tw("hover:cp-body")`,
      errors: [{ messageId: 'cpInTw', data: { token: 'cp-body' } }],
    },
    {
      code: `tw("md:cp-body flex")`,
      errors: [{ messageId: 'cpInTw', data: { token: 'cp-body' } }],
    },
    {
      code: `tw("!cp-caption")`,
      errors: [{ messageId: 'cpInTw', data: { token: 'cp-caption' } }],
    },
  ],
});
