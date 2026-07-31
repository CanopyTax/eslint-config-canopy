import { RuleTester } from 'eslint';
import rule from '../../plugin/rules/no-window-auth-globals.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

const USER_TENANT = 'useWithUserAndTenant() (or the UserTenantProps decorator in class components)';
const BETAS = 'useBetas()';

ruleTester.run('no-window-auth-globals', rule, {
  valid: [
    // Writes are how cp-client-auth, bootstraps and test mocks populate these globals.
    { code: `window.loggedInUser = user;` },
    { code: `window.tenant = tenant;` },
    { code: `window.betas = betas;` },
    { code: `window.loggedInUser = { id: 1 };` },
    // `delete` removes the global rather than reading it — bootstrap and test teardown do this.
    { code: `delete window.loggedInUser;` },
    { code: `delete window.tenant;` },
    { code: `delete window.betas;` },
    // The sanctioned replacements
    { code: `const { user, tenant } = useWithUserAndTenant();` },
    { code: `const betas = useBetas();` },
    // Bare identifiers are locals, not the global
    { code: `const x = loggedInUser;` },
    { code: `function f(tenant) { return tenant.id; }` },
    // Same property name on a different object
    { code: `const x = props.loggedInUser;` },
    { code: `const x = someObj.tenant;` },
    // Unrelated window access
    { code: `const x = window.location.href;` },
    { code: `const x = window.innerWidth;` },
  ],
  invalid: [
    {
      code: `const u = window.loggedInUser;`,
      errors: [
        {
          messageId: 'windowAuthGlobal',
          data: { global: 'loggedInUser', replacement: USER_TENANT },
        },
      ],
    },
    {
      code: `const id = window.tenant.id;`,
      errors: [
        {
          messageId: 'windowAuthGlobal',
          data: { global: 'tenant', replacement: USER_TENANT },
        },
      ],
    },
    {
      code: `if (window.betas.someFlag) { doThing(); }`,
      errors: [
        { messageId: 'windowAuthGlobal', data: { global: 'betas', replacement: BETAS } },
      ],
    },
    // Optional chaining is still a read
    {
      code: `const u = window?.loggedInUser;`,
      errors: [
        {
          messageId: 'windowAuthGlobal',
          data: { global: 'loggedInUser', replacement: USER_TENANT },
        },
      ],
    },
    // Computed access with a string literal
    {
      code: `const u = window["loggedInUser"];`,
      errors: [
        {
          messageId: 'windowAuthGlobal',
          data: { global: 'loggedInUser', replacement: USER_TENANT },
        },
      ],
    },
    // Destructuring off window reads each named global
    {
      code: `const { betas, tenant } = window;`,
      errors: [
        { messageId: 'windowAuthGlobal', data: { global: 'betas', replacement: BETAS } },
        {
          messageId: 'windowAuthGlobal',
          data: { global: 'tenant', replacement: USER_TENANT },
        },
      ],
    },
    // Reads inside JSX
    {
      code: `const C = () => <div>{window.loggedInUser.name}</div>;`,
      errors: [
        {
          messageId: 'windowAuthGlobal',
          data: { global: 'loggedInUser', replacement: USER_TENANT },
        },
      ],
    },
    // A compound assignment reads before it writes
    {
      code: `window.tenant = window.tenant;`,
      errors: [
        {
          messageId: 'windowAuthGlobal',
          data: { global: 'tenant', replacement: USER_TENANT },
        },
      ],
    },
  ],
});
