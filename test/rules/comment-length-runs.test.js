import { RuleTester } from 'eslint';
import rule from '../../plugin/rules/comment-length.js';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: 'module' } });
const x240 = 'x'.repeat(240);

ruleTester.run('comment-length (// runs with empty lines)', rule, {
  valid: [
    { code: `//\n// ${x240}\nconst a = 1;` },
    { code: `// ${x240}\n//\nconst a = 1;` },
  ],
  invalid: [
    {
      code: `//\n// ${x240}x\n//\nconst a = 1;`,
      errors: [{ messageId: 'tooLong', data: { length: 241, max: 240 } }],
    },
  ],
});
