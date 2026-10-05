import { RuleTester } from 'eslint';
import rule from '../../plugin/rules/no-banner-comment.js';

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: 'module' } });

ruleTester.run('no-banner-comment', rule, {
  valid: [
    { code: `/** Fetches the widget. */` },
    { code: `/**\n * Fetches the widget.\n * @param {string} id\n */\nfunction f(id) {}` },
    // A long JSDoc opener or closer on its own line is not a banner.
    { code: `/****************\n * Fetches the widget.\n ****************/` },
    { code: `/**\n * | name | type |\n * |------|------|\n * | id   | text |\n */` },
    { code: `// | a | b |\n// | :---: | ---- |` },
    { code: `// --- short divider` },
    { code: `// a -> b -> c` },
    { code: `//` },
    { code: `/**/` },
    { code: `#!/usr/bin/env node\nconst a = 1;` },
    // Trailing spaces after the closing star run are still block syntax.
    { code: `/**\n * Title\n *****   */` },
  ],
  invalid: [
    { code: `// ─── Fixtures ─────────────────────────────`, errors: [{ messageId: 'banner' }] },
    { code: `// =============== Exported Types Starts ===============`, errors: [{ messageId: 'banner' }] },
    { code: `// ##### Section`, errors: [{ messageId: 'banner' }] },
    { code: `// ~~~~~`, errors: [{ messageId: 'banner' }] },
    { code: `/* ***** */`, errors: [{ messageId: 'banner' }] },
    { code: `/****** Title ******/`, errors: [{ messageId: 'banner' }] },
    { code: `/*\n * ==========\n * Helpers\n */`, errors: [{ messageId: 'banner' }] },
    // One report per run.
    { code: `// ----------\n// Helpers\n// ----------`, errors: [{ messageId: 'banner', line: 1, endLine: 3 }] },
  ],
});
