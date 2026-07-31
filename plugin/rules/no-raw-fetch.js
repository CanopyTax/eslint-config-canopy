const HOST_OBJECTS = new Set(['window', 'globalThis', 'self', 'global']);

const WHY =
  'skips Canopy auth headers, the CSRF token, error routing and Sentry breadcrumbs. Use `fetcher!sofe`.';

// Only the ambient global counts. A `fetch` that resolves to a local function or
// an import (node-fetch, a polyfill) has a definition, so it is left alone.
function resolvesToGlobal(scope, name) {
  for (let current = scope; current; current = current.upper) {
    const variable = current.set.get(name);
    if (variable) return variable.defs.length === 0;
  }
  return true;
}

function isHostFetchMember(callee) {
  return (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.object.type === 'Identifier' &&
    HOST_OBJECTS.has(callee.object.name) &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'fetch'
  );
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw `fetch()` and `axios` — use `fetcher!sofe`, which adds Canopy auth, CSRF, error routing and Sentry breadcrumbs.',
      url: 'https://github.com/CanopyTax/eslint-config-canopy/blob/master/docs/rules/no-raw-fetch.md',
    },
    schema: [],
    messages: {
      rawFetch: `Raw \`fetch()\` ${WHY}`,
      axiosImport: `\`axios\` ${WHY}`,
    },
  },

  create(context) {
    const { sourceCode } = context;

    return {
      CallExpression(node) {
        const { callee } = node;

        if (callee.type === 'Identifier' && callee.name === 'fetch') {
          if (resolvesToGlobal(sourceCode.getScope(node), 'fetch')) {
            context.report({ node, messageId: 'rawFetch' });
          }
          return;
        }

        if (isHostFetchMember(callee)) {
          context.report({ node, messageId: 'rawFetch' });
          return;
        }

        // `require("axios")`
        if (
          callee.type === 'Identifier' &&
          callee.name === 'require' &&
          node.arguments[0]?.type === 'Literal' &&
          node.arguments[0].value === 'axios'
        ) {
          context.report({ node, messageId: 'axiosImport' });
        }
      },

      ImportDeclaration(node) {
        if (node.source.value === 'axios') {
          context.report({ node, messageId: 'axiosImport' });
        }
      },
    };
  },
};
