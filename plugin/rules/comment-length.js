import { getCommentGroups } from '../utils/comment-groups.js';

const DEFAULT_MAX = 240;

// A comment whose length is driven by a URL cannot be shortened, so it is exempt
// — the same escape `max-len` makes with its `ignoreUrls` option.
const URL_RE = /(?:https?|ftp):\/\/\S+/i;

// A JSDoc tag (`@param`, …) marks a block as structured API documentation, which
// legitimately runs long; a tagless doc block is prose in doc syntax and stays
// subject to the limit. `*` before the `@` matches inline `/**@type {Foo}*/`.
const JSDOC_TAG_RE = /(^|[\s*])@\w/;

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Limit the length of a comment. A comment over the limit (default 240 characters, ~2-3 lines) should be shortened, moved to linked documentation, or explicitly exempted with an eslint-disable.',
      url: 'https://github.com/CanopyTax/eslint-config-canopy/blob/master/docs/rules/comment-length.md',
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: { type: 'integer', minimum: 0 },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      tooLong:
        'Comment is {{length}} characters; keep comments under {{max}}. Shorten it or add an explicit eslint-disable if it genuinely must be long.',
    },
  },

  create(context) {
    const max = context.options[0]?.max ?? DEFAULT_MAX;
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    function check(text, loc) {
      if (URL_RE.test(text)) return;
      if (text.length <= max) return;
      context.report({ loc, messageId: 'tooLong', data: { length: text.length, max } });
    }

    return {
      Program() {
        for (const group of getCommentGroups(sourceCode)) {
          // A JSDoc block (`/** … */`) carrying an @tag is exempt as structured
          // API documentation; the leading `*` survives in `comment.value`.
          if (group.kind === 'block') {
            const { value } = group.comments[0];
            if (value.startsWith('*') && JSDOC_TAG_RE.test(value)) continue;
          }
          check(group.text.trim(), group.loc);
        }
      },
    };
  },
};
