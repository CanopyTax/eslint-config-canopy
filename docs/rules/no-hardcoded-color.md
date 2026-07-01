# Disallow hardcoded colors in style props and className arbitrary values (no-hardcoded-color)

Hardcoded colors bypass the Canopy design token system. When a hex, rgb, or hsl value is embedded
in a `style` prop or a Tailwind arbitrary-value class, the color becomes invisible to the design
system, making theme changes and brand enforcement impossible.

Use `var(--cp-color-*)` CSS custom properties so all colors are sourced from the Canopy token
palette. Any CSS variable reference that does not start with `--cp-color-` is also flagged.

> **Finding the right token:** browse the full Canopy color palette at
> <https://storybook.canopytax.com/?path=/docs/design-color-palette--docs>

## Rule Details

In a JSX `style` attribute or a `className` / `class` attribute, this rule reports:

**In `style` prop object values:**
- hex color literals — `'#000'`, `'#ff0000'`, `'#ff000080'`
- `rgb()` / `rgba()` / `hsl()` / `hsla()` function literals
- `var(--X)` references where `X` does not start with `cp-`

**In class strings** (inside `tw()` / `always()` calls, JSX `className` / `class` attributes,
or nested expressions within them) — specifically within Tailwind arbitrary-value brackets `[...]`:
- hex: `text-[#000]`
- color functions: `bg-[rgb(0,0,0)]`, `border-[hsl(0,0%,0%)]`
- non-approved CSS variables: `text-[var(--some-var)]` (flagged), `text-[var(--cp-color-app-text)]` (allowed)
- CSS property shorthand arbitrary syntax: `[color:#000]`, `[background-color:rgb(0,0,0)]`

The rule descends through `tw()` / `always()` calls, ternaries, `&&` short-circuits, arrays,
template literals, and string concatenation.

## Options

```json
{ "canopy/no-hardcoded-color": ["warn", { "checkTailwindColors": false }] }
```

### `checkTailwindColors` (default: `false`)

When `true`, also flags Tailwind built-in named color utilities such as `bg-red-500`,
`text-white`, `border-gray-100`. This option exists as an optional toggle so the check can be
enabled when adopting a new color token system without changing the rule's detection logic 
for hardcoded values.

## Examples of incorrect code

```jsx
/*eslint canopy/no-hardcoded-color: "error"*/

<div style={{ color: '#000' }} />;
<div style={{ color: 'rgb(0, 0, 0)' }} />;
<div style={{ color: 'rgba(0, 0, 0, 0.85)' }} />;
<div style={{ color: 'hsl(0, 0%, 0%)' }} />;
<div style={{ color: 'var(--some-other-var)' }} />;
<div className={tw("text-[#000]")} />;
<div className={tw("bg-[rgb(0,0,0)]")} />;
<div className={tw("border-[var(--other-color)]")} />;
<div className="text-[#abc]" />;
```

With `{ "checkTailwindColors": true }`:

```jsx
<div className={tw("bg-red-500")} />;
<div className="text-white border-gray-100" />;
```

## Examples of correct code

```jsx
/*eslint canopy/no-hardcoded-color: "error"*/

<div style={{ color: 'var(--cp-color-app-text)' }} />;
<div style={{ background: 'var(--cp-color-app-bg)' }} />;
<div className={tw("bg-[var(--cp-color-app-border)]")} />;
<div className={tw("text-sm font-semibold")} />;
```

## When Not To Use It

Disable this rule only if your project has a documented reason to use hardcoded colors
(e.g., a one-off export or generated artifact that cannot reference CSS custom properties).
