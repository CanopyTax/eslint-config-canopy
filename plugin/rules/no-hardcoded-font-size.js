import { isClassnameContainerCall, isClassNameAttribute } from '../utils/classname-evaluation.js';

// Tailwind's `text-` prefix is overloaded across size, colour, alignment and
// decoration, so sizes are matched from an explicit list rather than by prefix.
const TEXT_SIZES = new Set([
  'text-xs',
  'text-sm',
  'text-base',
  'text-lg',
  'text-xl',
  'text-2xl',
  'text-3xl',
  'text-4xl',
  'text-5xl',
  'text-6xl',
  'text-7xl',
  'text-8xl',
  'text-9xl',
]);

const ARBITRARY_TEXT_RE = /^text-\[(.+)\]$/;
const CSS_LENGTH_RE = /^-?(?:\d*\.)?\d+(?:px|rem|em|pt|pc|in|cm|mm|ex|ch|vh|vw|vmin|vmax|%)$/;

// `inherit` and friends defer to the surrounding context instead of pinning a
// size, so they are not hardcoded values.
const CSS_WIDE_KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer']);

function stripVariants(token) {
  // Drop Tailwind variant prefixes (`md:`, `hover:`) and the `!important` marker.
  const withoutVariants = token.slice(token.lastIndexOf(':') + 1);
  return withoutVariants.startsWith('!') ? withoutVariants.slice(1) : withoutVariants;
}

function fontSizeToken(rawToken) {
  const token = stripVariants(rawToken);
  if (TEXT_SIZES.has(token)) return token;

  const arbitrary = ARBITRARY_TEXT_RE.exec(token);
  // `text-[var(--cp-color-*)]` and `text-[#fff]` are colours, not sizes.
  if (arbitrary && CSS_LENGTH_RE.test(arbitrary[1])) return token;

  return undefined;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow font sizes set outside the Canopy typography scale — Tailwind `text-*` size classes and literal `fontSize` values in style props.',
      url: 'https://github.com/CanopyTax/eslint-config-canopy/blob/master/docs/rules/no-hardcoded-font-size.md',
    },
    schema: [],
    messages: {
      tailwindFontSize:
        '`{{token}}` sets a font size outside the Canopy typography scale. Use a `cp-*` typography class instead.',
      inlineFontSize:
        '`fontSize: {{value}}` hardcodes a font size outside the Canopy typography scale. Use a `cp-*` typography class instead.',
    },
  },

  create(context) {
    function reportTokensIn(node, value) {
      if (typeof value !== 'string') return;
      for (const raw of value.split(/\s+/).filter(Boolean)) {
        const token = fontSizeToken(raw);
        if (token) {
          context.report({ node, messageId: 'tailwindFontSize', data: { token } });
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
