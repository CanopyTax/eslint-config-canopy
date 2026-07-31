# Disallow raw `fetch()` and `axios` (no-raw-fetch)

Canopy's `fetcher` wraps the network layer with things every request in the app
needs: auth headers, the CSRF token, tenant context, error routing through
`error-logging`, Sentry breadcrumbs, and the shared React Query cache. A raw
`fetch()` or an `axios` client gets none of it, so failures bypass the toast and
Sentry pipeline and requests may be rejected for a missing token.

## Rule Details

This rule reports:

- calls to the ambient global `fetch(...)`
- `window.fetch(...)` and the `globalThis` / `self` / `global` equivalents
- `import ... from "axios"` and `require("axios")`

A `fetch` that resolves to a local function or an import — a `node-fetch` shim, a
polyfill, a variable named `fetch` — has a definition in scope and is **not**
reported. Only the ambient global counts. A `.fetch()` method on an object
(`resource.fetch()`, `queryClient.fetchQuery()`) is unrelated and is left alone.

Examples of **incorrect** code for this rule:

```js
/*eslint canopy/no-raw-fetch: "error"*/

fetch("/api/clients");
fetch(url, { method: "POST", body });
const res = await fetch("/api/x");
window.fetch("/api/x");

import axios from "axios";
const axios = require("axios");
```

Examples of **correct** code for this rule:

```js
/*eslint canopy/no-raw-fetch: "error"*/
import fetcher, { fetchAsObservable } from "fetcher!sofe";

fetcher.get("/api/clients");
fetchAsObservable("/api/x");

// A `fetch` method on an object is not the global
resource.fetch();
queryClient.fetchQuery({ queryKey });

// Tests installing a mock
window.fetch = jest.fn();

// An explicit non-browser client
import nodeFetch from "node-fetch";
nodeFetch("/api/x");
```

## Known limitation: this rule cannot tell a browser from a Node process

`fetcher` exists for the browser. It is not the right client in a Node process, and
a lint rule has no way to tell the two apart.

Measured across the Canopy repos, this rule finds 132 issues in 67 files, and the
distribution shows the problem plainly:

| Repo | Files | Should the rule apply? |
| --- | --- | --- |
| `frontend-node-server` | 45 | **No** — a Node server, where `fetch()` is correct |
| `fetcher` | 2 | **No** — it is the library that wraps `fetch` |
| `backend` | 2 | **No** — server-side |
| browser microfrontends | ~18 | Yes |

Because two thirds of its raw findings come from packages that should not enable it
at all, **this rule is not turned on by the shared `eslint-config-canopy` config.**
It is the only rule in the plugin that ships off by default.

Browser microfrontends opt in explicitly:

```javascript
import canopyConfig from "eslint-config-canopy";
import canopyPlugin from "eslint-config-canopy/plugin";

export default [
  ...canopyConfig,
  {
    plugins: { canopy: canopyPlugin },
    rules: { "canopy/no-raw-fetch": "warn" },
  },
];
```

In browser code the ~18 genuine files are worth fixing. Do not enable it in
`frontend-node-server`, `fetcher`, `backend`, or any other server-side package.

## When Not To Use It

Any Node or build-time code. Also service workers and other contexts where
`fetcher` and the sofe runtime are not available.
