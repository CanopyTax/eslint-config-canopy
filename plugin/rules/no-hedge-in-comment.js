import { getCommentGroups } from '../utils/comment-groups.js';
import { getContentText, phraseMatcher } from '../utils/comment-text.js';

const HEDGE_PHRASES = [
  'should work', 'hopefully', 'probably fine', 'probably works', 'probably safe',
  'not sure why', 'not sure if', 'not sure this', 'i think', 'i believe',
  'as far as i can tell', 'afaik', 'seems to work', 'should be fine', 'should fix',
  'not 100% sure', 'not entirely sure', 'might not work', 'for some reason',
  'no idea why', 'in theory', 'should be ok',
];

const findHedge = phraseMatcher(HEDGE_PHRASES);

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow comments that hedge instead of stating a fact about the code.',
      url: 'https://github.com/CanopyTax/eslint-config-canopy/blob/master/docs/rules/no-hedge-in-comment.md',
    },
    schema: [],
    messages: {
      hedge: 'Comment hedges ("{{match}}"). Find out and state it, or remove the comment.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    return {
      Program() {
        for (const group of getCommentGroups(sourceCode)) {
          const match = findHedge(getContentText(group));
          if (match) context.report({ loc: group.loc, messageId: 'hedge', data: { match } });
        }
      },
    };
  },
};
