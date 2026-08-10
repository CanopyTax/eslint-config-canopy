import noCpClassInTw from './rules/no-cp-class-in-tw.js';
import noClassTernary from './rules/no-class-ternary.js';
import noConditionalClass from './rules/no-conditional-class.js';
import noWindowAuthGlobals from './rules/no-window-auth-globals.js';

const plugin = {
  meta: {
    name: 'canopy',
  },
  rules: {
    'no-cp-class-in-tw': noCpClassInTw,
    'no-class-ternary': noClassTernary,
    'no-conditional-class': noConditionalClass,
    'no-window-auth-globals': noWindowAuthGlobals,
  },
};

export default plugin;
