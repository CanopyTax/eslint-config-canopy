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
      url: 'https://github.com/CanopyTax/eslint-config-canopy/blob/master/docs/rules/no-cp-class-in-tw.md',
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      cpInTw:
        '`{{token}}` is a Canopy class and must not be passed through tw() — it will be prefixed and break. Keep `cp-*` outside tw(), e.g. `always("{{token}}", tw(...))` or `` `{{token}} ${tw(...)}` ``.',
      moveToAlways: 'Move cp-* classes out of tw() and into always().',
    },
  },

  create(context) {
    function reportCp(node, token, suggest) {
      const descriptor = { node, messageId: 'cpInTw', data: { token } };
      if (suggest) descriptor.suggest = suggest;
      context.report(descriptor);
    }

    function buildAlwaysSuggestion(twNode) {
      const args = twNode.arguments;
      if (args.length === 0) return null;
      for (const arg of args) {
        if (arg.type !== 'Literal' || typeof arg.value !== 'string') return null;
      }

      const cp = [];
      const rest = [];
      for (const arg of args) {
        for (const tok of arg.value.split(/\s+/).filter(Boolean)) {
          (tok.startsWith('cp-') ? cp : rest).push(tok);
        }
      }
      if (cp.length === 0) return null;

      const twName = twNode.callee.name;
      const cpStr = cp.join(' ');
      const replacement = rest.length
        ? `always("${cpStr}", ${twName}("${rest.join(' ')}"))`
        : `always("${cpStr}")`;

      return [
        {
          messageId: 'moveToAlways',
          fix: (fixer) => fixer.replaceText(twNode, replacement),
        },
      ];
    }

    function walkInsideTw(node, suggest) {
      if (!node) return;

      switch (node.type) {
        case 'Literal': {
          for (const token of findCpTokens(node.value)) reportCp(node, token, suggest);
          return;
        }
        case 'TemplateLiteral': {
          for (const q of node.quasis) {
            for (const token of findCpTokens(q.value.cooked ?? q.value.raw ?? '')) {
              reportCp(q, token, suggest);
            }
          }
          node.expressions.forEach((expr) => walkInsideTw(expr, suggest));
          return;
        }
        case 'CallExpression':
          node.arguments.forEach((arg) => walkInsideTw(arg, suggest));
          return;
        case 'ConditionalExpression':
          walkInsideTw(node.consequent, suggest);
          walkInsideTw(node.alternate, suggest);
          return;
        case 'LogicalExpression':
          walkInsideTw(node.left, suggest);
          walkInsideTw(node.right, suggest);
          return;
        case 'ArrayExpression':
          node.elements.forEach((el) => walkInsideTw(el, suggest));
          return;
        case 'BinaryExpression':
          if (node.operator === '+') {
            walkInsideTw(node.left, suggest);
            walkInsideTw(node.right, suggest);
          }
          return;
        default:
          return;
      }
    }

    return {
      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'tw') return;
        const suggest = buildAlwaysSuggestion(node);
        node.arguments.forEach((arg) => walkInsideTw(arg, suggest));
      },
    };
  },
};
