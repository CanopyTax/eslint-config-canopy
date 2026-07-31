# Disallow reading auth state off `window` (no-window-auth-globals)

`window.loggedInUser`, `window.tenant`, and `window.betas` are populated once
during app bootstrap. Reading them gives you a snapshot with two problems: it is
`undefined` for any code that runs before auth resolves, and it never updates
afterwards — so a tenant switch or a beta toggle leaves your component rendering
stale data with no re-render.

`cp-client-auth` exposes the same state through subscriptions that resolve
correctly and re-render on change.

## Rule Details

This rule reports **reads** of these three properties on `window`, in every form
they appear: dot access, optional chaining, computed access with a string
literal, and destructuring off `window`.

Writes are deliberately **not** reported. Assigning these globals is how app
bootstraps, `cp-client-auth` itself, and test mocks populate them in the first
place, so flagging writes would fire on the very code that makes them work.

Examples of **incorrect** code for this rule:

```js
/*eslint canopy/no-window-auth-globals: "error"*/

const user = window.loggedInUser;
const tenantId = window.tenant.id;
const name = window?.loggedInUser?.name;
const { betas, tenant } = window;

if (window.betas.someFlag) {
  renderNewThing();
}
```

Examples of **correct** code for this rule:

```js
/*eslint canopy/no-window-auth-globals: "error"*/

import { useWithUserAndTenant, useBetas } from "cp-client-auth!sofe";

const { user, tenant } = useWithUserAndTenant();
const betas = useBetas();

// Writes are fine — this is how the globals get set.
window.loggedInUser = user;
window.tenant = tenant;
```

For class components, use the `UserTenantProps` decorator instead of
`useWithUserAndTenant()`.

## When Not To Use It

Disable this rule in `cp-client-auth` itself, which necessarily reads these
globals to implement the hooks that replace them. A file-level
`/* eslint-disable canopy/no-window-auth-globals */` is the right escape hatch
there.

Code running outside a React tree — bootstrap and root-config modules that have
no component to hold a hook — may also need to read the globals directly. Prefer
the RxJS observables from `cp-client-auth` where you can, and reach for a
targeted `eslint-disable-next-line` where you cannot.
