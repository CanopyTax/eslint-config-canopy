import { RuleTester } from 'eslint';
import rule from '../../plugin/rules/no-hedge-in-comment.js';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: 'module' } });

ruleTester.run('no-hedge-in-comment', rule, {
  valid: [
    { code: `// should workers restart, the queue drains first` },
    { code: `// Think of the reducer's input as the raw feed` },
    { code: `// The retry must work offline; the cache is read first` },
  ],
  invalid: [
    // A phrase split across lines of a doc block still matches.
    {
      code: `/**\n * Renders the label. Not sure\n * why the svg needs a title.\n */`,
      errors: [{ messageId: 'hedge', data: { match: 'not sure why' } }],
    },
    {
      code: `// Not sure why, but the svg has a title of "filled circle" we can check`,
      errors: [{ messageId: 'hedge', data: { match: 'not sure why' } }],
    },
    {
      code: `//just a default that is hopefully close to what it really comes out to`,
      errors: [{ messageId: 'hedge', data: { match: 'hopefully' } }],
    },
    {
      code: `// I think red must be passing in a bulkTaskJql prop`,
      errors: [{ messageId: 'hedge', data: { match: 'i think' } }],
    },
    {
      code: `/* For some reason storybook has an issue with parsing the title */`,
      errors: [{ messageId: 'hedge', data: { match: 'for some reason' } }],
    },
    // Known false positive from fleet calibration: a defensive branch. Reported
    // on purpose; the fix is to state the condition plainly.
    {
      code: `// For when for some reason there is no section header on the page`,
      errors: [{ messageId: 'hedge', data: { match: 'for some reason' } }],
    },
  ],
});
