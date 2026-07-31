import { RuleTester } from 'eslint';
import rule from '../../plugin/rules/no-tolocalestring-for-dates.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-tolocalestring-for-dates', rule, {
  valid: [
    // `.toLocaleString()` is Luxon's correct API and must never be flagged.
    { code: `DateTime.fromISO(value).toLocaleString(DateTime.DATE_SHORT);` },
    { code: `dt.toLocaleString(DateTime.DATE_MED);` },
    { code: `dateTime.toLocaleString();` },
    // ...and it is also how numbers get thousands separators.
    { code: `amount.toLocaleString();` },
    { code: `totalClientsCount.toLocaleString("en-US");` },
    // Luxon formatting
    { code: `DateTime.fromISO(value).toFormat("yyyy-MM-dd");` },
    { code: `DateTime.now().toLocaleString(DateTime.TIME_SIMPLE);` },
    // Number formatting via Intl is unrelated to dates
    { code: `new Intl.NumberFormat("en-US").format(amount);` },
    { code: `Intl.NumberFormat().format(n);` },
    // Unrelated Intl APIs
    { code: `new Intl.Collator("en").compare(a, b);` },
    // `resolvedOptions()` is timezone *detection*, not date formatting — there is no
    // Canopy date preset that replaces it.
    { code: `const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;` },
    { code: `const tz = new Intl.DateTimeFormat().resolvedOptions().timeZone;` },
    { code: `const { locale } = Intl.DateTimeFormat().resolvedOptions();` },
    // A property named similarly on an unrelated object, not called
    { code: `const fn = obj.formatDate;` },
  ],
  invalid: [
    {
      code: `date.toLocaleDateString();`,
      errors: [{ messageId: 'localeDateMethod', data: { method: 'toLocaleDateString' } }],
    },
    {
      code: `new Date().toLocaleDateString();`,
      errors: [{ messageId: 'localeDateMethod', data: { method: 'toLocaleDateString' } }],
    },
    {
      code: `d.toLocaleDateString("en-US", { month: "short" });`,
      errors: [{ messageId: 'localeDateMethod', data: { method: 'toLocaleDateString' } }],
    },
    {
      code: `date.toLocaleTimeString();`,
      errors: [{ messageId: 'localeDateMethod', data: { method: 'toLocaleTimeString' } }],
    },
    // Optional chaining is still a call
    {
      code: `date?.toLocaleDateString();`,
      errors: [{ messageId: 'localeDateMethod', data: { method: 'toLocaleDateString' } }],
    },
    // Inside JSX
    {
      code: `const C = () => <span>{item.created_at.toLocaleDateString()}</span>;`,
      errors: [{ messageId: 'localeDateMethod', data: { method: 'toLocaleDateString' } }],
    },
    // Intl.DateTimeFormat, with and without `new`
    {
      code: `new Intl.DateTimeFormat("en-US").format(date);`,
      errors: [{ messageId: 'intlDateTimeFormat' }],
    },
    {
      code: `Intl.DateTimeFormat().format(date);`,
      errors: [{ messageId: 'intlDateTimeFormat' }],
    },
  ],
});
