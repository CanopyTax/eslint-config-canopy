import { isClassnameContainerCall, isClassNameAttribute } from '../utils/classname-evaluation.js';

const isEmptyString = (n) => n.type === 'Literal' && n.value === '';
const isClassLiteral = (n) =>
  (n.type === 'Literal' && typeof n.value === 'string') || n.type === 'TemplateLiteral';

// Negating a non-trivial test needs parentheses to preserve precedence.
const needsParens = (n) =>
  !['Identifier', 'MemberExpression', 'CallExpression', 'OptionalMemberExpression', 'OptionalCallExpression'].includes(
    n.type,
  );

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow an empty-branch ternary (`cond ? "x" : ""`) or `cond && "x"` class expression in a className attribute or tw()/always() call — use maybe(cond, "x") instead.',
      url: 'https://github.com/CanopyTax/eslint-config-canopy/blob/master/docs/rules/no-conditional-class.md',
    },
    fixable: 'code',
    schema: [],
    messages: {
      useMaybe: 'Use `maybe(cond, classes)` for conditional classes instead of `cond ? "x" : ""` or `cond && "x"`.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode;

    function negate(testNode) {
      if (testNode.type === 'UnaryExpression' && testNode.operator === '!') {
        return sourceCode.getText(testNode.argument);
      }
      const sourceText = sourceCode.getText(testNode);
      return needsParens(testNode) ? `!(${sourceText})` : `!${sourceText}`;
    }

    function report(node, altEmpty) {
      context.report({
        node,
        messageId: 'useMaybe',
        fix(fixer) {
          const conditional = altEmpty ? sourceCode.getText(node.test) : negate(node.test);
          const className = sourceCode.getText(altEmpty ? node.consequent : node.alternate);
          return fixer.replaceText(node, `maybe(${conditional}, ${className})`);
        },
      });
    }

    function reportLogical(node) {
      context.report({
        node,
        messageId: 'useMaybe',
        fix(fixer) {
          const conditional = sourceCode.getText(node.left);
          const className = sourceCode.getText(node.right);
          return fixer.replaceText(node, `maybe(${conditional}, ${className})`);
        },
      });
    }

    function walk(node) {
      if (!node) return;

      switch (node.type) {
        case 'ConditionalExpression': {
          const consEmpty = isEmptyString(node.consequent);
          const altEmpty = isEmptyString(node.alternate);

          if (consEmpty !== altEmpty) report(node, altEmpty);
          return;
        }
        case 'LogicalExpression':
          if (node.operator === '&&' && isClassLiteral(node.right)) {
            reportLogical(node);
            return;
          }
          walk(node.left);
          walk(node.right);
          return;
        case 'TemplateLiteral':
          node.expressions.forEach(walk);
          return;
        case 'CallExpression':
          if (isClassnameContainerCall(node)) return;
          node.arguments.forEach(walk);
          return;
        case 'ArrayExpression':
          node.elements.forEach(walk);
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
        if (!isClassnameContainerCall(node)) return;
        node.arguments.forEach(walk);
      },
      JSXAttribute(node) {
        if (!isClassNameAttribute(node)) return;
        if (node.value?.type !== 'JSXExpressionContainer') return;
        walk(node.value.expression);
      },
    };
  },
};
