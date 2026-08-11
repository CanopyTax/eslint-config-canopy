import { RuleTester } from 'eslint';
import rule from '../../plugin/rules/no-license-check-for-feature-gating.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

const IMPORT = `import { hasLicense } from "cp-client-auth!sofe";`;

ruleTester.run('no-license-check-for-feature-gating', rule, {
  valid: [
    // Not a conditional: reading license state for billing, seat counts or analytics.
    { code: `${IMPORT} const licensed = hasLicense(type, licenses);` },
    { code: `${IMPORT} export function check(t, l) { return hasLicense(t, l); }` },
    {
      code: `${IMPORT} const props = { license_workflow: hasLicense(user, "workflow") };`,
    },
    { code: `${IMPORT} track({ licensed: hasLicense(type, licenses) });` },
    // A same-named local helper is a different function — primary-navbar has one.
    {
      code: `import { hasLicense } from "./user-guiding.helper"; if (hasLicense(user, "workflow")) { show(); }`,
    },
    { code: `if (hasLicense(user, "workflow")) { show(); }` },
    // The sanctioned way to gate a feature
    { code: `if (useHasAccess("tasks_create")) { show(); }` },
    { code: `const canDo = useHasAccess("tasks_create");` },
    // The library that defines it
    { code: `export function hasLicense(type, licenses) { return true; }` },
    // `??` coalesces a value, it does not gate a feature.
    { code: `${IMPORT} const licensed = hasLicense(type, licenses) ?? false;` },
    // A parameter shadowing the import is a different function.
    {
      code: `${IMPORT} function check(hasLicense) { if (hasLicense(a, b)) { go(); } }`,
    },
    { code: `${IMPORT} [1].forEach((hasLicense) => { if (hasLicense(a, b)) go(); });` },
  ],
  invalid: [
    {
      code: `${IMPORT} if (hasLicense(type, licenses)) { showFeature(); }`,
      errors: [{ messageId: 'licenseFeatureGate' }],
    },
    {
      code: `${IMPORT} function C() { if (!hasLicense(type, licenses)) return null; }`,
      errors: [{ messageId: 'licenseFeatureGate' }],
    },
    // Ternary test
    {
      code: `${IMPORT} const el = hasLicense(type, licenses) ? <Feature /> : null;`,
      errors: [{ messageId: 'licenseFeatureGate' }],
    },
    // Logical operand guarding JSX
    {
      code: `${IMPORT} const el = hasLicense(type, licenses) && <Feature />;`,
      errors: [{ messageId: 'licenseFeatureGate' }],
    },
    {
      code: `${IMPORT} const C = () => <div>{hasLicense(type, licenses) && <Feature />}</div>;`,
      errors: [{ messageId: 'licenseFeatureGate' }],
    },
    // Aliased import is still the same function
    {
      code: `import { hasLicense as hl } from "cp-client-auth!sofe"; if (hl(type, licenses)) { go(); }`,
      errors: [{ messageId: 'licenseFeatureGate' }],
    },
    // Combined with another condition
    {
      code: `${IMPORT} if (isOpen && hasLicense(type, licenses)) { go(); }`,
      errors: [{ messageId: 'licenseFeatureGate' }],
    },
    // `||` is documented as reported
    {
      code: `${IMPORT} if (isOpen || hasLicense(type, licenses)) { go(); }`,
      errors: [{ messageId: 'licenseFeatureGate' }],
    },
    // Loop tests
    {
      code: `${IMPORT} while (hasLicense(type, licenses)) { go(); }`,
      errors: [{ messageId: 'licenseFeatureGate' }],
    },
    // Plain module specifier, without the sofe suffix
    {
      code: `import { hasLicense } from "cp-client-auth"; if (hasLicense(t, l)) { go(); }`,
      errors: [{ messageId: 'licenseFeatureGate' }],
    },
  ],
});
