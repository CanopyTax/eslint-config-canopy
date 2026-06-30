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

## Plugin rules (opt-in)

This package also ships a `canopy` ESLint plugin via the `eslint-config-canopy/plugin` sub-export. It is not enabled by default — register it and pick the rules you want:

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
