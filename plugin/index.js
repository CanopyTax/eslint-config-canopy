import noCpClassInTw from './rules/no-cp-class-in-tw.js';

const plugin = {
  meta: {
    name: 'canopy',
  },
  rules: {
    'no-cp-class-in-tw': noCpClassInTw,
  },
};

export default plugin;
