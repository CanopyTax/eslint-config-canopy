// A directive configures a tool instead of explaining code, so only the reason
// attached to it is prose. ESLint reads inline config and globals only from
// block comments; disable/enable directives work in both forms.
const ANY_DIRECTIVE_RE = /^(?:eslint-disable(?:-next-line|-line)?|eslint-enable|prettier-ignore|istanbul|c8)(?:\s|$)/;
const BLOCK_DIRECTIVE_RE = /^(?:eslint|globals?|exported)(?:\s|$)/;
const TS_DIRECTIVE_RE = /^@ts-[\w-]+\s*/;

function proseOf(comment) {
  const text = comment.value.trim();
  if (TS_DIRECTIVE_RE.test(text)) return text.replace(TS_DIRECTIVE_RE, '');
  const isDirective =
    ANY_DIRECTIVE_RE.test(text) || (comment.type === 'Block' && BLOCK_DIRECTIVE_RE.test(text));
  if (!isDirective) return text;
  const reasonAt = text.indexOf(' -- ');
  return reasonAt === -1 ? '' : text.slice(reasonAt + 4).trim();
}

export function getContentText(group) {
  return group.comments.map(proseOf).filter(Boolean).join(' ');
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function phraseMatcher(phrases) {
  const patterns = phrases.map((phrase) => [
    phrase,
    new RegExp(`(?<![a-z0-9])${escapeRegExp(phrase.toLowerCase())}(?![a-z0-9])`),
  ]);
  return (text) => {
    const lower = text.toLowerCase();
    return patterns.find(([, pattern]) => pattern.test(lower))?.[0];
  };
}
