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

        const [effect] = node.arguments;
        if (
          effect?.type !== 'ArrowFunctionExpression' &&
          effect?.type !== 'FunctionExpression'
        ) {
          return;
        }

        // A concise arrow body returns its expression, so the effect does return
        // something and the rule stays silent.
        if (effect.body.type !== 'BlockStatement') return;

        let subscribesHere = false;
        let returnsSomething = false;

        walkOwnScope(effect.body, (child) => {
          if (isSubscribeCall(child)) subscribesHere = true;
          if (child.type === 'ReturnStatement' && child.argument) returnsSomething = true;
        });

        if (subscribesHere && !returnsSomething) {
          context.report({ node: effect, messageId: 'missingCleanup' });
        }
      },
    };
  },
};
