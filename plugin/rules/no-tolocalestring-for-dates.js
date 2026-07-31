// Only the `Date`-exclusive methods are listed. `toLocaleString` is deliberately
// absent: Luxon's DateTime exposes a method of that exact name as the *correct*
// Canopy call, and numbers use it for thousands separators, so flagging it would
// be wrong far more often than right.
//
// Each method maps to the preset that replaces it — telling someone formatting a
// time to use a date preset would make the message actively misleading.
const DATE_ONLY_METHODS = new Map([
  ['toLocaleDateString', 'DateTime.DATE_SHORT'],
  ['toLocaleTimeString', 'DateTime.TIME_SIMPLE'],
]);

const INTL_PRESET = 'DateTime.DATE_SHORT';

function isIntlDateTimeFormat(callee) {
  return (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'Intl' &&
    !callee.computed &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'DateTimeFormat'
  );
}

// `Intl.DateTimeFormat().resolvedOptions()` reads the environment's timezone or
// locale rather than formatting anything, and no Canopy date preset replaces it.
function feedsResolvedOptions(node) {
  const { parent } = node;
  return (
    parent?.type === 'MemberExpression' &&
    parent.object === node &&
    !parent.computed &&
    parent.property.type === 'Identifier' &&
    parent.property.name === 'resolvedOptions'
  );
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow `Date`-only locale formatting (`toLocaleDateString`, `toLocaleTimeString`, `Intl.DateTimeFormat`) for display — use Luxon `DateTime` with a Canopy preset.',
      url: 'https://github.com/CanopyTax/eslint-config-canopy/blob/master/docs/rules/no-tolocalestring-for-dates.md',
    },
    schema: [],
    messages: {
      localeDateMethod:
        '`.{{method}}()` is a JS `Date` method whose output varies by browser and locale, bypassing the Canopy date presets. Use Luxon, e.g. `DateTime.fromJSDate(value).toLocaleString({{preset}})`.',
      intlDateTimeFormat: `\`Intl.DateTimeFormat\` bypasses the Canopy date presets. Use Luxon, e.g. \`DateTime.fromISO(value).toLocaleString(${INTL_PRESET})\`.`,
    },
  },

  create(context) {
    function checkCallee(node, callee) {
      if (isIntlDateTimeFormat(callee)) {
        if (!feedsResolvedOptions(node)) {
          context.report({ node, messageId: 'intlDateTimeFormat' });
        }
        return;
      }

      if (
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        callee.property.type === 'Identifier' &&
        DATE_ONLY_METHODS.has(callee.property.name)
      ) {
        const method = callee.property.name;
        context.report({
          node,
          messageId: 'localeDateMethod',
          data: { method, preset: DATE_ONLY_METHODS.get(method) },
        });
      }
    }

    return {
      CallExpression(node) {
        checkCallee(node, node.callee);
      },
      NewExpression(node) {
        checkCallee(node, node.callee);
      },
    };
  },
};
