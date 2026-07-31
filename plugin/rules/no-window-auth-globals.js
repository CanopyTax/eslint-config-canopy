const USER_TENANT = 'useWithUserAndTenant() (or the UserTenantProps decorator in class components)';

const REPLACEMENTS = {
  loggedInUser: USER_TENANT,
  tenant: USER_TENANT,
  betas: 'useBetas()',
};

function propertyName(node) {
  if (node.computed) {
    return node.property.type === 'Literal' ? node.property.value : undefined;
  }
  return node.property.type === 'Identifier' ? node.property.name : undefined;
}

// `{ tenant }`, `{ "tenant": t }` and `{ ["tenant"]: t }` are the same read.
function patternKeyName(prop) {
  if (prop.type !== 'Property') return undefined;
  if (prop.key.type === 'Identifier' && !prop.computed) return prop.key.name;
  if (prop.key.type === 'Literal') return prop.key.value;
  return undefined;
}

// Writes are how cp-client-auth, app bootstraps and test mocks populate these
// globals in the first place, so only reads are violations. `delete` counts as a
// write: bootstrap and test teardown use it to unset them.
//
// Only plain `=` is a pure write. Compound and logical assignment (`+=`, `||=`,
// `??=`) read the current value before storing, which is exactly the stale-snapshot
// problem this rule exists to catch.
function isWrite(node) {
  const { parent } = node;
  if (parent?.type === 'AssignmentExpression' && parent.left === node) {
    return parent.operator === '=';
  }
  if (parent?.type === 'UnaryExpression' && parent.operator === 'delete') return true;
  return false;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow reading logged-in user, tenant, or beta state off `window` — the value never updates and is undefined before auth resolves. Use cp-client-auth instead.',
      url: 'https://github.com/CanopyTax/eslint-config-canopy/blob/master/docs/rules/no-window-auth-globals.md',
    },
    schema: [],
    messages: {
      windowAuthGlobal:
        '`window.{{global}}` bypasses cp-client-auth: it is a snapshot that never updates and is undefined before auth resolves. Use {{replacement}} instead.',
    },
  },

  create(context) {
    const { sourceCode } = context;

    // Only the ambient browser global counts. Tests and non-browser code shadow
    // `window` with a local of the same name, and that is a different object.
    function isBrowserWindow(identifier) {
      for (let scope = sourceCode.getScope(identifier); scope; scope = scope.upper) {
        const variable = scope.set.get('window');
        if (variable) return variable.defs.length === 0;
      }
      return true;
    }

    // Shared by `const { tenant } = window` and `({ tenant } = window)`.
    function reportPattern(pattern, source) {
      if (source?.type !== 'Identifier' || source.name !== 'window') return;
      if (!isBrowserWindow(source)) return;

      for (const prop of pattern.properties) {
        const name = patternKeyName(prop);
        if (!name || !Object.hasOwn(REPLACEMENTS, name)) continue;
        report(prop, name);
      }
    }

    function report(node, global) {
      context.report({
        node,
        messageId: 'windowAuthGlobal',
        data: { global, replacement: REPLACEMENTS[global] },
      });
    }

    return {
      MemberExpression(node) {
        if (node.object.type !== 'Identifier' || node.object.name !== 'window') return;
        const name = propertyName(node);
        if (!name || !Object.hasOwn(REPLACEMENTS, name)) return;
        if (isWrite(node)) return;
        if (!isBrowserWindow(node.object)) return;
        report(node, name);
      },

      // `const { betas, tenant } = window` reads each named global.
      VariableDeclarator(node) {
        if (node.id.type !== 'ObjectPattern') return;
        reportPattern(node.id, node.init);
      },

      // `({ tenant } = window)` is the same read without a declaration.
      AssignmentExpression(node) {
        if (node.left.type !== 'ObjectPattern') return;
        reportPattern(node.left, node.right);
      },
    };
  },
};
