import { RuleTester } from 'eslint';
import rule from '../../plugin/rules/no-obvious-comment.js';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: 'module' } });

ruleTester.run('no-obvious-comment', rule, {
  valid: [
    // A reason marker vetoes the report.
    { code: `// increment the counter so that retries back off\ncounter += 1;` },
    { code: `// increment the counter because the server is 1-indexed\ncounter += 1;` },
    // No stock verb.
    { code: `// the counter\ncounter += 1;` },
    // No identifier echoed from the code.
    { code: `// increment it\ncount++;` },
    // Not attached: blank line between comment and code.
    { code: `// increment the counter\n\ncounter += 1;` },
    // Last line of the file.
    { code: `counter += 1;\n// increment the counter` },
    // Multi-line run.
    { code: `// increment the counter\n// before the next page\ncounter += 1;` },
    // Trailing comment.
    { code: `counter += 1; // increment the counter` },
    // Documented code spans more than two lines.
    { code: `// loop over the items\nfor (const item of items) {\n  use(item);\n}` },
    // Too many words.
    { code: `// set the user name on the user record that the name form edits for the user\nsetUserName(name);` },
    { code: `/* increment the counter */\ncounter += 1;` },
    { code: `// @ts-expect-error\ncounter++;` },
    { code: `//\ncounter += 1;` },
    { code: `#!/usr/bin/env node\ncounter += 1;` },
  ],
  invalid: [
    { code: `// increment the counter\ncounter += 1;`, errors: [{ messageId: 'obvious' }] },
    { code: `// set the user name\nsetUserName(name);`, errors: [{ messageId: 'obvious' }] },
    { code: `function f(items) {\n  // return the items\n  return items;\n}`, errors: [{ messageId: 'obvious', line: 2 }] },
    { code: `// initialize state\nconst state = {};`, errors: [{ messageId: 'obvious' }] },
    { code: `// remove listeners\nremoveListener(handler);`, errors: [{ messageId: 'obvious' }] },
  ],
});
