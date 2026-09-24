import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from 'eslint';
import { getCommentGroups } from '../../plugin/utils/comment-groups.js';

function groupsOf(code, options) {
  let groups;
  const capture = {
    create(context) {
      return {
        Program() {
          groups = getCommentGroups(context.sourceCode, options);
        },
      };
    },
  };
  new Linter().verify(code, {
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    plugins: { t: { rules: { capture } } },
    rules: { 't/capture': 'error' },
  });
  return groups.map((g) => ({ kind: g.kind, text: g.text, start: g.loc.start.line, end: g.loc.end.line }));
}

test('consecutive standalone // lines form one run', () => {
  assert.deepEqual(groupsOf('// one\n// two\nconst a = 1;'), [{ kind: 'run', text: 'one two', start: 1, end: 2 }]);
});

test('a blank line ends a run', () => {
  assert.deepEqual(groupsOf('// one\n\n// two'), [
    { kind: 'run', text: 'one', start: 1, end: 1 },
    { kind: 'run', text: 'two', start: 3, end: 3 },
  ]);
});

test('a block comment is its own group and breaks a run', () => {
  assert.deepEqual(groupsOf('// one\n/* two */\n// three'), [
    { kind: 'run', text: 'one', start: 1, end: 1 },
    { kind: 'block', text: 'two', start: 2, end: 2 },
    { kind: 'run', text: 'three', start: 3, end: 3 },
  ]);
});

test('a trailing // comment stands alone and does not join the run below it', () => {
  assert.deepEqual(groupsOf('const a = 1; // trail\n// below'), [
    { kind: 'trailing', text: 'trail', start: 1, end: 1 },
    { kind: 'run', text: 'below', start: 2, end: 2 },
  ]);
});

test('a file with no comments has no groups', () => {
  assert.deepEqual(groupsOf('const a = 1;'), []);
});

const separate = { separateNonProse: true };

test('with separateNonProse, a directive-only // line is its own run and splits the run', () => {
  const code = '// one\n// eslint-disable-next-line no-console\n// two\nconsole.log(1);';
  assert.deepEqual(groupsOf(code, separate), [
    { kind: 'run', text: 'one', start: 1, end: 1 },
    { kind: 'run', text: 'eslint-disable-next-line no-console', start: 2, end: 2 },
    { kind: 'run', text: 'two', start: 3, end: 3 },
  ]);
});

test('with separateNonProse, a directive with a reason still joins the run', () => {
  const code = '// eslint-disable-next-line no-console -- debug output\n// two\nconsole.log(1);';
  assert.deepEqual(groupsOf(code, separate), [
    { kind: 'run', text: 'eslint-disable-next-line no-console -- debug output two', start: 1, end: 2 },
  ]);
});

test('with separateNonProse, a shebang is its own group', () => {
  const code = '#!/usr/bin/env node\n// one\nconst a = 1;';
  assert.deepEqual(groupsOf(code, separate), [
    { kind: 'run', text: '/usr/bin/env node', start: 1, end: 1 },
    { kind: 'run', text: 'one', start: 2, end: 2 },
  ]);
});

test('without the option, directive lines and a shebang join the run below', () => {
  assert.deepEqual(groupsOf('// one\n// eslint-disable-next-line no-console\n// two\nconsole.log(1);'), [
    { kind: 'run', text: 'one eslint-disable-next-line no-console two', start: 1, end: 3 },
  ]);
  assert.deepEqual(groupsOf('#!/usr/bin/env node\n// one\nconst a = 1;'), [
    { kind: 'run', text: '/usr/bin/env node one', start: 1, end: 2 },
  ]);
});
