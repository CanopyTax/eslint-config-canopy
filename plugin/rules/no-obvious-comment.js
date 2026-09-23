import { getCommentGroups } from '../utils/comment-groups.js';
import { getContentText } from '../utils/comment-text.js';

// Word lists and thresholds are windbag's OBVIOUS_COMMENT defaults, plus
// "because" as a reason marker.
const MAX_WORDS = 12;
const MIN_MATCH_RATIO = 0.85;
const STOCK_VERBS = new Set([
  'increment', 'increments', 'decrement', 'decrements', 'initialize', 'initializes', 'init',
  'declare', 'declares', 'define', 'defines', 'create', 'creates', 'creating', 'set', 'sets',
  'setting', 'assign', 'assigns', 'assigning', 'update', 'updates', 'updating', 'return',
  'returns', 'returning', 'call', 'calls', 'calling', 'invoke', 'invokes', 'check', 'checks',
  'checking', 'loop', 'loops', 'looping', 'iterate', 'iterates', 'iterating', 'import',
  'imports', 'importing', 'print', 'prints', 'printing', 'log', 'logs', 'logging', 'append',
  'appends', 'appending', 'add', 'adds', 'adding', 'remove', 'removes', 'removing', 'delete',
  'deletes',
]);
const STOPWORDS = new Set([
  'the', 'a', 'an', 'to', 'of', 'for', 'this', 'that', 'on', 'by', 'in', 'and', 'it', 'its',
  'with', 'from', 'as', 'is', 'are', 'our', 'we',
]);
const REASON_MARKERS = ['so that', 'in order to', 'to avoid', 'to prevent', 'note:', 'warning:', 'important:', 'because'];

function identifierWords(code) {
  const words = new Set();
  for (const id of code.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []) {
    for (const part of id.split('_').flatMap((p) => p.split(/(?<=[a-z])(?=[A-Z])/))) {
      if (part.length > 1) words.add(part.toLowerCase());
    }
  }
  return words;
}

function isObvious(commentText, codeText) {
  const lower = commentText.toLowerCase();
  if (REASON_MARKERS.some((marker) => lower.includes(marker))) return false;

  const words = lower.split(/[^\p{L}\p{N}_]+/u).filter(Boolean);
  if (words.length === 0 || words.length > MAX_WORDS) return false;

  const codeWords = identifierWords(codeText);
  const echoes = (w) => codeWords.has(w) || (w.endsWith('s') && codeWords.has(w.slice(0, -1)));

  let hasVerb = false;
  let hasEcho = false;
  let significant = 0;
  for (const word of words) {
    if (STOCK_VERBS.has(word)) {
      hasVerb = true;
      significant++;
    } else if (STOPWORDS.has(word)) {
      significant++;
    } else if (echoes(word)) {
      hasEcho = true;
      significant++;
    }
  }
  return hasVerb && hasEcho && significant / words.length >= MIN_MATCH_RATIO;
}

// The outermost node that starts at the first token on the line after the comment.
function attachedNode(sourceCode, comment) {
  const token = sourceCode.getTokenAfter(comment, { includeComments: false });
  if (!token || token.loc.start.line !== comment.loc.end.line + 1) return null;
  let node = sourceCode.getNodeByRangeIndex(token.range[0]);
  while (node?.parent && node.parent.type !== 'Program' && node.parent.range[0] === node.range[0]) {
    node = node.parent;
  }
  return node && node.type !== 'Program' ? node : null;
}

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow a short comment that only restates the line of code below it.',
      url: 'https://github.com/CanopyTax/eslint-config-canopy/blob/master/docs/rules/no-obvious-comment.md',
    },
    schema: [],
    messages: {
      obvious: 'Comment restates the code below it. Remove it, or say why the code does this.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    return {
      Program() {
        for (const group of getCommentGroups(sourceCode)) {
          if (group.kind !== 'run' || group.comments.length !== 1) continue;
          const [comment] = group.comments;
          if (comment.type !== 'Line') continue;
          const text = getContentText(group);
          if (!text) continue;
          const node = attachedNode(sourceCode, comment);
          if (!node || node.loc.end.line - node.loc.start.line + 1 > 2) continue;
          if (isObvious(text, sourceCode.getText(node))) {
            context.report({ loc: comment.loc, messageId: 'obvious' });
          }
        }
      },
    };
  },
};
