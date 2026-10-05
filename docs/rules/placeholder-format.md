# Require sentence-case placeholders with no trailing ellipsis (placeholder-format)

This is a design-system rule. It is enabled at `warn` by the opt-in
`eslint-config-canopy/design-system` export, not by the base config.

Canopy's placeholder copy is sentence case, like `Describe a task`, and does not
end in an ellipsis. `Search...` and `Describe A Task` both break the convention.

## Rule Details

This rule checks the `placeholder` attribute on:

- the native `<input>` and `<textarea>` elements
- Understory's `CpInput`, `CpInputField`, `CpTextarea` and `CpTextareaField`,
  including subcomponents such as `CpInput.Email` and `CpInputField.PhoneNumber`

It reports:

1. **A trailing ellipsis**, written as `...` or `…`. This is auto-fixable. The fix
   removes the ellipsis and any whitespace before it.
2. **Text that is not sentence case.** That means a first word in lowercase, or a
   later word in title case (`Task`). The message suggests the sentence-case
   version. There is no auto-fix, because the rule cannot tell a proper noun from
   a capitalized word.

The two checks are independent, so `Search Clients...` gets both reports.

Examples of **incorrect** code for this rule:

```jsx
/*eslint canopy/placeholder-format: "warn"*/

<input placeholder="Search..." />;
<textarea placeholder="Add a note…" />;
<CpInput placeholder="Describe A Task" />;
<CpInputField placeholder="describe a task" />;
<CpTextarea placeholder={"Search Clients..."} />;
<CpInput.Email placeholder="Enter Email Address" />;
```

Examples of **correct** code for this rule:

```jsx
/*eslint canopy/placeholder-format: "warn"*/

<CpInput placeholder="Describe a task" />;
<CpInput placeholder="Search" />;

// Acronyms and mixed-case names keep their capitals
<CpInput placeholder="Search by ID" />;
<CpInput placeholder="Connect to QuickBooks" />;

// Example values are not prose
<CpInput placeholder="name@example.com" />;
<CpInput placeholder="MM/DD/YYYY" />;

// A new sentence starts with a capital
<CpTextarea placeholder="Optional. Add a note" />;

// Not statically resolvable
<CpInput placeholder={label} />;
<CpInput placeholder={t("search")} />;
```

## Options

### `allowWords`

Words that may be capitalized anywhere, such as product or company names.

```javascript
"canopy/placeholder-format": ["warn", { allowWords: ["Canopy", "Stripe"] }]
```

## What is not reported

- **Words that are not plain words.** Only letters with optional apostrophes or
  hyphens are checked. Emails, date masks, numbers and currency are left alone.
- **All-caps and mixed-case words.** `ID`, `EIN` and `QuickBooks` are not title
  case. `I` is allowed, and so is a single capital letter at the end of the text,
  as in `Plan A`.
- **Dynamic placeholders.** Variables, translation calls and template literals
  with expressions cannot be resolved.
- **Other components.** Selects and date pickers have their own placeholder
  patterns and are not checked.

## When Not To Use It

If a field's placeholder must show a proper noun the rule flags, add the word to
`allowWords` instead of turning the rule off.
