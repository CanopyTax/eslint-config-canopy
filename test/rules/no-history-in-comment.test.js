import { RuleTester } from 'eslint';
import rule from '../../plugin/rules/no-history-in-comment.js';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: 'module' } });

ruleTester.run('no-history-in-comment', rule, {
  valid: [
    // "no longer" almost always describes runtime state, so it is not in the list.
    { code: `// Reconcile: if selectedAccount is no longer in the accounts list, re-select` },
    // "used to" usually means "is used for".
    { code: `// Used to prevent double borders on right sticky columns` },
    { code: `// get the previously shared/sent information for a file` },
    { code: `// covers this bugfix path` },
    { code: `//if there used to be a recurrence, and they want to remove it, add the when object back` },
    { code: `//previously was selected, now it's not, so filter it out` },
    { code: `// the link was broken or the task was created with recurrence, so make a template` },
    { code: `// @ts-ignore\nconst a = 1;` },
  ],
  invalid: [
    {
      code: `// CpLoader and CpTooltip used to come from canopy-styleguide!sofe`,
      errors: [{ messageId: 'history', data: { match: 'used to come' } }],
    },
    {
      code: `// The inbox-race scenario this PR fixes: an unrelated re-render must not clobber the id`,
      errors: [{ messageId: 'history', data: { match: 'this pr' } }],
    },
    {
      code: `// Regression: an earlier version invalidated every query`,
      errors: [{ messageId: 'history', data: { match: 'an earlier version' } }],
    },
    {
      code: `// Before the fix, two fields on different pages could be treated as one row.`,
      errors: [{ messageId: 'history', data: { match: 'before the fix' } }],
    },
    {
      code: `// Backend now correctly returns directory_user_id as id`,
      errors: [{ messageId: 'history', data: { match: 'now correctly' } }],
    },
    {
      code: `// the Cp* imports moved after the rename, so name the mock explicitly`,
      errors: [{ messageId: 'history', data: { match: 'after the rename' } }],
    },
    {
      code: `/* catch here, otherwise the stream silently swallows the error */`,
      errors: [{ messageId: 'history', data: { match: 'silently swallows' } }],
    },
  ],
});
