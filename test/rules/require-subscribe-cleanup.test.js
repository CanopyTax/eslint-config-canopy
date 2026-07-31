import { RuleTester } from 'eslint';
import rule from '../../plugin/rules/require-subscribe-cleanup.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('require-subscribe-cleanup', rule, {
  valid: [
    // The canonical shape
    {
      code: `useEffect(() => {
        const sub = obs.subscribe(onNext);
        return () => sub.unsubscribe();
      }, []);`,
    },
    // Any returned cleanup satisfies the rule — the rule does not try to prove it
    // actually unsubscribes, which is where false positives would come from.
    {
      code: `useEffect(() => {
        const sub = obs.subscribe(onNext);
        return cleanup;
      }, []);`,
    },
    {
      code: `useEffect(() => {
        const a = one.subscribe(f);
        const b = two.subscribe(g);
        return () => { a.unsubscribe(); b.unsubscribe(); };
      }, []);`,
    },
    // Guard clause before subscribing, still returns a cleanup
    {
      code: `useEffect(() => {
        if (!id) return;
        const sub = obs.subscribe(onNext);
        return () => sub.unsubscribe();
      }, [id]);`,
    },
    // No subscription in the effect at all
    { code: `useEffect(() => { doThing(); }, []);` },
    { code: `useEffect(() => { setState(1); }, []);` },
    // Subscribing outside an effect is a different concern
    { code: `const sub = obs.subscribe(onNext);` },
    { code: `function load() { obs.subscribe(onNext); }` },
    // The subscribe happens inside a function called by the effect, so its lifetime
    // is not visible here.
    { code: `useEffect(() => { fetchTasks(); }, []);` },
    // A concise arrow body returns the subscription, so the effect does return
    // something; the rule stays conservative and silent.
    { code: `useEffect(() => obs.subscribe(onNext), []);` },
    // A subscribe inside a nested handler is not the effect's own subscription
    {
      code: `useEffect(() => {
        const handler = () => obs.subscribe(onNext);
        el.addEventListener("click", handler);
        return () => el.removeEventListener("click", handler);
      }, []);`,
    },
    // Not an effect
    { code: `useMemo(() => obs.subscribe(onNext), []);` },
  ],
  invalid: [
    {
      code: `useEffect(() => {
        const sub = obs.subscribe(onNext);
      }, []);`,
      errors: [{ messageId: 'missingCleanup' }],
    },
    {
      code: `useEffect(() => {
        obs.subscribe(onNext);
      }, []);`,
      errors: [{ messageId: 'missingCleanup' }],
    },
    // Function expression form
    {
      code: `useEffect(function () {
        const sub = obs.subscribe(onNext);
      }, []);`,
      errors: [{ messageId: 'missingCleanup' }],
    },
    // Nested inside a block, still the effect's own subscription
    {
      code: `useEffect(() => {
        if (id) {
          obs.subscribe(onNext);
        }
      }, [id]);`,
      errors: [{ messageId: 'missingCleanup' }],
    },
    // React.useEffect member form
    {
      code: `React.useEffect(() => {
        obs.subscribe(onNext);
      }, []);`,
      errors: [{ messageId: 'missingCleanup' }],
    },
    // useLayoutEffect has the same lifecycle contract
    {
      code: `useLayoutEffect(() => {
        obs.subscribe(onNext);
      }, []);`,
      errors: [{ messageId: 'missingCleanup' }],
    },
  ],
});
