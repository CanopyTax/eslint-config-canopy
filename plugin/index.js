import noCpClassInTw from './rules/no-cp-class-in-tw.js';
import noClassTernary from './rules/no-class-ternary.js';
import noConditionalClass from './rules/no-conditional-class.js';

const plugin = {
  meta: {
    name: 'canopy',
  },
  rules: {
    'no-cp-class-in-tw': noCpClassInTw,
    'no-class-ternary': noClassTernary,
    'no-conditional-class': noConditionalClass,
  },
};

export default plugin;
