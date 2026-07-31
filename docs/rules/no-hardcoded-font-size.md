# Disallow unthemeable font sizes (no-hardcoded-font-size)

Canopy's typography lives in the `cp-*` classes and in the Tailwind theme. A size
that goes through the theme can be corrected centrally; a literal length cannot.
`text-[13px]` and `style={{ fontSize: "13px" }}` pin a specific value that no theme
change will ever reach.

## Rule Details

This rule reports:

1. Tailwind **arbitrary** font sizes inside `tw(...)`, `always(...)`, or a JSX
   `className` — an arbitrary value that parses as a bare CSS length, such as
   `text-[13px]` or `text-[1.25rem]`.
2. A `fontSize` property in a `style={{ ... }}` object whose value is a literal
   number, length, or percentage.

**The named Tailwind scale is deliberately allowed.** `text-xs` through `text-9xl`
resolve through the Tailwind theme, so the Canopy theme maps them onto the correct
type scale. Reporting them would fight the theme rather than the problem.

Tailwind's `text-` prefix is also overloaded, so colours (`text-red-500`,
`text-[var(--cp-color-app-text)]`), alignment (`text-left`), and decoration
(`text-ellipsis`) are not reported either.

Examples of **incorrect** code for this rule:

```jsx
/*eslint canopy/no-hardcoded-font-size: "error"*/

tw("text-[13px]");
tw("text-[1.25rem]");
tw("flex text-[12px] gap-2");
tw("md:text-[13px]");
<p className="text-[13px]">x</p>;

<p style={{ fontSize: "13px" }}>x</p>;
<p style={{ fontSize: 12 }}>x</p>;
<p style={{ fontSize: "85%" }}>x</p>;
```

Examples of **correct** code for this rule:

```jsx
/*eslint canopy/no-hardcoded-font-size: "error"*/

// The named scale is themeable
tw("text-sm");
tw("flex text-xs gap-2");
tw("md:text-lg");
<p className="text-sm">x</p>;

// The Canopy typography classes
always("cp-body");
always("cp-body-sm cp-wt-semibold");

// Colours, alignment and decoration share the `text-` prefix
tw("text-red-500");
tw("text-[var(--cp-color-app-text)]");
tw("text-left text-center");

// An arbitrary value that is not a bare length
tw("text-[color:red]");
tw("text-[length:var(--x)]");

// Defers to context instead of pinning a size
<p style={{ fontSize: "inherit" }}>x</p>;

// Not statically resolvable
<p style={{ fontSize: theme.typography.size.s2 }}>x</p>;
```

## What is not reported

- **The named Tailwind scale.** See above — it is themeable by design.
- **Computed `fontSize` values.** `fontSize: size` or a template literal cannot be
  resolved syntactically, so the rule stays silent rather than guessing.
- **CSS-wide keywords.** `inherit`, `initial`, `unset`, and `revert` defer to the
  surrounding context.
- **Style objects built elsewhere.** Only inline `style={{ ... }}` object literals
  are inspected.

## Current status in the Canopy ecosystem

**89 findings across 53 files.**

Variant prefixes (`md:`, `hover:`, `!`) are stripped before matching. Only colons
outside `[...]` count as variant separators, so an arbitrary value containing a
colon parses correctly.

## When Not To Use It

Text that must match a fixed external medium — a print stylesheet, a PDF renderer,
or an email template — has sizing requirements the theme does not express. Disable
the rule for those files.
