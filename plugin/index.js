import noCpClassInTw from './rules/no-cp-class-in-tw.js';
import noClassTernary from './rules/no-class-ternary.js';
import noConditionalClass from './rules/no-conditional-class.js';
import noWindowAuthGlobals from './rules/no-window-auth-globals.js';
import noToLocaleStringForDates from './rules/no-tolocalestring-for-dates.js';
import noHardcodedFontSize from './rules/no-hardcoded-font-size.js';

const plugin = {
  meta: {
    name: 'canopy',
  },
  rules: {
    'no-cp-class-in-tw': noCpClassInTw,
    'no-class-ternary': noClassTernary,
    'no-conditional-class': noConditionalClass,
    'no-window-auth-globals': noWindowAuthGlobals,
    'no-tolocalestring-for-dates': noToLocaleStringForDates,
    'no-hardcoded-font-size': noHardcodedFontSize,
  },
};

export default plugin;
