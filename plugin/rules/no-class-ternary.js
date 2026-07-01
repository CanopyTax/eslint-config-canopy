import { isClassnameContainerCall, isClassNameAttribute } from '../utils/classname-evaluation.js';

const isEmptyString = (n) => n.type === 'Literal' && n.value === '';

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow a class-selecting ternary in a className attribute or tw()/always() call — use toggle(cond, whenTrue, whenFalse) instead.',
      url: 'https://github.com/CanopyTax/eslint-config-canopy/blob/master/docs/rules/no-class-ternary.md',
    },
    fixable: 'code',
    schema: [],
    messages: {
      useToggle: 'Use `toggle(cond, whenTrue, whenFalse)` instead of a classname ternary.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode;

    function report(node) {
      context.report({
        node,
        messageId: 'useToggle',
        fix(fixer) {
          const test = sourceCode.getText(node.test);
          const consequent = sourceCode.getText(node.consequent);
          const alternate = sourceCode.getText(node.alternate);
          return fixer.replaceText(node, `toggle(${test}, ${consequent}, ${alternate})`);
        },
      });
    }

    function walk(node) {
      if (!node) return;

      switch (node.type) {
        case 'ConditionalExpression':
          if (!isEmptyString(node.consequent) && !isEmptyString(node.alternate)) {
            report(node);
          }
          return;
        case 'TemplateLiteral':
          node.expressions.forEach(walk);
          return;
        case 'CallExpression':
          if (isClassnameContainerCall(node)) return;
          node.arguments.forEach(walk);
          return;
        case 'LogicalExpression':
          walk(node.left);
          walk(node.right);
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
      // tw()/always() calls anywhere.
      CallExpression(node) {
        if (!isClassnameContainerCall(node)) return;
        node.arguments.forEach(walk);
      },
      // Anything inside an element's className/class attribute.
      JSXAttribute(node) {
        if (!isClassNameAttribute(node)) return;
        if (node.value?.type !== 'JSXExpressionContainer') return;
        walk(node.value.expression);
      },
    };
  },
};
