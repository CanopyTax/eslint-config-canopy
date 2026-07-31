# Require an error handler on `.subscribe()` (require-subscribe-error-handler)

An observable that errors with no error handler attached fails silently. Nothing
reaches Sentry, no toast appears, and the UI sits on a spinner or stale data with
no indication anything went wrong. RxJS also treats an unhandled error as a
crash of that subscription, so the stream stops without notice.

## Rule Details

This rule reports `.subscribe(...)` calls that supply a value handler but no
error handler. An error handler counts when it is:

- a second positional argument — `obs.subscribe(onNext, handleError)`
- an `error` key in an observer object — `obs.subscribe({ next, error })`
- carried by a spread into the observer — `obs.subscribe({ ...observer })`

Examples of **incorrect** code for this rule:

```js
/*eslint canopy/require-subscribe-error-handler: "error"*/

obs.subscribe(onNext);
obs.subscribe((x) => setState(x));
obs.pipe(map(f)).subscribe((x) => use(x));
getClient(id).subscribe((client) => setClient(client));
obs.subscribe({ next: onNext });
obs.subscribe({ next: onNext, complete: onDone });
```

Examples of **correct** code for this rule:

```js
/*eslint canopy/require-subscribe-error-handler: "error"*/
import { handleError } from "error-logging!sofe";

obs.subscribe(onNext, handleError);
obs.subscribe((x) => setState(x), handleError);
obs.subscribe({ next: onNext, error: handleError });
obs.subscribe(resolve, reject);

// Pusher-style channel subscription: a literal is a channel name, not a handler
pusher.subscribe("presence-tenant-1");
```

A bare `obs.subscribe()` is not reported. It handles nothing at all, so there is
no partial-handling mistake to point at.

## Known limitation: `.subscribe` is not unique to RxJS

Without type information the rule cannot prove a receiver is an Observable, and
several unrelated libraries expose a `.subscribe(listener)` method that has no
error-handler concept. In the Canopy ecosystem these are:

| Shape | Count | Library |
| --- | --- | --- |
| `someStore.subscribe(fn)` | 7 | Zustand / Redux |
| `animate.subscribe(fn)`, `dragControls.subscribe(fn)` | 4 | framer-motion |

Calls with a **literal** argument are already excluded, which covers Pusher's
`pusher.subscribe("channel")`. The store and motion cases above are genuine false
positives; use a targeted `eslint-disable-next-line` or disable the rule for the
files that own those subscriptions.

## Current status in the Canopy ecosystem

Across 1,084 files that call `.subscribe(`, this rule reports **519 findings in
297 files**. Roughly 11 of those are the non-RxJS shapes above, so the great
majority are real: observables whose errors are being dropped.

That volume is the reason this rule sits at the top of the stack. It is accurate,
but adopting it at `error` across a repo means a large cleanup. Starting at `warn`
and fixing opportunistically is the practical path.

## When Not To Use It

Files whose `.subscribe` calls belong to a store or animation library, as above.
For genuinely fire-and-forget streams where an error is acceptable, pass an
explicit no-op error handler rather than omitting one, so the intent is recorded.
