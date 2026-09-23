import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Linter } from 'eslint';
import { getCommentGroups } from '../../plugin/utils/comment-groups.js';

function groupsOf(code) {
  let groups;
  const capture = {
    create(context) {
      return {
        Program() {
          groups = getCommentGroups(context.sourceCode);
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
