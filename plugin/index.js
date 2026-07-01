import noCpClassInTw from './rules/no-cp-class-in-tw.js';
import noHardcodedColor from './rules/no-hardcoded-color.js';

const plugin = {
  meta: {
    name: 'canopy',
  },
  rules: {
    'no-cp-class-in-tw': noCpClassInTw,
    'no-hardcoded-color': noHardcodedColor,
  },
};

export default plugin;
