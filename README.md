# canopy-eslint
A standard [eslint](https://eslint.org/) config for Canopy frontend developers. This assumes that you're using babel and babel-eslint [babel-eslint](https://github.com/babel/babel-eslint).

## Installation

```bash
yarn add -D eslint-config-canopy
```

## Usage

Your project needs to use the new ESLint v9 flat config system. Create an `eslint.config.mjs` file in your project root (Remove `.eslintrc` if it exists):

```javascript
import canopyConfig from "eslint-config-canopy";

export default [
  { // Specify directories/files to ignore here
    ignores: ["src/create-edit-client-old/**/*"],
  },
  ...canopyConfig,
  { // Override rules here
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];
```

## Plugin rules

This package ships a `canopy` ESLint plugin with Canopy-specific rules. Most of them
are **already enabled at `warn`** by the shared config exported from this package, so
extending `eslint-config-canopy` turns them on. See the table below for what each one
reports, and `docs/rules/` for the details.

The plugin is also exposed on its own via the `eslint-config-canopy/plugin` sub-export,
so you can register it directly to change a severity, disable a rule, or opt into one
that ships off by default:

```javascript
import canopyConfig from "eslint-config-canopy";
import canopyPlugin from "eslint-config-canopy/plugin";

export default [
  ...canopyConfig,
  {
    plugins: { canopy: canopyPlugin },
    rules: {
      "canopy/no-cp-class-in-tw": "error",
    },
  },
];
```

### Available rules

| Rule | Description |
| --- | --- |
| [`canopy/no-cp-class-in-tw`](docs/rules/no-cp-class-in-tw.md) | Disallows Canopy `cp-*` class tokens inside `tw(...)` calls. Tailwind's `tw()` helper applies a per-app prefix to every token, so `tw("cp-body")` produces a broken class like `fo-cp-body`. Use `always("cp-body", tw(...))` or place the `cp-*` class outside `tw()`. Offers a suggestion fix for flat string-literal calls. |
| [`canopy/no-class-ternary`](docs/rules/no-class-ternary.md) | Disallows a class-selecting ternary (both branches non-empty) in a JSX `className` attribute or a `tw(...)` / `always(...)` call. Use `toggle(cond, whenTrue, whenFalse)` instead. Auto-fixable. |
| [`canopy/no-conditional-class`](docs/rules/no-conditional-class.md) | Disallows an empty-branch ternary (`cond ? "x" : ""`) or a `cond && "x"` short-circuit in a JSX `className` attribute or a `tw(...)` / `always(...)` call. Use `maybe(cond, "x")` instead. Auto-fixable. |
| [`canopy/no-window-auth-globals`](docs/rules/no-window-auth-globals.md) | Disallows *reading* `window.loggedInUser`, `window.tenant`, or `window.betas`. These are snapshots that never update and are undefined before auth resolves. Use `useWithUserAndTenant()` / `UserTenantProps` / `useBetas()` from `cp-client-auth!sofe`. Writes are allowed, so bootstraps and test mocks are unaffected. |
| [`canopy/no-tolocalestring-for-dates`](docs/rules/no-tolocalestring-for-dates.md) | Disallows `.toLocaleDateString()`, `.toLocaleTimeString()`, and construction of an `Intl.DateTimeFormat`. Use Luxon `DateTime` with a Canopy preset such as `DateTime.DATE_SHORT`. `.toLocaleString()` is **not** reported — it is Luxon's own correct API and is also how numbers get thousands separators. |
| [`canopy/no-hardcoded-font-size`](docs/rules/no-hardcoded-font-size.md) | Disallows font sizes no theme can reach: Tailwind arbitrary lengths like `text-[13px]` and literal `fontSize` values in `style` props. The **named scale (`text-sm`…`text-9xl`) is allowed** — it resolves through the Tailwind theme. Colours, alignment, and decoration sharing the `text-` prefix are not reported, nor are computed values or `inherit`. |
