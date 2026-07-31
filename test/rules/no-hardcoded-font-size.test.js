import { RuleTester } from 'eslint';
import rule from '../../plugin/rules/no-hardcoded-font-size.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-hardcoded-font-size', rule, {
  valid: [
    // `text-*` is overloaded: colours, alignment and decoration all share the prefix.
    { code: `tw("text-red-500");` },
    { code: `tw("text-white");` },
    { code: `tw("text-[var(--cp-color-app-text)]");` },
    { code: `tw("text-left text-center text-right");` },
    { code: `tw("text-ellipsis text-nowrap");` },
    { code: `const C = () => <p className="text-red-500">x</p>;` },
    // The Canopy typography scale is the correct way to size text.
    { code: `always("cp-body");` },
    { code: `always("cp-body-sm cp-wt-semibold");` },
    { code: `const C = () => <p className="cp-body">x</p>;` },
    // CSS-wide keywords defer to context rather than hardcoding a size.
    { code: `const C = () => <p style={{ fontSize: "inherit" }}>x</p>;` },
    { code: `const C = () => <p style={{ fontSize: "initial" }}>x</p>;` },
    { code: `const C = () => <p style={{ fontSize: "unset" }}>x</p>;` },
    // Computed values cannot be resolved, so they are left alone.
    { code: `const C = () => <p style={{ fontSize: size }}>x</p>;` },
    { code: `const C = () => <p style={{ fontSize: theme.typography.size.s2 }}>x</p>;` },
    { code: `const C = () => <p style={{ fontSize: \`\${base}px\` }}>x</p>;` },
    // Other style properties are not this rule's business.
    { code: `const C = () => <p style={{ marginTop: "13px" }}>x</p>;` },
  ],
  invalid: [
    // Tailwind size scale
    {
      code: `tw("text-sm");`,
      errors: [{ messageId: 'tailwindFontSize', data: { token: 'text-sm' } }],
    },
    {
      code: `tw("flex text-xs gap-2");`,
      errors: [{ messageId: 'tailwindFontSize', data: { token: 'text-xs' } }],
    },
    {
      code: `always("text-base");`,
      errors: [{ messageId: 'tailwindFontSize', data: { token: 'text-base' } }],
    },
    // Variant-prefixed tokens still resolve to a size
    {
      code: `tw("md:text-lg");`,
      errors: [{ messageId: 'tailwindFontSize', data: { token: 'text-lg' } }],
    },
    // className attribute
    {
      code: `const C = () => <p className="text-sm">x</p>;`,
      errors: [{ messageId: 'tailwindFontSize', data: { token: 'text-sm' } }],
    },
    // Arbitrary length values
    {
      code: `tw("text-[13px]");`,
      errors: [{ messageId: 'tailwindFontSize', data: { token: 'text-[13px]' } }],
    },
    // A tw() call inside className must be reported exactly once, not once per visitor.
    {
      code: `const C = () => <p className={tw("text-sm")}>x</p>;`,
      errors: [{ messageId: 'tailwindFontSize', data: { token: 'text-sm' } }],
    },
    {
      code: `const C = () => <p className={tw("text-[var(--cp-color-app-text)] text-[12px]")}>x</p>;`,
      errors: [{ messageId: 'tailwindFontSize', data: { token: 'text-[12px]' } }],
    },
    // Nested non-container helpers inside tw() are still walked, once.
    {
      code: `tw("flex", maybe(open, "text-sm"));`,
      errors: [{ messageId: 'tailwindFontSize', data: { token: 'text-sm' } }],
    },
    // Literal fontSize in a style prop
    {
      code: `const C = () => <p style={{ fontSize: "13px" }}>x</p>;`,
      errors: [{ messageId: 'inlineFontSize', data: { value: '13px' } }],
    },
    {
      code: `const C = () => <p style={{ fontSize: "1.25rem" }}>x</p>;`,
      errors: [{ messageId: 'inlineFontSize', data: { value: '1.25rem' } }],
    },
    {
      code: `const C = () => <p style={{ fontSize: 12 }}>x</p>;`,
      errors: [{ messageId: 'inlineFontSize', data: { value: '12' } }],
    },
    {
      code: `const C = () => <p style={{ fontSize: "85%" }}>x</p>;`,
      errors: [{ messageId: 'inlineFontSize', data: { value: '85%' } }],
    },
  ],
});
