import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('studio playbook keeps technical and human gates separate for the next genre', () => {
  const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
  const playbook = read('../studio-playbook/README.md');
  const brief = read('../studio-playbook/SLICE-BRIEF-TEMPLATE.md');
  const index = read('../README.md');
  for (const section of ['再利用するものとしないもの', '制作の順序', '各PRの完成条件', '失敗と改善の記録', '現在の判定']) assert.ok(playbook.includes(section), section);
  for (const field of ['感情仮説', '最初の10秒', '場面、分岐、結末', 'アート、サウンド', '技術受入と人の評価', '改善履歴']) assert.ok(brief.includes(field), field);
  assert.match(playbook, /物理iPhone Safari.*未実施/);
  assert.match(index, /studio-playbook\/README\.md/);
});
