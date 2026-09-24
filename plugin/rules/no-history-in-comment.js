import { getCommentGroups } from '../utils/comment-groups.js';
import { getContentText, phraseMatcher } from '../utils/comment-text.js';

// Phrases were checked against fleet comments before inclusion. "no longer",
// "used to", "previously", and a few close variants dropped in a later fleet
// pass are left out: they mostly describe runtime state, not history.
const HISTORY_PHRASES = [
  'was missing', 'previously did', 'previously had',
  'before this fix', 'before this change', 'before this commit', 'before this pr',
  'never actually', 'have never', 'root-caused', 'root caused', 'this fix', 'this bug',
  'the bug was', 'now correctly', 'silently no-ops', 'silently noops',
  'silently fails', 'silently skips', 'silently swallows',
  'used to come', 'we used to', 'after the rename', 'before the fix', 'after the fix',
  'this pr', 'this pull request', 'an earlier version', 'previous implementation', 'the old code',
];

const findHistory = phraseMatcher(HISTORY_PHRASES);

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow comments that narrate how the code changed instead of how it works.',
      url: 'https://github.com/CanopyTax/eslint-config-canopy/blob/master/docs/rules/no-history-in-comment.md',
    },
    schema: [],
    messages: {
      history:
        'Comment narrates history ("{{match}}"). Describe how the code works now; git records how it changed.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    return {
      Program() {
        for (const group of getCommentGroups(sourceCode, { separateNonProse: true })) {
          const match = findHistory(getContentText(group));
          if (match) context.report({ loc: group.loc, messageId: 'history', data: { match } });
        }
      },
    };
  },
};
