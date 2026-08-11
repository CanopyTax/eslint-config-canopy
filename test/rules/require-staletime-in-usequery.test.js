import { RuleTester } from 'eslint';
import rule from '../../plugin/rules/require-staletime-in-usequery.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('require-staletime-in-usequery', rule, {
  valid: [
    // staleTime present
    { code: `useQuery({ queryKey: ["a"], queryFn: fn, staleTime: 5000 });` },
    { code: `useQuery({ queryKey, queryFn, staleTime: Infinity });` },
    { code: `useQuery({ queryKey, queryFn, staleTime });` },
    { code: `useInfiniteQuery({ queryKey, queryFn, staleTime: 0 });` },
    // A spread may carry staleTime — this is the genQueries pattern and cannot be
    // resolved syntactically.
    { code: `useQuery({ ...clientQueries.getClient(id) });` },
    { code: `useQuery({ ...getCreditsStatusQuery(), enabled: true });` },
    { code: `useQuery({ ...base, queryKey });` },
    // The dominant Canopy shape: options come from a query factory call.
    { code: `useQuery(clientQueries.getClient(id));` },
    { code: `useQuery(getLetterTemplatesQuery());` },
    // Non-literal options
    { code: `useQuery(options);` },
    { code: `useQuery(buildOptions(id));` },
    // Legacy positional signature
    { code: `useQuery(["key"], fn);` },
    { code: `useQuery(["key"], fn, { staleTime: 1000 });` },
    // No arguments at all
    { code: `useQuery();` },
    // A different hook
    { code: `useMutation({ mutationFn: fn });` },
    { code: `useSomethingElse({ queryKey, queryFn });` },
    // The member-callee path, satisfied
    { code: `reactQuery.useQuery({ queryKey, queryFn, staleTime: 1000 });` },
    // Apollo's signature puts the document first, so there is no options literal
    // in position 0 and nothing to check.
    { code: `useQuery(GET_DOGS, { variables: { breed } });` },
  ],
  invalid: [
    {
      code: `useQuery({ queryKey: ["a"], queryFn: fn });`,
      errors: [{ messageId: 'missingStaleTime', data: { hook: 'useQuery' } }],
    },
    {
      code: `useQuery({ queryKey, queryFn, enabled: true });`,
      errors: [{ messageId: 'missingStaleTime', data: { hook: 'useQuery' } }],
    },
    {
      code: `useInfiniteQuery({ queryKey, queryFn, getNextPageParam: fn });`,
      errors: [{ messageId: 'missingStaleTime', data: { hook: 'useInfiniteQuery' } }],
    },
    {
      code: `const { data } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });`,
      errors: [{ messageId: 'missingStaleTime', data: { hook: 'useQuery' } }],
    },
    // A computed key that is not staleTime does not satisfy the requirement.
    {
      code: `useQuery({ queryKey, queryFn, ["enabled"]: true });`,
      errors: [{ messageId: 'missingStaleTime', data: { hook: 'useQuery' } }],
    },
    // The member-callee path reports too.
    {
      code: `reactQuery.useQuery({ queryKey, queryFn });`,
      errors: [{ messageId: 'missingStaleTime', data: { hook: 'useQuery' } }],
    },
    // A computed key holding a variable named staleTime is not the staleTime option.
    {
      code: `useQuery({ queryKey, queryFn, [staleTime]: x });`,
      errors: [{ messageId: 'missingStaleTime', data: { hook: 'useQuery' } }],
    },
  ],
});
