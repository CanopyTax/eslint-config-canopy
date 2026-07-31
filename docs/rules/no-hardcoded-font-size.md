# Disallow hardcoded font sizes (no-hardcoded-font-size)

Canopy's typography scale lives in the `cp-*` classes. A size set outside that
scale — a Tailwind `text-sm`, an arbitrary `text-[13px]`, or a literal
`fontSize` in a style prop — drifts from the design system and does not follow
theme or white-label changes.

## Rule Details

This rule reports two things:

1. Tailwind font-size classes inside `tw(...)`, `always(...)`, or a JSX
   `className` — the named scale (`text-xs` through `text-9xl`) and arbitrary
   values that parse as a CSS length (`text-[13px]`).
2. A `fontSize` property in a `style={{ ... }}` object whose value is a literal
   number or a CSS length or percentage.

Tailwind's `text-` prefix is overloaded, so sizes are matched from an explicit
list rather than by prefix. Colours (`text-red-500`,
`text-[var(--cp-color-app-text)]`), alignment (`text-left`), and decoration
(`text-ellipsis`) share the prefix and are **not** reported.

Examples of **incorrect** code for this rule:

```jsx
/*eslint canopy/no-hardcoded-font-size: "error"*/

tw("text-sm");
tw("flex text-xs gap-2");
tw("md:text-lg");
tw("text-[13px]");
<p className="text-sm">x</p>;
<p style={{ fontSize: "13px" }}>x</p>;
<p style={{ fontSize: 12 }}>x</p>;
<p style={{ fontSize: "85%" }}>x</p>;
```

Examples of **correct** code for this rule:

```jsx
/*eslint canopy/no-hardcoded-font-size: "error"*/

always("cp-body");
always("cp-body-sm cp-wt-semibold");
<p className="cp-body">x</p>;

// Colours, alignment and decoration share the `text-` prefix
tw("text-red-500");
tw("text-[var(--cp-color-app-text)]");
tw("text-left text-center");
tw("text-ellipsis");

// Defers to context instead of pinning a size
<p style={{ fontSize: "inherit" }}>x</p>;

// Not statically resolvable, so not reported
<p style={{ fontSize: theme.typography.size.s2 }}>x</p>;
```

## What is not reported

- **Computed `fontSize` values.** `fontSize: size` or a template literal cannot
  be resolved syntactically, so the rule stays silent rather than guessing.
- **CSS-wide keywords.** `inherit`, `initial`, `unset`, and `revert` defer to the
  surrounding context rather than hardcoding a size.
- **Style objects built elsewhere.** Only inline `style={{ ... }}` object
  literals are inspected.

## When Not To Use It

Text that must match a fixed external medium — a print stylesheet, a PDF
renderer, or an email template — has sizing requirements the `cp-*` scale does
not express. Disable the rule for those files.
