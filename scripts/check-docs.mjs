import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const spec = 'docs/KIENAIDE-SPEC.md';
const design = 'docs/KIENAIDE-DESIGN.md';
const workflow = 'docs/DOCUMENTATION-WORKFLOW.md';
const required = new Map([
  [spec, ['## プレイの流れ', '## 章と判断', '## 結末の優先順位', '## 操作・休止・アクセシビリティ', '## 受入基準と未検証']],
  [design, ['## 構成と依存方向', '## 状態と時刻', '## 入力と結果の流れ', '## 保存・互換性・境界', '## 変更と検証の対応']],
  [workflow, ['## 更新の単位', '## 検証と公開', '## 適用範囲']]
]);
const docs = new Set([spec, design]);
const relevant = file => /^(assets\/(app\.js|style\.css|kienaide-(core|view|audio|card)\.js|kienaide\/paint\/|kienaide-v3\/)|scripts\/(art\/kienaide-|qa-kienaide-|capture-kienaide-clip|build\.mjs)|tests\/kienaide-)/.test(file);

export function docsDecision(changed, body = '') {
  const implementation = changed.filter(relevant);
  if (!implementation.length || changed.some(file => docs.has(file))) return { ok: true, implementation };
  const match = body.match(/^Docs impact: none\s*[—-]\s*(.+)$/im);
  const reason = match?.[1]?.trim() || '';
  const placeholder = /ここに|理由を書く|n\/a|none|不要|なし|no change/i.test(reason);
  return { ok: reason.length >= 12 && !placeholder, implementation };
}

export function validateDocuments() {
  const errors = [];
  for (const [file, sections] of required) {
    if (!fs.existsSync(path.join(root, file))) { errors.push(`${file} is missing`); continue; }
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    for (const section of sections) if (!source.includes(section)) errors.push(`${file}: missing ${section}`);
    for (const match of source.matchAll(/\[[^\]]+\]\((\.\/[^)]+)\)/g)) {
      const target = path.resolve(root, 'docs', match[1]);
      if (!fs.existsSync(target)) errors.push(`${file}: broken link ${match[1]}`);
    }
  }
  return errors;
}

function main() {
  const errors = validateDocuments();
  const eventFile = process.env.GITHUB_EVENT_PATH;
  if (process.env.GITHUB_EVENT_NAME === 'pull_request' && eventFile) {
    const event = JSON.parse(fs.readFileSync(eventFile, 'utf8'));
    const base = event.pull_request?.base?.sha;
    if (!base) errors.push('PR base SHA is missing');
    else {
      const head = event.pull_request?.head?.sha || 'HEAD';
      const changed = execFileSync('git', ['diff', '--name-only', base, head], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
      const decision = docsDecision(changed, event.pull_request.body || '');
      if (!decision.ok) errors.push(`004 changes require ${spec} / ${design} update or a specific "Docs impact: none — reason" in the PR body. Changed: ${decision.implementation.join(', ')}`);
    }
  }
  if (errors.length) { for (const error of errors) console.error(error); process.exitCode = 1; }
  else console.log('Documentation checks passed.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) main();
