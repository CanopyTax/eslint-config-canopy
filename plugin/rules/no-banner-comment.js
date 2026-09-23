import { getCommentGroups } from '../utils/comment-groups.js';

const BANNER_RE = /([=*#~\-─━])\1{4,}/;
// A run of `*` that opens a block and ends its line, or that sits alone on the
// block's last line, is block syntax, not decoration.
const OPENER_RE = /^\*+(?=[ \t]*\r?\n)/;
const CLOSER_RE = /(?<=\n[ \t]*)\*+$/;
const TABLE_SEPARATOR_RE = /\|(?:\s*:?-+:?\s*\|)+/g;

function decorationText(comment) {
  let text = comment.value;
  if (comment.type === 'Block') text = text.replace(OPENER_RE, '').replace(CLOSER_RE, '');
  return text.replace(TABLE_SEPARATOR_RE, '|');
}

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow decorative banner comments made of repeated characters.',
      url: 'https://github.com/CanopyTax/eslint-config-canopy/blob/master/docs/rules/no-banner-comment.md',
    },
    schema: [],
    messages: {
      banner: 'Decorative banner comment. Remove it; use file structure and naming to separate sections.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    return {
      Program() {
        for (const group of getCommentGroups(sourceCode)) {
          if (group.comments.some((comment) => BANNER_RE.test(decorationText(comment)))) {
            context.report({ loc: group.loc, messageId: 'banner' });
          }
        }
      },
    };
  },
};
