// Native fields are matched by tag; Understory fields by their root name, so
// subcomponents such as `CpInput.Email` and `CpInputField.PhoneNumber` count too.
const NATIVE_FIELDS = new Set(['input', 'textarea']);
const UNDERSTORY_FIELDS = new Set([
  'CpInput',
  'CpInputField',
  'CpTextarea',
  'CpTextareaField',
  'CpSelectSingle',
  'CpSelectSingleField',
  'CpSelectMulti',
  'CpSelectMultiField',
  'CpSelectMultiInput',
  'CpSelectMultiInputField',
  'CpSelectMultiPills',
  'CpSelectMultiPillsField',
]);

const TRAILING_ELLIPSIS_RE = /\s*(?:\.{3}|…)\s*$/;

// Punctuation that can wrap a word without making it something other than a word.
const WRAPPING_PUNCTUATION_RE = /^["'“‘(]+|["'”’),;:.?!]+$/g;
// Letters with optional apostrophes or hyphens. Anything else (an email, a date
// mask, a number) is example data, not prose, and is left alone.
const PLAIN_WORD_RE = /^[A-Za-z]+(?:['’-][A-Za-z]+)*$/;

function fieldName(nameNode) {
  if (nameNode.type === 'JSXIdentifier') return nameNode.name;
  if (nameNode.type === 'JSXMemberExpression') return fieldName(nameNode.object);
  return undefined;
}

function isTextField(openingElement) {
  const name = fieldName(openingElement.name);
  return NATIVE_FIELDS.has(name) || UNDERSTORY_FIELDS.has(name);
}

// Only placeholders written out in source can be checked; a variable or a
// translation call is not statically resolvable.
function staticPlaceholder(valueNode) {
  if (!valueNode) return undefined;
  if (valueNode.type === 'Literal' && typeof valueNode.value === 'string') {
    return { node: valueNode, text: valueNode.value };
  }
  if (valueNode.type !== 'JSXExpressionContainer') return undefined;

  const { expression } = valueNode;
  if (expression.type === 'Literal' && typeof expression.value === 'string') {
    return { node: expression, text: expression.value };
  }
  if (expression.type === 'TemplateLiteral' && expression.expressions.length === 0) {
    return { node: expression, text: expression.quasis[0].value.cooked ?? '' };
  }
  return undefined;
}

function letters(word) {
  return word.replace(/['’-]/g, '');
}

const isLowercase = (word) => letters(word) === letters(word).toLowerCase();
// `Task` is title case; `ID` (an acronym) and `QuickBooks` (a mixed-case name) are not.
const isTitleCase = (word) => {
  const rest = letters(word).slice(1);
  return /^[A-Z]/.test(word) && rest.length > 0 && rest === rest.toLowerCase();
};

// Returns the sentence-cased text, or undefined when the text already is.
function sentenceCased(text, allowWords) {
  const words = text.split(/(\s+)/);
  let changed = false;
  let startsSentence = true;

  const result = words.map((token, index) => {
    if (/^\s*$/.test(token)) return token;
    const isLast = !words.slice(index + 1).some((t) => t.trim());

    const word = token.replace(WRAPPING_PUNCTUATION_RE, '');
    const atSentenceStart = startsSentence;
    startsSentence = /[.?!]["'”’)]*$/.test(token);

    if (!PLAIN_WORD_RE.test(word) || allowWords.has(word)) return token;

    if (atSentenceStart) {
      if (!isLowercase(word)) return token;
      changed = true;
      return token.replace(word, word[0].toUpperCase() + word.slice(1));
    }

    // A capital `A` before another word is the article; at the end it is more
    // likely a label, as in `Plan A`.
    const isArticle = word === 'A' && !isLast;
    if (!isArticle && !isTitleCase(word)) return token;
    changed = true;
    return token.replace(word, word.toLowerCase());
  });

  return changed ? result.join('') : undefined;
}

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require input, textarea and select placeholders to be sentence case with no trailing ellipsis, on native fields and Understory CpInput / CpTextarea / CpSelect* and their Field variants.',
      url: 'https://github.com/CanopyTax/eslint-config-canopy/blob/master/docs/rules/placeholder-format.md',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          allowWords: { type: 'array', items: { type: 'string' }, uniqueItems: true },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      trailingEllipsis: 'Placeholder "{{text}}" ends in an ellipsis. Drop it: "{{expected}}".',
      notSentenceCase: 'Placeholder "{{text}}" is not sentence case. Use "{{expected}}".',
    },
  },

  create(context) {
    const allowWords = new Set(context.options[0]?.allowWords ?? []);
    const { sourceCode } = context;

    function reportEllipsis(node, text) {
      const expected = text.replace(TRAILING_ELLIPSIS_RE, '');
      const raw = sourceCode.getText(node);
      const quote = raw[0];
      const inner = raw.slice(1, -1);
      // Skip the fix when the source spells the ellipsis with an escape, or when
      // removing it would leave an empty placeholder.
      const canFix = expected.length > 0 && TRAILING_ELLIPSIS_RE.test(inner);

      context.report({
        node,
        messageId: 'trailingEllipsis',
        data: { text, expected },
        fix: canFix
          ? (fixer) => fixer.replaceText(node, quote + inner.replace(TRAILING_ELLIPSIS_RE, '') + quote)
          : null,
      });
    }

    return {
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'placeholder') return;
        if (!isTextField(node.parent)) return;

        const placeholder = staticPlaceholder(node.value);
        if (!placeholder) return;
        const { node: valueNode, text } = placeholder;

        if (TRAILING_ELLIPSIS_RE.test(text)) reportEllipsis(valueNode, text);

        // Case is checked on the text without its ellipsis, so the two messages
        // stay independent and each suggests only its own change.
        const prose = text.replace(TRAILING_ELLIPSIS_RE, '');
        const expected = sentenceCased(prose, allowWords);
        if (expected) {
          context.report({ node: valueNode, messageId: 'notSentenceCase', data: { text: prose, expected } });
        }
      },
    };
  },
};
