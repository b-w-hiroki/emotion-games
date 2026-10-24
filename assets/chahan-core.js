export const STAGES = [
  { name: '路地裏の屋台', wind: 0, sway: 0.16, heat: 1.05, seconds: 18, color: '#f0a448' },
  { name: '走る列車', wind: 0.28, sway: 0.55, heat: 0.9, seconds: 18, color: '#75c1b7' },
  { name: '空中キッチン', wind: -0.36, sway: 0.38, heat: 1.2, seconds: 18, color: '#b9a5e8' },
];

export function createGame() {
  return { time: 0, stage: 0, stageTime: 0, balance: 0, velocity: 0, rice: 1, cook: 0, mix: 0, heat: 0.48, lastToss: -10, tossed: 0, lost: 0, combo: 0, bestCombo: 0, seasoning: 0, seasoned: false, seasonedAt: -10, lastLift: 0, lastLean: 0, tossOutcome: 'none', tossSpill: 0, phase: 'ready', message: '鍋を手前へ引くように下へ。まっすぐ、ほどよい速さで。' };
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
  game.heat = Math.max(0, Math.min(1, game.heat + input.heat * dt * 0.75));
  game.cook += dt * game.heat * stage.heat * 0.03;
  if (game.stageTime >= stage.seconds) {
    game.stageTime -= stage.seconds;
    game.stage++;
    game.message = game.stage < STAGES.length ? `${STAGES[game.stage].name}へ！ 揺れ方が変わる。` : 'できあがり！';
    if (game.stage >= STAGES.length) game.phase = 'finished';
  }
  if (game.rice <= 0.25) { game.phase = 'finished'; game.message = 'ごはんが飛んでいった！'; }
  return game;
}

export function toss(game, gesture = { lift: 0.65, lean: 0 }) {
  if (game.phase !== 'playing' || game.time - game.lastToss < 0.42) return null;
  game.lastToss = game.time;
  game.tossed++;
  const lift = Math.max(0, Math.min(2, gesture.lift));
  const lean = Math.max(-1.5, Math.min(1.5, gesture.lean));
  game.lastLift = lift;
  game.lastLean = lean;
  const quality = Math.max(0, 1 - Math.abs(lift - 0.7) / 0.65 - Math.abs(lean) * 0.65 - Math.abs(game.balance) * 0.55);
  const safe = lift >= 0.28 && lift <= 1.25 && Math.abs(lean + game.balance * 0.55) < 0.55;
  game.tossOutcome = safe ? 'caught' : lift < 0.28 ? 'weak' : 'spilled';
  game.tossSpill = 0;
  if (safe) {
    game.combo++;
    game.bestCombo = Math.max(game.bestCombo, game.combo);
    game.mix = Math.min(1, game.mix + 0.025 + quality * 0.075);
    game.cook = Math.min(1.35, game.cook + 0.005 + quality * 0.008);
    game.message = quality > 0.65 ? 'ふわっ！ 米がきれいに回った。' : '返った！ 次はもう少しまっすぐ。';
  } else {
    game.combo = 0;
    const loss = game.tossOutcome === 'weak' ? 0 : Math.min(game.rice, 0.025 + Math.max(0, lift - 1.25) * 0.12 + Math.abs(lean + game.balance * 0.55) * 0.08);
    game.rice -= loss;
    game.lost += loss;
    game.tossSpill = loss;
    game.message = lift < 0.28 ? '弱すぎた。米は鍋の底に残った。' : '斜めか強すぎ！ 米がこぼれた。';
  }
  return safe;
}

export function seasoningReadiness(game) {
  const cookTiming = Math.max(0, 1 - Math.abs(game.cook - 0.56) / 0.5);
  const mixTiming = Math.min(1, game.mix / 0.45);
  const quality = Math.round(100 * cookTiming * mixTiming) / 100;
  const cue = game.mix < 0.25 ? 'まず米と具を混ぜる'
    : game.cook < 0.36 ? 'まだ早い・火を通す'
    : game.cook > 0.76 ? '遅くなる前に入れる'
    : quality >= 0.7 ? '今が入れどき！'
    : game.mix < 0.35 ? 'もう少し米を返す' : 'もう少し火を通す';
  return { quality, cue, ready: quality >= 0.7 };
}

export function addSeasoning(game) {
  if (game.phase !== 'playing' || game.seasoned) return null;
  game.seasoned = true;
  game.seasonedAt = game.time;
  game.seasoning = seasoningReadiness(game).quality;
  game.message = game.seasoning >= 0.7 ? 'ジュワッ！ 香りが立った。' : game.mix < 0.25 ? 'まだ具が混ざる前。味が偏った。' : '調味料を入れた。次は火の通りを見よう。';
  return game.seasoning;
}

export function result(game) {
  const doneness = Math.max(0, 1 - Math.abs(game.cook - 0.86) / 0.86);
  const score = Math.round(100 * (game.mix * 0.3 + doneness * 0.26 + game.rice * 0.24 + game.seasoning * 0.2));
  const title = game.rice <= 0.25 ? '空っぽの鍋' : score >= 80 ? '伝説のパラパラ' : score >= 60 ? 'うまいチャーハン' : score >= 40 ? 'まだまだ食べられる' : '次はもっとおいしく';
  const comment = game.rice <= 0.25 ? '米が鍋から飛んでいった。次は少しやさしく、まっすぐ返そう。'
    : game.mix < 0.35 ? '具と米がまだ別々。鍋を小さく、何度か返してみよう。'
    : doneness < 0.45 ? '芯が少し残った。火力を見ながら、もうひと炒め。'
    : game.seasoning < 0.35 ? '香りが惜しい。具が混ざり、火が通った瞬間を狙おう。'
    : score >= 80 ? '一粒ずつ香ばしく、ふわりとほどける。今日の会心のひと皿。'
    : '香ばしく仕上がった。次はもっと軽やかに返せそうだ。';
  return { score, title, doneness, seasoning: game.seasoning, comment };
}

export function dishAppearance(game) {
  const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
  const rice = clamp(game.rice), mix = clamp(game.mix), seasoning = clamp(game.seasoning);
  const cook = Math.max(0, Number(game.cook) || 0);
  return {
    portion: Math.sqrt(rice),
    scatteredIngredients: Math.round((1 - mix) * rice * 20),
    mixedIngredients: Math.round(mix * rice * 25),
    glaze: game.seasoned ? seasoning : 0,
    pale: clamp((.55 - cook) / .55),
    char: clamp((cook - 1.05) / .5),
    steam: rice > .3 && cook > .48 ? clamp((cook - .48) / .38) * (1 - clamp((cook - 1.25) / .6)) : 0,
  };
}
