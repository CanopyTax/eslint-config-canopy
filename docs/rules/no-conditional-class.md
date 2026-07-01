# Disallow conditional class expressions in className / tw() / always() (no-conditional-class)

The Canopy classname helpers provide `maybe(cond, ...classes)` to conditionally
include classes. Writing that as an empty-branch ternary (`cond ? "x" : ""`) or a
`cond && "x"` short-circuit — whether in a JSX `className` attribute or inside
`tw()` / `always()` — is less clear and inconsistent with the helper API.

## Rule Details

In a JSX `className` / `class` attribute, or inside a `tw()` / `always()` call,
this rule reports:

- a ternary with exactly one empty-string branch — `cond ? "x" : ""` or `cond ? "" : "y"`
- a `cond && "x"` short-circuit whose right-hand side is a class literal

It descends through nested arrays, string concatenation, and template literals.
A ternary with two non-empty branches is handled by
[`no-class-ternary`](./no-class-ternary.md) instead.

Examples of **incorrect** code for this rule:

```jsx
/*eslint canopy/no-conditional-class: "error"*/

<nav className={expanded ? "nav-expanded" : ""} />;
<button className={isOpen && "visible"} />;
<span className={tw("base", showActions ? "pb-9" : "")} />;
<div className={tw("base", menuOpen && "bg-[var(--cp-color-menu-hover-bg)]")} />;
```

Examples of **correct** code for this rule:

```jsx
/*eslint canopy/no-conditional-class: "error"*/

<nav className={maybe(expanded, "nav-expanded")} />;
<button className={maybe(isOpen, "visible")} />;
<span className={tw("base", maybe(showActions, "pb-9")) />;
<div className={tw("base", maybe(menuOpen, "bg-[var(--cp-color-menu-hover-bg)]")) />;
```

## Fixable

This rule is auto-fixable (`eslint --fix`). The fix rewrites to `maybe(...)`,
negating the condition when the empty branch is first (`cond ? "" : "y"` →
`maybe(!cond, "y")`, collapsing `!(!x)` to `x`), and **assumes `maybe` is
imported** (it does not add or modify imports).

## When Not To Use It

If a file uses neither JSX `className` attributes nor the Canopy classname
helpers (`tw` / `always`), this rule won't apply to it. Disable the rule entirely
if your project doesn't use them.
