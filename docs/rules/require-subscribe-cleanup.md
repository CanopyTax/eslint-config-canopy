# Require cleanup when an effect subscribes (require-subscribe-cleanup)

A subscription created in an effect and never torn down outlives the component.
It keeps firing after unmount, calls `setState` on something that no longer
exists, and holds a reference to the whole closure for the lifetime of the page.
Remounting the component subscribes again, so the leak compounds.

## Rule Details

This rule reports `useEffect` and `useLayoutEffect` callbacks that contain a
`.subscribe(...)` call in **their own scope** but return nothing.

Two deliberate limits keep it quiet and accurate:

**Any plausibly-callable return satisfies the rule.** The rule does not try to
prove the returned function actually unsubscribes — attempting that proof is where
false positives come from, and it is unnecessary, since most Canopy effects already
unsubscribe correctly. So `return cleanup` and `return makeCleanup(sub)` both count.

But React accepts only a function as a cleanup, so a returned literal, object,
array, `undefined`, or `void 0` cannot be one and does not count. That distinction
matters: treating any return as cleanup let a guard clause hide a real leak.

```js
// Reported. `return null` is a guard clause, not a cleanup, and the subscription
// below it is never torn down. This shape was live in communications-ui.
useEffect(() => {
  if (shouldDeleteDraft) return null;
  createDraft(id, payload).subscribe(onNext, onError);
}, [shouldDeleteDraft]);
```

**Nested functions are not searched.** A `.subscribe()` inside an event handler
or a helper declared in the effect has a different lifetime, and the cleanup
function is itself nested. Not descending also catches a real bug class — a
cleanup returned from the wrong function:

```js
// Reported, correctly: the return belongs to the subscribe callback, not the
// effect, so nothing is ever cleaned up.
useEffect(() => {
  let sub;
  sub = getStatuses().subscribe((statuses) => {
    setStatuses(statuses);
    return () => sub.unsubscribe();
  });
}, [deps]);
```

Examples of **incorrect** code for this rule:

```js
/*eslint canopy/require-subscribe-cleanup: "error"*/

useEffect(() => {
  const sub = obs.subscribe(onNext);
}, []);

useEffect(() => {
  obs.subscribe(onNext);
}, []);

useEffect(() => {
  if (id) {
    obs.subscribe(onNext);
  }
}, [id]);
```

Examples of **correct** code for this rule:

```js
/*eslint canopy/require-subscribe-cleanup: "error"*/

useEffect(() => {
  const sub = obs.subscribe(onNext);
  return () => sub.unsubscribe();
}, []);

useEffect(() => {
  const a = one.subscribe(f);
  const b = two.subscribe(g);
  return () => {
    a.unsubscribe();
    b.unsubscribe();
  };
}, []);

// A guard clause plus a cleanup
useEffect(() => {
  if (!id) return;
  const sub = obs.subscribe(onNext);
  return () => sub.unsubscribe();
}, [id]);

// The subscribe lives in a function the effect calls, so its lifetime is not
// visible here and the rule stays silent.
useEffect(() => {
  fetchTasks();
}, []);
```

A bare `return;` used as a guard clause does not count as cleanup either, since it
returns no function.

A concise arrow body that is itself the subscribe call — `useEffect(() =>
obs.subscribe(onNext), [])` — is reported. It returns the Subscription, and React
warns that an effect may return only a function or undefined, so it is both a leak
and a React error.

The effect callback is unwrapped through TypeScript casts, so
`useEffect((() => { ... }) as any, [])` is still checked.

Not detected: a computed call (`obs['subscribe'](fn)`).

## Current status in the Canopy ecosystem

Of the 493 files that combine `useEffect` with `.subscribe(`, this rule reports
**40 effects across 39 files**. The remaining 454 already clean up correctly, so the
rule aligns with how most Canopy code is already written.

The traversal has been exercised against 767 real effect bodies across 445 files
under both the default and TypeScript parsers with no revisits or crashes. The
largest real effect body is 357 nodes; espree's own parser overflows on deep nesting
before the walk does.

## When Not To Use It

A subscription intended to live for the lifetime of the application — set up once
in a bootstrap effect that never unmounts — has no cleanup to return. Prefer
moving that subscription out of a component entirely; where that is not
practical, use a targeted `eslint-disable-next-line`.
