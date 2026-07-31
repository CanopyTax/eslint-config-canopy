# Require cleanup when an effect subscribes (require-subscribe-cleanup)

A subscription created in an effect and never torn down outlives the component.
It keeps firing after unmount, calls `setState` on something that no longer
exists, and holds a reference to the whole closure for the lifetime of the page.
Remounting the component subscribes again, so the leak compounds.

## Rule Details

This rule reports `useEffect` and `useLayoutEffect` callbacks that contain a
`.subscribe(...)` call in **their own scope** but return nothing.

Two deliberate limits keep it quiet and accurate:

**Any returned value satisfies the rule.** If the effect returns something, the
rule says nothing — it does not try to prove the returned function actually
unsubscribes. Attempting that proof is where false positives come from, and it
is unnecessary: most Canopy effects already unsubscribe correctly.

**Nested functions are not searched.** A `.subscribe()` inside an event handler
or a helper declared in the effect has a different lifetime, and the cleanup
function is itself nested. Not descending also catches a real bug class — a
cleanup returned from the wrong function:

```js
// Reported, correctly: the return belongs to the subscribe callback, not the
// effect, so nothing is ever cleaned up.
useEffect(() => {
  const obs = getStatuses().subscribe((statuses) => {
    setStatuses(statuses);
    return () => obs.unsubscribe();
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

A bare `return;` used as a guard clause does not count as cleanup, since it
returns no function.

## Current status in the Canopy ecosystem

Of the 493 files that combine `useEffect` with `.subscribe(`, this rule reports
**39 effects across 38 files**. The remaining 455 already clean up correctly, so
the rule aligns with how most Canopy code is already written.

## When Not To Use It

A subscription intended to live for the lifetime of the application — set up once
in a bootstrap effect that never unmounts — has no cleanup to return. Prefer
moving that subscription out of a component entirely; where that is not
practical, use a targeted `eslint-disable-next-line`.
