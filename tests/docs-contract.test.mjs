import test from 'node:test';
import assert from 'node:assert/strict';
import { docsDecision, validateDocuments } from '../scripts/check-docs.mjs';

test('living documents have required sections and working local references', () => {
  assert.deepEqual(validateDocuments(), []);
});

test('004 implementation changes need a living-doc change or a specific exception', () => {
  const files = ['assets/kienaide-core.js'];
  assert.equal(docsDecision(files).ok, false);
  assert.equal(docsDecision(files, 'Docs impact: none — ここに挙動と設計が変わらない理由を書く').ok, false);
  assert.equal(docsDecision(files, 'Docs impact: none — 既存の式を等価な関数へ移動しただけで、入力・出力・保存形式は変えません。').ok, true);
  assert.equal(docsDecision([...files, 'docs/KIENAIDE-SPEC.md']).ok, true);
  assert.equal(docsDecision(['tests/site.test.mjs']).ok, true);
});
