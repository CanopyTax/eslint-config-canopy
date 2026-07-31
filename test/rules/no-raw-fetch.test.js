import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import rule from '../../plugin/rules/no-raw-fetch.js';

// A type-only import needs the TypeScript parser to produce `importKind: 'type'`.
const tsRuleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parser: tsParser,
  },
});

tsRuleTester.run('no-raw-fetch (type imports)', rule, {
  valid: [
    // A type import issues no request at runtime.
    { code: `import type { AxiosError } from "axios";` },
    { code: `import { type AxiosResponse } from "axios";` },
    { code: `import type AxiosDefault from "axios";` },
  ],
  invalid: [
    {
      code: `import axios, { type AxiosError } from "axios";`,
      errors: [{ messageId: 'axiosImport' }],
    },
  ],
});

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    globals: { fetch: 'readonly', window: 'readonly' },
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-raw-fetch', rule, {
  valid: [
    // The sanctioned client
    { code: `import fetcher from "fetcher!sofe"; fetcher.get("/api/clients");` },
    { code: `import { fetchAsObservable } from "fetcher!sofe"; fetchAsObservable("/api/x");` },
    { code: `fetchAsObservable("/api/x");` },
    { code: `fetchWithSharedCache("/api/x");` },
    // A `fetch` method on some object is not the global
    { code: `resource.fetch();` },
    { code: `queryClient.fetchQuery({ queryKey });` },
    { code: `store.fetch(id);` },
    // Assigning window.fetch is how tests install a mock
    { code: `window.fetch = jest.fn();` },
    { code: `global.fetch = mockFetch;` },
    // A locally defined or imported `fetch` is not the browser global
    { code: `function fetch(url) { return null; } fetch("/api/x");` },
    { code: `import fetch from "node-fetch"; fetch("/api/x");` },
    { code: `const fetch = require("node-fetch"); fetch("/api/x");` },
    // Unrelated imports
    { code: `import axiosRetry from "axios-retry";` },
    { code: `import { thing } from "my-axios-helper";` },
  ],
  invalid: [
    {
      code: `fetch("/api/clients");`,
      errors: [{ messageId: 'rawFetch' }],
    },
    {
      code: `fetch(url, { method: "POST", body });`,
      errors: [{ messageId: 'rawFetch' }],
    },
    {
      code: `const res = await fetch("/api/x");`,
      errors: [{ messageId: 'rawFetch' }],
    },
    {
      code: `window.fetch("/api/x");`,
      errors: [{ messageId: 'rawFetch' }],
    },
    // The other host objects reach the same global.
    {
      code: `globalThis.fetch("/api/x");`,
      errors: [{ messageId: 'rawFetch' }],
    },
    {
      code: `self.fetch("/api/x");`,
      errors: [{ messageId: 'rawFetch' }],
    },
    {
      code: `global.fetch("/api/x");`,
      errors: [{ messageId: 'rawFetch' }],
    },
    {
      code: `globalThis["fetch"]("/api/x");`,
      errors: [{ messageId: 'rawFetch' }],
    },
    // axios imports
    {
      code: `import axios from "axios";`,
      errors: [{ messageId: 'axiosImport' }],
    },
    {
      code: `import { get } from "axios";`,
      errors: [{ messageId: 'axiosImport' }],
    },
    {
      code: `const axios = require("axios");`,
      errors: [{ messageId: 'axiosImport' }],
    },
    // Dynamic import and re-export reach the same client.
    {
      code: `const a = await import("axios");`,
      errors: [{ messageId: 'axiosImport' }],
    },
    {
      code: `export { default as axios } from "axios";`,
      errors: [{ messageId: 'axiosImport' }],
    },
    {
      code: `export * from "axios";`,
      errors: [{ messageId: 'axiosImport' }],
    },
  ],
});
