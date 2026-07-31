const EFFECT_HOOKS = new Set(['useEffect', 'useLayoutEffect']);

const FUNCTION_TYPES = new Set([
  'ArrowFunctionExpression',
  'FunctionExpression',
  'FunctionDeclaration',
]);

function calleeName(callee) {
  if (callee.type === 'Identifier') return callee.name;
  // Covers `React.useEffect(...)`.
  if (callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier') {
    return callee.property.name;
  }
  return undefined;
}

// React accepts only a function (or undefined) as an effect's cleanup. A returned
// literal, object or array therefore cannot be one, and treating it as cleanup hid
// real leaks behind guard clauses such as `if (shouldDelete) return null;`.
// Anything that could evaluate to a function still counts, so the rule stays quiet
// on `return cleanup` and `return makeCleanup(sub)`.
const NON_CLEANUP_TYPES = new Set([
  'Literal',
  'ObjectExpression',
  'ArrayExpression',
  'TemplateLiteral',
]);

function isCleanupReturn(argument) {
  if (!argument) return false;
  if (NON_CLEANUP_TYPES.has(argument.type)) return false;
  // `return undefined` and `return void 0` are not cleanups either.
  if (argument.type === 'Identifier' && argument.name === 'undefined') return false;
  if (argument.type === 'UnaryExpression' && argument.operator === 'void') return false;
  return true;
}

// `useEffect((() => { ... }) as any, [])` wraps the callback in a TS node.
function unwrapTypeCast(node) {
  let current = node;
  while (
    current &&
    (current.type === 'TSAsExpression' ||
      current.type === 'TSSatisfiesExpression' ||
      current.type === 'TSNonNullExpression' ||
      current.type === 'TSTypeAssertion')
  ) {
    current = current.expression;
  }
  return current;
}

function isSubscribeCall(node) {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'subscribe'
  );
}

// Walks the effect body without descending into nested functions. A subscription
// created inside an event handler or a helper defined in the effect has a
// different lifetime, and the returned cleanup function is itself nested.
function walkOwnScope(node, visit) {
  if (!node || typeof node.type !== 'string') return;
  if (FUNCTION_TYPES.has(node.type)) return;

  visit(node);

  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item.type === 'string') walkOwnScope(item, visit);
      }
    } else if (child && typeof child.type === 'string') {
      walkOwnScope(child, visit);
    }
  }
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require an effect that subscribes to return a cleanup function, so the subscription does not outlive the component.',
      url: 'https://github.com/CanopyTax/eslint-config-canopy/blob/master/docs/rules/require-subscribe-cleanup.md',
    },
    schema: [],
    messages: {
      missingCleanup:
        'This effect subscribes but returns no cleanup, so the subscription outlives the component and keeps firing after unmount. Return a function that unsubscribes.',
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        const hook = calleeName(node.callee);
        if (!hook || !EFFECT_HOOKS.has(hook)) return;

        const effect = unwrapTypeCast(node.arguments[0]);
        if (
          effect?.type !== 'ArrowFunctionExpression' &&
          effect?.type !== 'FunctionExpression'
        ) {
          return;
        }

        // A concise arrow body returns its expression. If that expression is the
        // subscribe call itself, the effect returns a Subscription -- React warns
        // that an effect may return only a function -- so it is still a leak.
        if (effect.body.type !== 'BlockStatement') {
          if (isSubscribeCall(effect.body)) {
            context.report({ node: effect, messageId: 'missingCleanup' });
          }
          return;
        }

        let subscribesHere = false;
        let returnsCleanup = false;

        walkOwnScope(effect.body, (child) => {
          if (isSubscribeCall(child)) subscribesHere = true;
          if (child.type === 'ReturnStatement' && isCleanupReturn(child.argument)) {
            returnsCleanup = true;
          }
        });

        if (subscribesHere && !returnsCleanup) {
          context.report({ node: effect, messageId: 'missingCleanup' });
        }
      },
    };
  },
};
