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
  if (callee.type !== 'MemberExpression') return false;
  if (callee.object.type !== 'Identifier' || !HOST_OBJECTS.has(callee.object.name)) return false;

  const property = callee.computed
    ? callee.property.type === 'Literal' && callee.property.value
    : callee.property.type === 'Identifier' && callee.property.name;

  return property === 'fetch';
}

// A type-only import produces no runtime request, so it is not an axios client.
function isTypeOnlyImport(node) {
  if (node.importKind === 'type') return true;
  if (node.specifiers.length === 0) return false;
  return node.specifiers.every((spec) => spec.importKind === 'type');
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

        // `require("axios")`, unless `require` is a local binding.
        if (
          callee.type === 'Identifier' &&
          callee.name === 'require' &&
          resolvesToGlobal(sourceCode.getScope(node), 'require') &&
          node.arguments[0]?.type === 'Literal' &&
          node.arguments[0].value === 'axios'
        ) {
          context.report({ node, messageId: 'axiosImport' });
        }
      },

      // `await import("axios")`
      ImportExpression(node) {
        if (node.source?.type === 'Literal' && node.source.value === 'axios') {
          context.report({ node, messageId: 'axiosImport' });
        }
      },

      ImportDeclaration(node) {
        if (node.source.value !== 'axios') return;
        if (isTypeOnlyImport(node)) return;
        context.report({ node, messageId: 'axiosImport' });
      },

      // `export { default as axios } from "axios"` and `export * from "axios"`
      ExportNamedDeclaration(node) {
        if (node.source?.value === 'axios' && node.exportKind !== 'type') {
          context.report({ node, messageId: 'axiosImport' });
        }
      },

      ExportAllDeclaration(node) {
        if (node.source?.value === 'axios' && node.exportKind !== 'type') {
          context.report({ node, messageId: 'axiosImport' });
        }
      },
    };
  },
};
