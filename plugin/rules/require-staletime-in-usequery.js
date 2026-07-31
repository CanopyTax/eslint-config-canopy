const QUERY_HOOKS = new Set(['useQuery', 'useInfiniteQuery']);

function calleeName(callee) {
  if (callee.type === 'Identifier') return callee.name;
  // Covers `reactQuery.useQuery(...)`.
  if (callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier') {
    return callee.property.name;
  }
  return undefined;
}

function hasStaleTime(objectExpression) {
  return objectExpression.properties.some((prop) => {
    if (prop.type !== 'Property') return false;
    if (prop.key.type === 'Identifier') return prop.key.name === 'staleTime';
    if (prop.key.type === 'Literal') return prop.key.value === 'staleTime';
    return false;
  });
}

// A spread may carry `staleTime` from a query factory — the `...clientQueries.getClient(id)`
// pattern — and its contents cannot be resolved syntactically.
function hasSpread(objectExpression) {
  return objectExpression.properties.some((prop) => prop.type === 'SpreadElement');
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require an explicit `staleTime` when `useQuery` / `useInfiniteQuery` options are given as an object literal.',
      url: 'https://github.com/CanopyTax/eslint-config-canopy/blob/master/docs/rules/require-staletime-in-usequery.md',
    },
    schema: [],
    messages: {
      missingStaleTime:
        '`{{hook}}` has no `staleTime`, so it refetches on every mount — in the single-spa shell that means every navigation. Set `staleTime` explicitly.',
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        const hook = calleeName(node.callee);
        if (!hook || !QUERY_HOOKS.has(hook)) return;

        const [options] = node.arguments;
        // Only the object-literal signature can be checked. A factory call, an
        // identifier, or the legacy positional form all hide the options.
        if (options?.type !== 'ObjectExpression') return;
        if (hasSpread(options)) return;
        if (hasStaleTime(options)) return;

        context.report({ node, messageId: 'missingStaleTime', data: { hook } });
      },
    };
  },
};
