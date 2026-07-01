// Matches valid CSS hex colors: #rgb, #rgba, #rrggbb, #rrggbbaa
// (only 3/4/6/8 digits are valid — 5 and 7 are not)
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
// Matches rgb/rgba/hsl/hsla color functions at string start
const COLOR_FN_RE = /^(rgba?|hsla?)\s*\(/i;
// Approved CSS custom property prefix — only --cp-* passes
const CP_COLOR_VAR_RE = /^var\(--cp-/;
// Detects any var() reference so we can test it against the allowlist
const ANY_VAR_RE = /^var\(--/;

const CONTAINER_FNS = new Set(['tw', 'always']);
const CLASSNAME_ATTRS = new Set(['className', 'class']);

/**
 * Tailwind named color detection
 * Enabled via { checkTailwindColors: true } rule option (default: false).
 * Isolated here because there is a WIP token system and we only want to replace this block.
 */
const TW_COLOR_NAMES = [
  'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber',
  'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue',
  'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
];
const TW_UTILITY_PREFIXES = [
  'bg', 'text', 'border', 'ring', 'outline', 'shadow', 'divide',
  'fill', 'stroke', 'accent', 'caret', 'decoration', 'from', 'via', 'to',
];

const TW_COLOR_TOKEN_RE = new RegExp(
  `^(?:${TW_UTILITY_PREFIXES.join('|')})-` +
  `(?:white|black|transparent|(?:${TW_COLOR_NAMES.join('|')})-(?:50|[1-9]00|950))$`,
);

function findTailwindColorTokens(str) {
  if (typeof str !== 'string') return [];
  return str.split(/\s+/).filter((token) => {
    // Strip variant prefixes: hover:bg-red-500 → bg-red-500
    const base = token.includes(':') ? token.slice(token.lastIndexOf(':') + 1) : token;
    return TW_COLOR_TOKEN_RE.test(base);
  });
}

function staticString(node) {
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral' && node.quasis.length === 1) {
    return node.quasis[0].value.cooked ?? node.quasis[0].value.raw ?? null;
  }
  return null;
}

// Returns the flagged value string if a style-prop literal value is a
// hardcoded or non-approved color; null otherwise.
function checkStyleValue(value) {
  if (typeof value !== 'string') return null;
  if (HEX_COLOR_RE.test(value)) return value;
  if (COLOR_FN_RE.test(value)) return value;
  if (ANY_VAR_RE.test(value) && !CP_COLOR_VAR_RE.test(value)) return value;
  return null;
}

function findHardcodedInArbitraryValues(str) {
  if (typeof str !== 'string') return [];
  const found = [];
  for (const m of str.matchAll(/\[([^\]]{1,256})\]/g)) {
    let content = m[1];
    // Strip CSS property shorthand prefix: [color:rgb(...)] → rgb(...)
    const colonIdx = content.indexOf(':');
    if (colonIdx > 0 && /^[a-zA-Z-]+$/.test(content.slice(0, colonIdx))) {
      content = content.slice(colonIdx + 1).trim();
    }
    if (HEX_COLOR_RE.test(content)) {
      found.push(content);
    } else if (COLOR_FN_RE.test(content)) {
      found.push(content);
    } else if (ANY_VAR_RE.test(content) && !CP_COLOR_VAR_RE.test(content)) {
      found.push(content);
    }
  }
  return found;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow hardcoded colors and non-Canopy CSS variables in style props and className arbitrary values.',
      url: 'https://github.com/CanopyTax/eslint-config-canopy/blob/master/docs/rules/no-hardcoded-color.md',
    },
    schema: [
      {
        type: 'object',
        properties: {
          // When true, also flags Tailwind built-in named color utilities
          // (e.g. bg-red-500, text-white). Off by default — enable once a
          // full token migration is underway or when switching color systems.
          checkTailwindColors: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noHardcodedColor:
        '"{{value}}" is not an approved color — use a Canopy design token (--cp-color-*). Find a matching token at https://storybook.canopytax.com/?path=/docs/design-color-palette--docs',
    },
  },

  create(context) {
    const { checkTailwindColors = false } = context.options[0] ?? {};

    function report(node, value) {
      context.report({ node, messageId: 'noHardcodedColor', data: { value } });
    }

    function checkClassLiteral(node, str) {
      for (const v of findHardcodedInArbitraryValues(str)) report(node, v);
      if (checkTailwindColors) {
        for (const token of findTailwindColorTokens(str)) report(node, token);
      }
    }

    function walk(node) {
      if (!node) return;
      switch (node.type) {
        case 'Literal':
          if (typeof node.value === 'string') checkClassLiteral(node, node.value);
          return;
        case 'TemplateLiteral':
          for (const q of node.quasis) checkClassLiteral(q, q.value.cooked ?? q.value.raw ?? '');
          return;
        case 'CallExpression':
          if (node.callee.type === 'Identifier' && CONTAINER_FNS.has(node.callee.name)) return;
          for (const arg of node.arguments) walk(arg);
          return;
        case 'ConditionalExpression':
          walk(node.consequent);
          walk(node.alternate);
          return;
        case 'LogicalExpression':
          walk(node.left);
          walk(node.right);
          return;
        case 'ArrayExpression':
          for (const el of node.elements) if (el) walk(el);
          return;
        case 'BinaryExpression':
          if (node.operator === '+') {
            walk(node.left);
            walk(node.right);
          }
          return;
        default:
          return;
      }
    }

    return {
      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || !CONTAINER_FNS.has(node.callee.name)) return;
        for (const arg of node.arguments) walk(arg);
      },

      JSXAttribute(node) {
        if (node.name?.type !== 'JSXIdentifier') return;
        const attrName = node.name.name;

        if (CLASSNAME_ATTRS.has(attrName)) {
          if (!node.value) return;
          if (node.value.type === 'Literal' && typeof node.value.value === 'string') {
            checkClassLiteral(node.value, node.value.value);
          } else if (node.value.type === 'JSXExpressionContainer') {
            walk(node.value.expression);
          }
        } else if (attrName === 'style') {
          if (node.value?.type !== 'JSXExpressionContainer') return;
          const expr = node.value.expression;
          if (expr.type !== 'ObjectExpression') return;
          for (const prop of expr.properties) {
            if (prop.type !== 'Property') continue;
            const val = prop.value;
            const str = staticString(val);
            if (str === null) continue;
            const flagged = checkStyleValue(str);
            if (flagged) report(val, flagged);
          }
        }
      },
    };
  },
};
