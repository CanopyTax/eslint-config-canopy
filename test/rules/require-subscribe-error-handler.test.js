import { RuleTester } from 'eslint';
import rule from '../../plugin/rules/require-subscribe-error-handler.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('require-subscribe-error-handler', rule, {
  valid: [
    // Positional error handler
    { code: `obs.subscribe(onNext, onError);` },
    { code: `obs.subscribe(onNext, handleError);` },
    { code: `obs.subscribe(onNext, onError, onComplete);` },
    { code: `obs.subscribe(resolve, reject);` },
    { code: `obs.subscribe((x) => setState(x), handleError);` },
    // Observer object with an error key
    { code: `obs.subscribe({ next: onNext, error: handleError });` },
    { code: `obs.subscribe({ next, error });` },
    { code: `obs.subscribe({ error: handleError });` },
    { code: `obs.subscribe({ next, error, complete });` },
    { code: `obs.subscribe({ ...observer });` },
    // No arguments: nothing is being handled, and RxJS allows it for side-effect
    // only streams. Reporting it would add noise without pointing at a fix.
    { code: `obs.subscribe();` },
    // Not a member call named subscribe
    { code: `subscribe(onNext);` },
    { code: `obs.pipe(map(f)).forEach(onNext);` },
    // A literal argument is a channel or topic name, not a handler — Pusher's
    // `pusher.subscribe("channel")` shape.
    { code: `pusher.subscribe("presence-tenant-1");` },
    { code: `pusher.subscribe(\`client-\${id}\`);` },
    // Real Pusher code passes the channel name as a variable, so an argument that
    // is merely a reference cannot be assumed to be a handler.
    { code: `pusher.subscribe(channelName);` },
    { code: `pusher.subscribe(channel.name);` },
    { code: `pusher.subscribe(this.props.channelId);` },
    // An observer passed by reference is indistinguishable from the above.
    { code: `obs.subscribe(observer);` },
    { code: `obs.subscribe(this.observer);` },
  ],
  invalid: [
    {
      code: `obs.subscribe((x) => setState(x));`,
      errors: [{ messageId: 'missingErrorHandler' }],
    },
    {
      code: `obs.subscribe(function (x) { setState(x); });`,
      errors: [{ messageId: 'missingErrorHandler' }],
    },
    {
      code: `getClient(id).subscribe((client) => setClient(client));`,
      errors: [{ messageId: 'missingErrorHandler' }],
    },
    // Observer object with no error key
    {
      code: `obs.subscribe({ next: onNext });`,
      errors: [{ messageId: 'missingErrorHandler' }],
    },
    {
      code: `obs.subscribe({ next: onNext, complete: onDone });`,
      errors: [{ messageId: 'missingErrorHandler' }],
    },
    // Chained through pipe
    {
      code: `obs.pipe(map(f)).subscribe((x) => use(x));`,
      errors: [{ messageId: 'missingErrorHandler' }],
    },
  ],
});
