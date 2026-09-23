import { getCommentGroups } from '../utils/comment-groups.js';
import { getContentText } from '../utils/comment-text.js';

// Uppercase prefixes that form ticket-shaped tokens without being tickets.
const NOT_TICKET_PREFIXES = new Set(['UTC', 'UTF', 'ISO', 'RFC', 'CVE', 'GHSA', 'SHA', 'AES', 'RGB', 'LICENSE']);
const TICKET_RE = /\b([A-Z][A-Z0-9]{1,9})-\d+\b/g;

// Committed docs a reader can open from the repo. Any other .md file is assumed
// to be a planning document that does not ship with the code.
const OPENABLE_DOCS = new Set(['readme.md', 'changelog.md', 'contributing.md']);
const MD_FILE_RE = /[\w./-]+\.md\b/gi;
const POINTER_RES = [/§/, /\bPR ?#?\d+\b/, /\bPhase \d+\b/, /\b[\w-]+\.(?:tsx?|jsx?|mjs|cjs):\d+/];

function findTicket(text) {
  for (const match of text.matchAll(TICKET_RE)) {
    if (!NOT_TICKET_PREFIXES.has(match[1])) return match[0];
  }
  return undefined;
}

function findDocPointer(text) {
  for (const match of text.matchAll(MD_FILE_RE)) {
    const name = match[0].split('/').pop().toLowerCase();
    if (!OPENABLE_DOCS.has(name)) return match[0];
  }
  for (const pattern of POINTER_RES) {
    const match = pattern.exec(text);
    if (match) return match[0];
  }
  return undefined;
}

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow references a reader cannot follow from the repo: ticket IDs, and pointers into planning documents, PRs, or line numbers.',
      url: 'https://github.com/CanopyTax/eslint-config-canopy/blob/master/docs/rules/no-external-ref-in-comment.md',
    },
    schema: [],
    messages: {
      ticket:
        'Comment references ticket "{{match}}". Put ticket links in the commit or PR, and state the reason here.',
      docPointer:
        'Comment points at "{{match}}", which a reader of this file cannot open. Inline the fact the comment depends on.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    return {
      Program() {
        for (const group of getCommentGroups(sourceCode)) {
          const text = getContentText(group);
          const ticket = findTicket(text);
          if (ticket) {
            context.report({ loc: group.loc, messageId: 'ticket', data: { match: ticket } });
            continue;
          }
          const pointer = findDocPointer(text);
          if (pointer) {
            context.report({ loc: group.loc, messageId: 'docPointer', data: { match: pointer } });
          }
        }
      },
    };
  },
};
