import { isClassnameContainerCall, isClassNameAttribute } from '../utils/classname-evaluation.js';

// The named Tailwind scale (`text-sm`, `text-lg`, …) is deliberately NOT reported.
// Those tokens resolve through the Tailwind theme, so the Canopy theme can map them
// onto the correct type scale. An arbitrary value cannot: `text-[13px]` pins a
// literal length that no theme can reach.
const ARBITRARY_TEXT_RE = /^text-\[(.+)\]$/;
const CSS_LENGTH_RE = /^-?(?:\d*\.)?\d+(?:px|rem|em|pt|pc|in|cm|mm|ex|ch|vh|vw|vmin|vmax|%)$/;

// `inherit` and friends defer to the surrounding context instead of pinning a
// size, so they are not hardcoded values.
const CSS_WIDE_KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer']);

// Drop Tailwind variant prefixes (`md:`, `hover:`) and the `!important` marker.
// Only colons *outside* bracketed values separate variants, so `text-[color:red]`
// and `[&:hover]:text-[13px]` must not be split on their inner colons.
function stripVariants(token) {
  let depth = 0;
  let lastSeparator = -1;

  for (let i = 0; i < token.length; i++) {
    const char = token[i];
    if (char === '[') depth++;
    else if (char === ']') depth--;
    else if (char === ':' && depth === 0) lastSeparator = i;
  }

  const bare = token.slice(lastSeparator + 1);
  return bare.startsWith('!') ? bare.slice(1) : bare;
}

function fontSizeToken(rawToken) {
  const token = stripVariants(rawToken);

  const arbitrary = ARBITRARY_TEXT_RE.exec(token);
  // Only a bare length is a hardcoded size. `text-[var(--cp-color-*)]`,
  // `text-[#fff]` and `text-[color:red]` are colours; `text-[length:var(--x)]`
  // defers to a custom property.
  if (arbitrary && CSS_LENGTH_RE.test(arbitrary[1])) return token;

  return undefined;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow font sizes that no theme can reach — Tailwind arbitrary lengths such as `text-[13px]` and literal `fontSize` values in style props. The named scale (`text-sm`) is themeable and is allowed.',
      url: 'https://github.com/CanopyTax/eslint-config-canopy/blob/master/docs/rules/no-hardcoded-font-size.md',
    },
    schema: [],
    messages: {
      arbitraryFontSize:
        '`{{token}}` pins a literal font size that the Tailwind theme cannot map. Use a themeable size class such as `text-sm`, or a `cp-*` typography class.',
      inlineFontSize:
        '`fontSize: {{value}}` hardcodes a font size that no theme can reach. Use a themeable size class such as `text-sm`, or a `cp-*` typography class.',
    },
  },

  create(context) {
    function reportTokensIn(node, value) {
      if (typeof value !== 'string') return;
      for (const raw of value.split(/\s+/).filter(Boolean)) {
        const token = fontSizeToken(raw);
        if (token) {
          context.report({ node, messageId: 'arbitraryFontSize', data: { token } });
        }
      }
    }

    function walkClassnameValue(node) {
      if (!node) return;

      switch (node.type) {
        case 'Literal':
          reportTokensIn(node, node.value);
          return;
        case 'TemplateLiteral':
          for (const quasi of node.quasis) {
            reportTokensIn(quasi, quasi.value.cooked ?? quasi.value.raw ?? '');
          }
          node.expressions.forEach(walkClassnameValue);
          return;
        case 'CallExpression':
          // `tw()` / `always()` are visited by the CallExpression handler wherever they
          // appear, so descending into them here would report every token twice.
          if (!isClassnameContainerCall(node)) node.arguments.forEach(walkClassnameValue);
          return;
        case 'ConditionalExpression':
          walkClassnameValue(node.consequent);
          walkClassnameValue(node.alternate);
          return;
        case 'LogicalExpression':
          walkClassnameValue(node.left);
          walkClassnameValue(node.right);
          return;
        case 'ArrayExpression':
          node.elements.forEach(walkClassnameValue);
          return;
        case 'BinaryExpression':
          if (node.operator === '+') {
            walkClassnameValue(node.left);
            walkClassnameValue(node.right);
          }
          return;
        case 'JSXExpressionContainer':
          walkClassnameValue(node.expression);
          return;
        default:
          return;
      }
    }

    function checkFontSizeProperty(prop) {
      if (prop.type !== 'Property') return;
      const key =
        prop.key.type === 'Identifier'
          ? prop.key.name
          : prop.key.type === 'Literal'
            ? prop.key.value
            : undefined;
      if (key !== 'fontSize') return;

      const { value } = prop;
      if (value.type !== 'Literal') return;

      if (typeof value.value === 'number') {
        context.report({
          node: value,
          messageId: 'inlineFontSize',
          data: { value: String(value.value) },
        });
        return;
      }

      if (typeof value.value !== 'string') return;
      const raw = value.value.trim();
      if (CSS_WIDE_KEYWORDS.has(raw.toLowerCase())) return;
      if (!CSS_LENGTH_RE.test(raw)) return;

      context.report({ node: value, messageId: 'inlineFontSize', data: { value: raw } });
    }

    return {
      CallExpression(node) {
        if (!isClassnameContainerCall(node)) return;
        node.arguments.forEach(walkClassnameValue);
      },

      JSXAttribute(node) {
        if (!isClassNameAttribute(node)) return;
        walkClassnameValue(node.value);
      },

      // Only `style={{ ... }}` object literals are inspected; a style object built
      // elsewhere cannot be resolved syntactically.
      JSXExpressionContainer(node) {
        const { parent } = node;
        if (parent?.type !== 'JSXAttribute') return;
        if (parent.name?.type !== 'JSXIdentifier' || parent.name.name !== 'style') return;
        if (node.expression.type !== 'ObjectExpression') return;
        node.expression.properties.forEach(checkFontSizeProperty);
      },
    };
  },
};
