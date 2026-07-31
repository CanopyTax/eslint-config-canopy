# Disallow `Date` locale formatting for display (no-tolocalestring-for-dates)

`Date.prototype.toLocaleDateString()` and `toLocaleTimeString()` render according
to whatever the browser and OS decide, so the same timestamp appears differently
across users and cannot be relied on to match the rest of the product. Canopy
standardises date display on Luxon `DateTime` with a shared set of presets.

## Rule Details

This rule reports calls to `.toLocaleDateString()` and `.toLocaleTimeString()`,
and use of `Intl.DateTimeFormat` for formatting.

**`.toLocaleString()` is deliberately not reported.** Luxon's `DateTime` exposes
a method of exactly that name, and calling it with a preset —
`dt.toLocaleString(DateTime.DATE_SHORT)` — is the *correct* Canopy pattern.
Numbers also use `.toLocaleString()` for thousands separators. The two methods
this rule does report exist only on `Date` and have no Luxon counterpart, which
is what makes them unambiguous.

Examples of **incorrect** code for this rule:

```js
/*eslint canopy/no-tolocalestring-for-dates: "error"*/

date.toLocaleDateString();
new Date().toLocaleDateString();
d.toLocaleDateString("en-US", { month: "short" });
item.created_at.toLocaleTimeString();
new Intl.DateTimeFormat("en-US").format(date);
```

Examples of **correct** code for this rule:

```js
/*eslint canopy/no-tolocalestring-for-dates: "error"*/

import { DateTime } from "luxon";

DateTime.fromISO(value).toLocaleString(DateTime.DATE_SHORT);
DateTime.fromISO(value).toLocaleString(DateTime.DATE_MED);
DateTime.fromJSDate(date).toLocaleString(DateTime.TIME_SIMPLE);

// Not a date at all — thousands separators
amount.toLocaleString();
totalClientsCount.toLocaleString("en-US");

// Timezone detection, not formatting
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
```

`DateTime.DATE_SHORT` and `DateTime.DATE_MED` are the two most common presets in
the Canopy codebase; `DateTime.TIME_SIMPLE` covers times.

## Why `resolvedOptions()` is exempt

`Intl.DateTimeFormat().resolvedOptions()` reads the environment's timezone or
locale rather than formatting a value, and no date preset replaces it. Calls
whose result feeds `resolvedOptions()` are not reported.

## When Not To Use It

Code that must produce a specific non-Canopy format for an external consumer — a
CSV export or a third-party API payload — is formatting for a machine rather than
for display. Prefer Luxon's `toFormat()` there, and use a targeted
`eslint-disable-next-line` if the native method is genuinely required.
