# Disallow Canopy `cp-*` classes inside `tw()` (no-cp-class-in-tw)

Canopy's `tw()` classname helper applies a per-app Tailwind **prefix** to every
token it receives. Design-system classes (`cp-*`) are global and unprefixed, so
passing one through `tw()` rewrites it — with a `fo-` prefix, `tw("cp-body")`
emits `fo-cp-body`, a class that doesn't exist, silently dropping the styling.

## Rule Details

This rule reports any `cp-*` class token that appears inside a `tw()` call. It
looks through the common ways tokens reach `tw()`: plain strings, template
literals, ternaries, logical (`&&` / `||`) expressions, arrays, string
concatenation (`+`), and nested helper calls. CSS custom properties referenced
inside arbitrary values (e.g. `bg-[var(--cp-color-app-border)]`) are **not**
reported — only standalone `cp-*` class tokens are.

Examples of **incorrect** code for this rule:

```js
/*eslint canopy/no-cp-class-in-tw: "error"*/

tw("cp-body flex");
tw("cp-wt-semibold mb-1");
tw("flex", isActive ? "cp-body" : "cp-caption");
tw(`cp-body ${variant}`);
tw("flex", maybe(open, "cp-body"));
```

Examples of **correct** code for this rule:

```js
/*eslint canopy/no-cp-class-in-tw: "error"*/

always("cp-body", tw("flex"));
always("cp-wt-semibold", tw("mb-1"));
tw("flex flex-col gap-4");
tw("bg-[var(--cp-color-app-border)]");
maybe(open, "cp-body");
```

## Suggestions

When every argument to the `tw()` call is a plain string literal, the rule
offers an editor suggestion that hoists the `cp-*` tokens into `always()`:

```js
tw("cp-body p-2")        // → always("cp-body", tw("p-2"))
tw("cp-body cp-caption") // → always("cp-body cp-caption")
```

The suggestion assumes `always` is already in scope (it ships alongside `tw` in
`@canopytax/understory`); it does **not** add or modify imports. Dynamic calls
(ternaries, nested calls, concatenation, templates) are reported but not
auto-rewritten, since hoisting tokens out of them isn't a safe mechanical edit.

## When Not To Use It

If your app initializes the classname helpers with an **empty** prefix,
`tw("cp-body")` does not break at runtime — the rule is then a
stylistic/consistency guard rather than a correctness one, so you may prefer to
keep it at `warn` (the default severity) or disable it.
