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
        report(node, name);
      },

      // `const { betas, tenant } = window` reads each named global.
      VariableDeclarator(node) {
        if (node.id.type !== 'ObjectPattern') return;
        if (node.init?.type !== 'Identifier' || node.init.name !== 'window') return;

        for (const prop of node.id.properties) {
          if (prop.type !== 'Property' || prop.key.type !== 'Identifier') continue;
          if (!Object.hasOwn(REPLACEMENTS, prop.key.name)) continue;
          report(prop, prop.key.name);
        }
      },
    };
  },
};
