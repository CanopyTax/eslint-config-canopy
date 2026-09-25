import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getContentText, phraseMatcher } from '../../plugin/utils/comment-text.js';

const line = (value) => ({ type: 'Line', value });
const block = (value) => ({ type: 'Block', value });
const group = (...comments) => ({ comments });

test('plain prose is returned trimmed and joined', () => {
  assert.equal(getContentText(group(line(' one '), line(' two'))), 'one two');
});

test('a bare eslint directive contributes nothing', () => {
  assert.equal(getContentText(group(block(' eslint-disable-next-line canopy/comment-length '))), '');
  assert.equal(getContentText(group(line(' eslint-disable-line no-console'))), '');
});

test('an eslint directive contributes only its reason', () => {
  assert.equal(getContentText(group(line(' eslint-disable-next-line no-console -- BLU-12 debug output'))), 'BLU-12 debug output');
});

test('a @ts- directive contributes the text after the directive word', () => {
  assert.equal(getContentText(group(line(' @ts-expect-error SAP-451 upstream types'))), 'SAP-451 upstream types');
});

test('inline config and globals are directives only in block form', () => {
  assert.equal(getContentText(group(block('eslint canopy/comment-length: "error"'))), '');
  assert.equal(getContentText(group(block('global SystemJS'))), '');
  assert.equal(getContentText(group(line(' eslint config lives in the package root'))), 'eslint config lives in the package root');
});

test('a directive line inside a // run is dropped and the prose kept', () => {
  assert.equal(getContentText(group(line(' eslint-disable-next-line x'), line(' hopefully fine'))), 'hopefully fine');
});

test('phraseMatcher matches whole phrases case-insensitively', () => {
  const find = phraseMatcher(['should work', 'this pr', 'root-caused']);
  assert.equal(find('This SHOULD WORK now'), 'should work');
  assert.equal(find('the scenario This PR fixes'), 'this pr');
  assert.equal(find('Root-caused to a race'), 'root-caused');
});

test('phraseMatcher ignores a phrase inside a longer word', () => {
  const find = phraseMatcher(['should work', 'this bug']);
  assert.equal(find('should workers restart'), undefined);
  assert.equal(find('covers this bugfix path'), undefined);
});

test('phraseMatcher returns the phrase as given with mixed case', () => {
  const find = phraseMatcher(['This PR', 'CRITICAL']);
  assert.equal(find('the scenario This PR fixes'), 'This PR');
  assert.equal(find('CRITICAL bug found'), 'CRITICAL');
});

test('a bare @ts-ignore contributes nothing', () => {
  assert.equal(getContentText(group(line(' @ts-ignore'))), '');
});

test('a bare istanbul directive contributes nothing', () => {
  assert.equal(getContentText(group(line(' istanbul ignore next'))), '');
});

test('a bare c8 directive contributes nothing', () => {
  assert.equal(getContentText(group(line(' c8 ignore next'))), '');
});

test('a block exported directive contributes nothing', () => {
  assert.equal(getContentText(group(block('exported Foo'))), '');
});

test('a block comment collapses line breaks and * decoration into single spaces', () => {
  assert.equal(getContentText(group(block('*\n * not sure\n * why\n '))), '* not sure why');
  assert.equal(getContentText(group(block(' first\n   second\r\n\tthird '))), 'first second third');
});
