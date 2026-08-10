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
    // The named Tailwind scale is themeable — the Canopy theme maps these to the
    // right sizes — so it is intentionally allowed.
    { code: `tw("text-sm");` },
    { code: `tw("text-xs");` },
    { code: `tw("text-base");` },
    { code: `tw("flex text-xs gap-2");` },
    { code: `always("text-base");` },
    { code: `tw("md:text-lg");` },
    { code: `tw("text-9xl");` },
    { code: `const C = () => <p className="text-sm">x</p>;` },
    { code: `const C = () => <p className={tw("text-sm")}>x</p>;` },
    // `text-*` is overloaded: colours, alignment and decoration all share the prefix.
    { code: `tw("text-red-500");` },
    { code: `tw("text-white");` },
    { code: `tw("text-[var(--cp-color-app-text)]");` },
    { code: `tw("text-left text-center text-right");` },
    { code: `tw("text-ellipsis text-nowrap");` },
    // An arbitrary value that is not a bare length is not a hardcoded size.
    { code: `tw("text-[color:red]");` },
    { code: `tw("text-[length:var(--x)]");` },
    // The Canopy typography scale
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
    // Arbitrary lengths bypass the theme entirely — the real target of this rule.
    {
      code: `tw("text-[13px]");`,
      errors: [{ messageId: 'arbitraryFontSize', data: { token: 'text-[13px]' } }],
    },
    {
      code: `tw("text-[1.25rem]");`,
      errors: [{ messageId: 'arbitraryFontSize', data: { token: 'text-[1.25rem]' } }],
    },
    // Tailwind's `length:` type hint still pins a literal size.
    {
      code: `tw("text-[length:13px]");`,
      errors: [{ messageId: 'arbitraryFontSize', data: { token: 'text-[length:13px]' } }],
    },
    {
      code: `tw("text-[length:1.5rem]");`,
      errors: [{ messageId: 'arbitraryFontSize', data: { token: 'text-[length:1.5rem]' } }],
    },
    {
      code: `tw("flex text-[12px] gap-2");`,
      errors: [{ messageId: 'arbitraryFontSize', data: { token: 'text-[12px]' } }],
    },
    {
      code: `tw("md:text-[13px]");`,
      errors: [{ messageId: 'arbitraryFontSize', data: { token: 'text-[13px]' } }],
    },
    {
      code: `const C = () => <p className="text-[13px]">x</p>;`,
      errors: [{ messageId: 'arbitraryFontSize', data: { token: 'text-[13px]' } }],
    },
    // Reported exactly once, not once per visitor.
    {
      code: `const C = () => <p className={tw("text-[var(--cp-color-app-text)] text-[12px]")}>x</p>;`,
      errors: [{ messageId: 'arbitraryFontSize', data: { token: 'text-[12px]' } }],
    },
    // Nested non-container helpers inside tw() are still walked, once.
    {
      code: `tw("flex", maybe(open, "text-[13px]"));`,
      errors: [{ messageId: 'arbitraryFontSize', data: { token: 'text-[13px]' } }],
    },
    // A literal fontSize in a style prop cannot be themed at all.
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
