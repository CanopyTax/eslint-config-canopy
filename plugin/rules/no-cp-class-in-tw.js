// Match cp-* at string start or after any non-word-non-hyphen character.
// Excluding `-` preserves CSS custom properties like `--cp-color-*` inside
// arbitrary-value brackets (e.g. `bg-[var(--cp-color-app-border)]`).
const CP_TOKEN_RE = /(?:^|[^\w-])(cp-[A-Za-z0-9_-]+)/g;

function findCpTokens(str) {
  if (typeof str !== 'string') return [];
  const tokens = [];
  for (const m of str.matchAll(CP_TOKEN_RE)) {
    tokens.push(m[1]);
  }
  return tokens;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow Canopy `cp-*` classes inside tw() calls — tw() prefixes every token, so `cp-body` becomes `fo-cp-body` and breaks. Use always(`cp-body`, tw(`...`)) instead.',
    },
    schema: [],
    messages: {
      cpInTw:
        '`{{token}}` is a Canopy class and must not be passed through tw() — it will be prefixed and break. Use `always("{{token}}", tw(...))` or a template literal.',
    },
  },

  create(context) {
    function reportCp(node, token) {
      context.report({ node, messageId: 'cpInTw', data: { token } });
    }

    function walkInsideTw(node) {
      if (!node) return;

      switch (node.type) {
        case 'Literal': {
          for (const token of findCpTokens(node.value)) reportCp(node, token);
          return;
        }
        case 'TemplateLiteral': {
          for (const q of node.quasis) {
            for (const token of findCpTokens(q.value.cooked ?? q.value.raw ?? '')) {
              reportCp(q, token);
            }
          }
          node.expressions.forEach(walkInsideTw);
          return;
        }
        case 'CallExpression':
          node.arguments.forEach(walkInsideTw);
          return;
        case 'ConditionalExpression':
          walkInsideTw(node.consequent);
          walkInsideTw(node.alternate);
          return;
        case 'LogicalExpression':
          walkInsideTw(node.left);
          walkInsideTw(node.right);
          return;
        case 'ArrayExpression':
          node.elements.forEach(walkInsideTw);
          return;
        default:
          return;
      }
    }

    return {
      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'tw') return;
        node.arguments.forEach(walkInsideTw);
      },
    };
  },
};
