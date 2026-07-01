# Disallow class-selecting ternaries in className / tw() / always() (no-class-ternary)

The Canopy classname helpers provide `toggle(cond, whenTrue, whenFalse)` for
choosing between two class sets. Writing that choice as a raw ternary — whether
in a JSX `className` attribute or inside `tw()` / `always()` — is harder to scan
and inconsistent with the helper API.

## Rule Details

This rule reports a ternary whose **both** branches are non-empty class
expressions when it appears in any of:

- a JSX `className` / `class` attribute — `<div className={cond ? "a" : "b"} />`
- a `tw()` or `always()` call — `tw(cond ? "a" : "b")`

It descends through nested arrays, string concatenation, and template literals.
A ternary with an empty branch (`cond ? "x" : ""`) is handled by
[`no-conditional-class`](./no-conditional-class.md) instead.

Examples of **incorrect** code for this rule:

```jsx
/*eslint canopy/no-class-ternary: "error"*/

<div className={isDragOver ? "border-2" : "border"} />;
<div className={tw(isDragOver ? "border-2" : "border")} />;
<div className={always("base", open ? "max-h-[400px]" : "shrink-0")} />;
<div className={tw(["base", cond ? "a" : "b"])} />;
```

Examples of **correct** code for this rule:

```jsx
/*eslint canopy/no-class-ternary: "error"*/

<div className={toggle(isDragOver, "border-2", "border")} />;
<div className={tw(toggle(isDragOver, "border-2", "border"))} />; 
<div className={always("base", toggle(open, "max-h-[400px]", "shrink-0"))} />;
<div className={maybe(cond, "a")} />;
```

## Fixable

This rule is auto-fixable (`eslint --fix`). The fix wraps the ternary in
`toggle(...)` and **assumes `toggle` is already imported** — it does not add or
modify imports.

## When Not To Use It

If a file doesn't use the Canopy classname helpers (`tw` / `always`), this rule
won't apply to it. Disable the rule entirely if your project doesn't use them.
