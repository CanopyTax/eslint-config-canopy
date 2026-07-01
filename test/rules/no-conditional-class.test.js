import { RuleTester } from 'eslint';
import rule from '../../plugin/rules/no-conditional-class.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-conditional-class', rule, {
  valid: [
    { code: `maybe(cond, "truncate")` },
    { code: `tw(maybe(cond, "truncate"))` },
    // Non-empty branches is covered by no-class-ternary
    { code: `tw(cond ? "a" : "b")` },
    { code: `tw("base", cond && classVar)` },
    { code: `tw(cond || "fallback")` },
    // Outside classname helpers
    { code: `const c = cond ? "x" : ""` },
    { code: `foo(cond && "x")` },
    // className attribute (JSX)
    { code: `const el = <div className={maybe(cond, "x")} />` },
    { code: `const el = <div className={cond ? "a" : "b"} />` },
    { code: `const el = <div className="static" />` },
  ],
  invalid: [
    {
      code: `tw("base", showActions ? "pb-9" : "")`,
      output: `tw("base", maybe(showActions, "pb-9"))`,
      errors: [{ messageId: 'useMaybe' }],
    },
    {
      code: `tw(cond ? "" : "y")`,
      output: `tw(maybe(!cond, "y"))`,
      errors: [{ messageId: 'useMaybe' }],
    },
    {
      code: `tw(!active ? "" : "y")`,
      output: `tw(maybe(active, "y"))`,
      errors: [{ messageId: 'useMaybe' }],
    },
    {
      code: `tw(a && b ? "" : "y")`,
      output: `tw(maybe(!(a && b), "y"))`,
      errors: [{ messageId: 'useMaybe' }],
    },
    {
      code: `tw("base", menuOpen && "bg-x")`,
      output: `tw("base", maybe(menuOpen, "bg-x"))`,
      errors: [{ messageId: 'useMaybe' }],
    },
    {
      code: `always(open && "opacity-60")`,
      output: `always(maybe(open, "opacity-60"))`,
      errors: [{ messageId: 'useMaybe' }],
    },
    {
      // bare className && short-circuit (no helper wrapper)
      code: `const el = <div className={isOpen && "visible"} />`,
      output: `const el = <div className={maybe(isOpen, "visible")} />`,
      errors: [{ messageId: 'useMaybe' }],
    },
    {
      // bare className empty-branch ternary
      code: `const el = <div className={expanded ? "nav-expanded" : ""} />`,
      output: `const el = <div className={maybe(expanded, "nav-expanded")} />`,
      errors: [{ messageId: 'useMaybe' }],
    },
  ],
});
