const DEFAULT_MAX = 240;

// A comment whose length is driven by a URL cannot be shortened, so it is exempt
// — the same escape `max-len` makes with its `ignoreUrls` option.
const URL_RE = /(?:https?|ftp):\/\/\S+/i;

// A JSDoc tag (`@param`, `@returns`, …) marks a block as structured API
// documentation, which legitimately runs long. A tagless `/** */` block is just
// inline prose in doc syntax and stays subject to the limit.
const JSDOC_TAG_RE = /(^|\s)@\w/;

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

    // A trailing comment (code before it on the same line) is measured on its
    // own; only standalone lines are grouped into a paragraph run.
    function isTrailing(comment) {
      const tokenBefore = sourceCode.getTokenBefore(comment, { includeComments: false });
      return Boolean(tokenBefore) && tokenBefore.loc.end.line === comment.loc.start.line;
    }

    function check(text, loc) {
      const trimmed = text.trim();
      if (URL_RE.test(trimmed)) return;
      if (trimmed.length <= max) return;
      context.report({ loc, messageId: 'tooLong', data: { length: trimmed.length, max } });
    }

    return {
      Program() {
        const comments = sourceCode.getAllComments();

        for (let i = 0; i < comments.length; ) {
          const comment = comments[i];

          if (comment.type === 'Block') {
            // A JSDoc block (`/** … */`) carrying an @tag is exempt as structured
            // API documentation; the leading `*` survives in `comment.value`.
            const isJsdoc = comment.value.startsWith('*');
            if (!(isJsdoc && JSDOC_TAG_RE.test(comment.value))) {
              check(comment.value, comment.loc);
            }
            i++;
            continue;
          }

          if (isTrailing(comment)) {
            check(comment.value, comment.loc);
            i++;
            continue;
          }

          // Gather a maximal run of standalone // lines on consecutive lines and
          // measure them as one paragraph, so switching /* */ prose to stacked
          // // lines does not slip past the limit.
          const run = [comment];
          let j = i + 1;
          while (j < comments.length) {
            const next = comments[j];
            if (
              next.type === 'Line' &&
              !isTrailing(next) &&
              next.loc.start.line === run[run.length - 1].loc.end.line + 1
            ) {
              run.push(next);
              j++;
            } else {
              break;
            }
          }

          const text = run.map((c) => c.value.trim()).join(' ');
          check(text, { start: run[0].loc.start, end: run[run.length - 1].loc.end });
          i = j;
        }
      },
    };
  },
};
