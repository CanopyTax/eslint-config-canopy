import noCpClassInTw from './rules/no-cp-class-in-tw.js';
import noClassTernary from './rules/no-class-ternary.js';
import noConditionalClass from './rules/no-conditional-class.js';
import noWindowAuthGlobals from './rules/no-window-auth-globals.js';
import noToLocaleStringForDates from './rules/no-tolocalestring-for-dates.js';
import noHardcodedFontSize from './rules/no-hardcoded-font-size.js';
import noLicenseCheckForFeatureGating from './rules/no-license-check-for-feature-gating.js';
import requireStaleTimeInUseQuery from './rules/require-staletime-in-usequery.js';
import requireSubscribeCleanup from './rules/require-subscribe-cleanup.js';
import requireSubscribeErrorHandler from './rules/require-subscribe-error-handler.js';
import commentLength from './rules/comment-length.js';
import noExternalRefInComment from './rules/no-external-ref-in-comment.js';
import noHistoryInComment from './rules/no-history-in-comment.js';
import noHedgeInComment from './rules/no-hedge-in-comment.js';
import noBannerComment from './rules/no-banner-comment.js';
import noObviousComment from './rules/no-obvious-comment.js';

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
    'no-license-check-for-feature-gating': noLicenseCheckForFeatureGating,
    'require-staletime-in-usequery': requireStaleTimeInUseQuery,
    'require-subscribe-cleanup': requireSubscribeCleanup,
    'require-subscribe-error-handler': requireSubscribeErrorHandler,
    'comment-length': commentLength,
    'no-external-ref-in-comment': noExternalRefInComment,
    'no-history-in-comment': noHistoryInComment,
    'no-hedge-in-comment': noHedgeInComment,
    'no-banner-comment': noBannerComment,
    'no-obvious-comment': noObviousComment,
  },
};

export default plugin;
