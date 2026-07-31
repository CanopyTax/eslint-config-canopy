# Require an error handler on `.subscribe()` (require-subscribe-error-handler)

An observable that errors with no error handler attached fails silently. Nothing
reaches Sentry, no toast appears, and the UI sits on a spinner or stale data with
no indication anything went wrong. RxJS also treats an unhandled error as a
crash of that subscription, so the stream stops without notice.

## Rule Details

This rule reports `.subscribe(...)` calls that supply an **inline** value handler
but no error handler. An error handler counts when it is:

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

**A handler passed by reference is also not reported** — `obs.subscribe(onNext)`
stays silent. This is deliberate. Real Pusher code passes the channel name as a
variable (`pusher.subscribe(channelName)`, `pusher.subscribe(this.props.channelId)`),
and an observer passed by reference (`obs.subscribe(observer)`) looks identical.
None of the three can be told apart without type information, so only an inline
function — which cannot be anything but a callback — is treated as a value handler.
That trades some recall for precision. Of the 554 single-argument `.subscribe()`
calls in the ecosystem, 420 pass an inline function and are still checked, 73 pass a
reference and are now left alone, and the remaining 61 are observer objects or other
expressions.

## Known limitation: `.subscribe` is not unique to RxJS

Without type information the rule cannot prove a receiver is an Observable, and
several unrelated libraries expose a `.subscribe(listener)` method with no
error-handler concept. Where those libraries are passed an **inline** function they
are still reported:

| Shape | Count | Library |
| --- | --- | --- |
| `someStore.subscribe(fn)` | 7 | Zustand / Redux |
| `animate.subscribe(fn)`, `dragControls.subscribe(fn)` | 4 | framer-motion |

Pusher is fully excluded, both the literal and the variable channel-name forms.
For the store and motion cases, use a targeted `eslint-disable-next-line` or
disable the rule for the files that own those subscriptions.

Also not reported, all under-reporting rather than noise: an observer object plus a
second argument (`obs.subscribe({ next }, extra)`), a computed call
(`obs['subscribe'](fn)`), and a spread (`obs.subscribe(...handlers)`). A receiver
chain that handles errors upstream via `catchError` would be reported, but there
are no such call sites in the ecosystem today.

## Current status in the Canopy ecosystem

Across 1,084 files that call `.subscribe(`, this rule reports **446 findings in
273 files**. Roughly 11 of those are the non-RxJS shapes above, so the great
majority are real: observables whose errors are being dropped.

That volume is the reason this rule sits at the top of the stack. It is accurate,
but adopting it at `error` across a repo means a large cleanup. Starting at `warn`
and fixing opportunistically is the practical path.

## When Not To Use It

Files whose `.subscribe` calls belong to a store or animation library, as above.
For genuinely fire-and-forget streams where an error is acceptable, pass an
explicit no-op error handler rather than omitting one, so the intent is recorded.
