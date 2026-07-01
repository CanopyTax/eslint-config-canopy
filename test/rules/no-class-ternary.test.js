import { RuleTester } from 'eslint';
import rule from '../../plugin/rules/no-class-ternary.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-class-ternary', rule, {
  valid: [
    // Already using toggle
    { code: `toggle(cond, "a", "b")` },
    { code: `tw(toggle(cond, "a", "b"))` },
    // Empty branch is caught in no-conditional-class rule
    { code: `tw(cond ? "a" : "")` },
    { code: `tw(cond ? "" : "b")` },
    { code: `tw("flex", maybe(x, "a"))` },
    // Ternary outside classname helpers
    { code: `const c = cond ? "a" : "b"` },
    { code: `foo(cond ? "a" : "b")` },
    // className attribute (JSX)
    { code: `const el = <div className={toggle(cond, "a", "b")} />` },
    { code: `const el = <div className="static" />` },
    { code: `const el = <div className={dynamicClass} />` },
  ],
  invalid: [
    {
      code: `tw(isDragOver ? "border-2" : "border")`,
      output: `tw(toggle(isDragOver, "border-2", "border"))`,
      errors: [{ messageId: 'useToggle' }],
    },
    {
      code: `tw("base", open ? "max-h-[400px]" : "shrink-0")`,
      output: `tw("base", toggle(open, "max-h-[400px]", "shrink-0"))`,
      errors: [{ messageId: 'useToggle' }],
    },
    {
      code: `always(cond ? "a" : "b")`,
      output: `always(toggle(cond, "a", "b"))`,
      errors: [{ messageId: 'useToggle' }],
    },
    {
      code: `tw(["base", cond ? "a" : "b"])`,
      output: `tw(["base", toggle(cond, "a", "b")])`,
      errors: [{ messageId: 'useToggle' }],
    },
    {
      // bare className attribute ternary (no helper wrapper)
      code: `const el = <div className={cond ? "a" : "b"} />`,
      output: `const el = <div className={toggle(cond, "a", "b")} />`,
      errors: [{ messageId: 'useToggle' }],
    },
    {
      // ternary inside tw() inside className -> reported once (no double)
      code: `const el = <div className={tw(cond ? "a" : "b")} />`,
      output: `const el = <div className={tw(toggle(cond, "a", "b"))} />`,
      errors: [{ messageId: 'useToggle' }],
    },
  ],
});
