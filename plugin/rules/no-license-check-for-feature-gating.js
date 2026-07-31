// Matches `cp-client-auth!sofe` and plain `cp-client-auth`. The rule keys on the
// import rather than the bare name because at least one app defines its own
// `hasLicense` helper with a different signature for analytics.
const AUTH_MODULE_RE = /^cp-client-auth(!sofe)?$/;

const LICENSE_FN = 'hasLicense';

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow gating features on `hasLicense()` from cp-client-auth — license state describes product entitlement, not user permission. Use `useHasAccess()`.',
      url: 'https://github.com/CanopyTax/eslint-config-canopy/blob/master/docs/rules/no-license-check-for-feature-gating.md',
    },
    schema: [],
    messages: {
      licenseFeatureGate:
        '`hasLicense()` gates on product entitlement, not on what this user is allowed to do. Use `useHasAccess()` to gate a feature.',
    },
  },

  create(context) {
    // Local binding names for cp-client-auth's hasLicense, including aliases.
    const licenseBindings = new Set();

    const TEST_PARENTS = new Set([
      'IfStatement',
      'ConditionalExpression',
      'WhileStatement',
      'DoWhileStatement',
    ]);

    // A call is a feature gate when its value is consumed as a condition rather
    // than stored, returned or passed along. Being an operand of `&&` / `||`
    // counts wherever that expression ends up, since `cond && <Feature />` gates
    // rendering just as much as an `if` does.
    function isConditionalPosition(node) {
      let current = node;
      let { parent } = node;

      while (parent) {
        if (parent.type === 'UnaryExpression' && parent.operator === '!') {
          current = parent;
          parent = parent.parent;
          continue;
        }
        if (parent.type === 'LogicalExpression') return true;
        if (TEST_PARENTS.has(parent.type)) return parent.test === current;
        return false;
      }

      return false;
    }

    return {
      ImportDeclaration(node) {
        if (typeof node.source.value !== 'string') return;
        if (!AUTH_MODULE_RE.test(node.source.value)) return;

        for (const spec of node.specifiers) {
          if (spec.type !== 'ImportSpecifier') continue;
          if (spec.imported.name !== LICENSE_FN) continue;
          licenseBindings.add(spec.local.name);
        }
      },

      CallExpression(node) {
        if (node.callee.type !== 'Identifier') return;
        if (!licenseBindings.has(node.callee.name)) return;
        if (!isConditionalPosition(node)) return;

        context.report({ node, messageId: 'licenseFeatureGate' });
      },
    };
  },
};
