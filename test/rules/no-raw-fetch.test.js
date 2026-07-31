import { RuleTester } from 'eslint';
import rule from '../../plugin/rules/no-raw-fetch.js';

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
  ],
});
