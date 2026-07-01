export const CLASSNAME_CONTAINER_SET = new Set(['tw', 'always']);

export function isClassnameContainerCall(node, containerNames = CLASSNAME_CONTAINER_SET) {
  return node?.type === 'CallExpression' && node.callee.type === 'Identifier' && containerNames.has(node.callee.name);
}

export const CLASSNAME_ATTRIBUTE_SET = new Set(['className', 'class']);
export const isClassNameAttribute = (node) =>
  node.name?.type === 'JSXIdentifier' && CLASSNAME_ATTRIBUTE_SET.has(node.name.name);
