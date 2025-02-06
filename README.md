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