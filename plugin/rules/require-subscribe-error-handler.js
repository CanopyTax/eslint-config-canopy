// Only an *inline* function is unambiguously a value handler. A bare reference is
// not: real Pusher code passes the channel name as a variable
// (`pusher.subscribe(channelName)`, `pusher.subscribe(this.props.channelId)`), and
// an observer passed by reference looks identical. Since neither can be told apart
// from a callback without type information, references are left alone.
const INLINE_HANDLER_TYPES = new Set(['ArrowFunctionExpression', 'FunctionExpression']);

function isObserverWithErrorKey(node) {
  if (node.type !== 'ObjectExpression') return false;

  for (const prop of node.properties) {
    // A spread may carry `error`, and its contents are not visible here.
    if (prop.type === 'SpreadElement') return true;
    if (prop.type !== 'Property') continue;
    // `{ [error]: h }` reads a variable named error rather than declaring the
    // handler key, so a computed identifier must not satisfy the check.
    if (prop.key.type === 'Identifier' && !prop.computed && prop.key.name === 'error') return true;
    if (prop.key.type === 'Literal' && prop.key.value === 'error') return true;
  }

  return false;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require an error handler on `.subscribe()` — a stream error with no handler is swallowed silently.',
      url: 'https://github.com/CanopyTax/eslint-config-canopy/blob/master/docs/rules/require-subscribe-error-handler.md',
    },
    schema: [],
    messages: {
      missingErrorHandler:
        '`.subscribe()` has no error handler, so a stream error is swallowed and never reaches Sentry or the user. Pass a second argument or an `error` key, routed through `handleError`.',
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        const { callee } = node;
        if (
          callee.type !== 'MemberExpression' ||
          callee.computed ||
          callee.property.type !== 'Identifier' ||
          callee.property.name !== 'subscribe'
        ) {
          return;
        }

        const args = node.arguments;

        // `.subscribe()` handles nothing at all; reporting it points at no fix.
        if (args.length === 0) return;

        // The observer-object form carries its handler as an `error` key.
        if (args.length === 1 && args[0].type === 'ObjectExpression') {
          if (!isObserverWithErrorKey(args[0])) {
            context.report({ node, messageId: 'missingErrorHandler' });
          }
          return;
        }

        // A second positional argument is the error handler.
        if (args.length >= 2) return;

        if (!INLINE_HANDLER_TYPES.has(args[0].type)) return;

        context.report({ node, messageId: 'missingErrorHandler' });
      },
    };
  },
};
