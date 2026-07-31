# Require an explicit `staleTime` (require-staletime-in-usequery)

React Query treats data as stale immediately by default, so a query with no
`staleTime` refetches every time a component mounts. In the single-spa shell that
means a refetch on every navigation into the microfrontend, even when the data was
fetched seconds earlier.

## Rule Details

This rule reports `useQuery` and `useInfiniteQuery` calls whose **first argument
is an object literal** that has neither a `staleTime` property nor a spread.

Three shapes are deliberately not reported, because the options are not visible to
a syntactic check:

- **A query factory call** — `useQuery(clientQueries.getClient(id))`. This is the
  dominant Canopy pattern, and the factory sets `staleTime` itself.
- **A spread** — `useQuery({ ...clientQueries.getClient(id), enabled })`. The
  spread may well supply `staleTime`, and the rule cannot know.
- **The legacy positional signature** — `useQuery(["key"], fn)`.

Examples of **incorrect** code for this rule:

```js
/*eslint canopy/require-staletime-in-usequery: "error"*/

useQuery({ queryKey: ["a"], queryFn: fn });
useQuery({ queryKey, queryFn, enabled: true });
useInfiniteQuery({ queryKey, queryFn, getNextPageParam: fn });
```

Examples of **correct** code for this rule:

```js
/*eslint canopy/require-staletime-in-usequery: "error"*/

useQuery({ queryKey: ["a"], queryFn: fn, staleTime: 5000 });
useQuery({ queryKey, queryFn, staleTime: Infinity });

// Options come from a query factory, which sets staleTime
useQuery(clientQueries.getClient(id));
useQuery({ ...clientQueries.getClient(id), enabled: !!id });
```

## Why the rule matches on name rather than import

`useQuery` is not unique to React Query — urql and tRPC expose hooks of the same
name, and a `someObject.useQuery({...})` call matches the member form. Keying the
rule to a React Query import would remove that risk.

It is not worth it here. Of the 272 `useQuery` import sites across the Canopy repos,
**267 resolve through a local re-export path** — `src/react-query`, or a relative
`../react-query`. Exactly **one** imports `@tanstack/react-query` directly, and
**four** import from `fetcher!sofe`. Keying on the published package would therefore
silence 271 of 272 call sites, and an allowlist would have to enumerate per-repo
relative paths that differ between repos.

Meanwhile the competing libraries are absent: `@apollo/client`, `urql`, `@trpc/react`
and `react-query` each appear in **zero** files across the Canopy repos. Apollo's
signature would not collide anyway, since it passes the document first
(`useQuery(GET_DOGS, {...})`) and leaves no options literal in position 0.

If a repo does adopt one of those libraries, disable this rule there.

## Current status in the Canopy ecosystem

Across 228 files using these hooks there is **one** violation. Canopy code almost
always passes options from a query factory, which is the pattern this rule is
designed to leave alone.

The rule is therefore close to a preventive guard: it catches a hand-rolled
options object that forgets `staleTime`, and stays quiet on the established
pattern.

## When Not To Use It

A query that genuinely must refetch on every mount — a live status poll, say —
should say so explicitly with `staleTime: 0` rather than by omission. That
satisfies this rule and documents the intent, so there is rarely a reason to
disable it.
