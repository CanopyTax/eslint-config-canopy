# Disallow license checks for feature gating (no-license-check-for-feature-gating)

A license says what the firm bought. A permission says what this user is allowed
to do. Gating a feature on `hasLicense()` shows it to everyone at a licensed firm
regardless of their role, and hides it from users whose access was granted some
other way. `useHasAccess()` answers the question the UI is actually asking.

## Rule Details

This rule reports `hasLicense()` **only when its result is used as a condition**:

- the test of an `if`, ternary, `while`, or `do...while`
- an operand of `&&` or `||`, wherever that expression ends up — `cond && <Feature />`
  gates rendering just as much as an `if` does. `??` is **not** included: it supplies
  a fallback value rather than gating.
- either of the above behind a `!`

Reading license state for any other purpose is legitimate and is **not** reported.
Seat counts, billing logic, and reporting license state to analytics all need the
value itself rather than a gate.

The rule keys on the **import**, not the bare name: only `hasLicense` imported
from `cp-client-auth` (or `cp-client-auth!sofe`) is considered, including aliased
imports. At least one Canopy app defines its own `hasLicense` helper with a
different signature, and that one is left alone.

The identifier is also resolved through scope, so a parameter or local variable
named `hasLicense` shadowing the import is not reported.

Not currently detected: a namespace or default import used as a member call
(`import * as auth from "cp-client-auth!sofe"; auth.hasLicense(...)`), and
`hasLicense?.(...)`. Both are false negatives rather than false positives.

Examples of **incorrect** code for this rule:

```jsx
/*eslint canopy/no-license-check-for-feature-gating: "error"*/
import { hasLicense } from "cp-client-auth!sofe";

if (hasLicense(type, licenses)) {
  showFeature();
}

function Component() {
  if (!hasLicense(type, licenses)) return null;
}

const el = hasLicense(type, licenses) ? <Feature /> : null;
const el = hasLicense(type, licenses) && <Feature />;
<div>{hasLicense(type, licenses) && <Feature />}</div>;
```

Examples of **correct** code for this rule:

```jsx
/*eslint canopy/no-license-check-for-feature-gating: "error"*/
import { useHasAccess, hasLicense } from "cp-client-auth!sofe";

// Gate on permission
if (useHasAccess("tasks_create")) {
  showFeature();
}

// Reading license state for its value, not as a gate
const licensed = hasLicense(type, licenses);
track({ licensed: hasLicense(type, licenses) });

export function checkLicense(t, l) {
  return hasLicense(t, l);
}
```

## Current status in the Canopy ecosystem

At the time this rule was written there were **no violations** across the Canopy
frontend repos. Every existing `hasLicense` reference is the definition, its
tests, the test mock, a helper returning the value, or analytics reporting.

This rule is therefore a **preventive guard** rather than a cleanup tool: it stops
the anti-pattern from being introduced, and it is expected to stay quiet. That is
the intended outcome, not a sign it is misconfigured.

## When Not To Use It

Disable it in `cp-client-auth`, which defines and tests `hasLicense`, and in
billing or seat-management code where an entitlement check genuinely is the
question being asked.
