export const STAGES = [
  { name: '路地裏の屋台', wind: 0, sway: 0.16, heat: 1.05, seconds: 18, color: '#f0a448' },
  { name: '走る列車', wind: 0.28, sway: 0.55, heat: 0.9, seconds: 18, color: '#75c1b7' },
  { name: '空中キッチン', wind: -0.36, sway: 0.38, heat: 1.2, seconds: 18, color: '#b9a5e8' },
];

export function createGame() {
  return { time: 0, stage: 0, stageTime: 0, balance: 0, velocity: 0, rice: 1, cook: 0, mix: 0, heat: 0.48, lastToss: -10, tossed: 0, lost: 0, combo: 0, bestCombo: 0, phase: 'ready', message: '鍋を水平に。いい香りがしてきた。' };
}

export function advance(game, input, dt) {
  if (game.phase !== 'playing') return game;
  dt = Math.max(0, Math.min(dt, 0.05));
  const stage = STAGES[game.stage];
  game.time += dt;
  game.stageTime += dt;
  const disturbance = Math.sin(game.time * 2.4) * stage.sway + stage.wind;
  game.velocity += (disturbance + input.steer * 1.75 - game.balance * 1.35 - game.velocity * 1.55) * dt;
  game.balance = Math.max(-1.45, Math.min(1.45, game.balance + game.velocity * dt * 2.2));
  const spill = Math.max(0, Math.abs(game.balance) - 0.78) * dt * (game.tossed ? 0.08 : 0.045);
  game.rice = Math.max(0, game.rice - spill);
  game.lost += spill;
  game.heat = Math.max(0, Math.min(1, game.heat + input.heat * dt * 0.75 - dt * 0.09));
  game.cook += dt * game.heat * stage.heat * 0.018;
  if (game.stageTime >= stage.seconds) {
    game.stageTime -= stage.seconds;
    game.stage++;
    game.message = game.stage < STAGES.length ? `${STAGES[game.stage].name}へ！ 揺れ方が変わる。` : 'できあがり！';
    if (game.stage >= STAGES.length) game.phase = 'finished';
  }
  if (game.rice <= 0.25) { game.phase = 'finished'; game.message = 'ごはんが飛んでいった！'; }
  return game;
}

export function toss(game) {
  if (game.phase !== 'playing' || game.time - game.lastToss < 0.42) return false;
  game.lastToss = game.time;
  game.tossed++;
  const safe = Math.abs(game.balance) < 0.48;
  if (safe) {
    game.combo++;
    game.bestCombo = Math.max(game.bestCombo, game.combo);
    game.mix = Math.min(1, game.mix + 0.075 + Math.min(game.combo, 8) * 0.004);
    game.cook = Math.min(1.35, game.cook + 0.008);
    game.message = game.combo > 1 ? `${game.combo}連続！ 米がふわっと踊った。` : 'いい返し！ 具が混ざった。';
  } else {
    game.combo = 0;
    const loss = Math.min(game.rice, 0.085 + Math.max(0, Math.abs(game.balance) - 0.8) * 0.12);
    game.rice -= loss;
    game.lost += loss;
    game.message = 'おっと！ 端からごはんがこぼれた。';
  }
  return safe;
}

export function result(game) {
  const doneness = Math.max(0, 1 - Math.abs(game.cook - 0.86) / 0.86);
  const score = Math.round(100 * (game.mix * 0.38 + doneness * 0.33 + game.rice * 0.29));
  const title = game.rice <= 0.25 ? '空っぽの鍋' : score >= 80 ? '伝説のパラパラ' : score >= 60 ? 'うまいチャーハン' : score >= 40 ? 'まだまだ食べられる' : '次はもっとおいしく';
  return { score, title, doneness };
}
