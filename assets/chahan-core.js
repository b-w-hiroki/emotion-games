export const STAGES = [
  { name: '路地裏の屋台', wind: 0, sway: 0.16, heat: 1.05, seconds: 18, color: '#f0a448' },
  { name: '走る列車', wind: 0.28, sway: 0.55, heat: 0.9, seconds: 18, color: '#75c1b7' },
  { name: '空中キッチン', wind: -0.36, sway: 0.38, heat: 1.2, seconds: 18, color: '#b9a5e8' },
];

export function windForecast(game) {
  if (game.stage === 0 || game.stage >= STAGES.length) return { state: 'calm', direction: 0, force: 0, cue: '' };
  const train = game.stage === 1;
  const period = train ? 6 : 7;
  const cycle = Math.floor(game.stageTime / period);
  const phase = game.stageTime % period;
  const start = train ? 3.2 : 4.1;
  const end = train ? 4.6 : 5.7;
  const direction = train || cycle % 2 ? 1 : -1;
  const toward = direction > 0 ? '右' : '左';
  const counter = direction > 0 ? '左' : '右';
  const state = phase >= start && phase < end ? 'active' : phase >= start - 1 && phase < start ? 'warning' : 'calm';
  const wave = state === 'active' ? Math.sin(Math.PI * (phase - start) / (end - start)) : 0;
  const force = direction * wave * (train ? 1.2 : 1.45);
  const cue = state === 'warning' ? `まもなく${toward}へ揺れる・${counter}へ戻す`
    : state === 'active' ? `${toward}へ揺れた！ ${counter}へ戻す` : '';
  return { state, direction, force, cue };
}

export function balanceReadiness(game) {
  const lean = Math.max(-1.45, Math.min(1.45, game.balance));
  const severity = Math.abs(lean);
  const state = !game.ingredients.rice || severity < .42 ? 'steady' : severity < .78 ? 'leaning' : 'danger';
  const side = lean > 0 ? '右' : '左';
  const counter = lean > 0 ? '左' : '右';
  const cue = state === 'steady' ? '鍋のバランス' : state === 'danger' ? `${side}へこぼれる！ ${counter}へ戻す` : `${side}へ偏る・${counter}へ戻す`;
  return { state, cue, drift: Math.round(lean * 66) };
}

export function createGame() {
  return { time: 0, stage: 0, stageTime: 0, balance: 0, velocity: 0, rice: 0, cook: 0, mix: 0, heat: 0.48, ingredients: { egg: false, rice: false, veg: false }, filling: null, fillingQuality: 0, fillingCook: 0, fillingTosses: 0, eggCook: 0, prep: 0, lastAdded: '', lastAddedAt: -10, lastToss: -10, tossed: 0, lost: 0, combo: 0, bestCombo: 0, tossQuality: 0, perfectTosses: 0, lastTossQuality: 0, seasoning: 0, seasoned: false, seasonedAt: -10, plated: false, platedAt: null, lastLift: 0, lastLean: 0, tossOutcome: 'none', tossSpill: 0, phase: 'ready', message: '空の鍋から始めよう。まず卵を選ぶとふんわり仕上がる。' };
}

export function eggReadiness(game) {
  const cook = Math.max(0, game.eggCook);
  const quality = Math.max(0, 1 - Math.abs(cook - .48) / .52);
  const cue = cook < .28 ? '卵を炒めよう・火力で進む' : cook <= .72 ? '卵がふんわり！ ごはんを入れどき' : '卵が焦げそう！ ごはんを急いで';
  return { quality, cue, ready: cook >= .28 && cook <= .72 };
}

export function fillingReadiness(game) {
  if (!game.filling) return { quality: 0, cue: '', state: 'missing' };
  const cook = game.fillingCook || 0;
  const pork = game.filling === 'pork';
  const ideal = pork ? .7 : .3;
  const tolerance = pork ? .6 : .35;
  const cooked = Math.max(0, 1 - Math.abs(cook - ideal) / tolerance);
  const tossed = Math.min(1, (game.fillingTosses || 0) / (pork ? 3 : 2));
  const quality = Math.max(0, Math.min(1, (game.fillingQuality || 0) * .45 + cooked * .4 + tossed * .15));
  const state = cook < (pork ? .48 : .14) ? 'raw' : cook > (pork ? 1.05 : .52) ? 'burnt' : 'ready';
  const cue = pork ? state === 'raw' ? '焼豚をもう少し焼こう' : state === 'burnt' ? '焼豚が焦げそう！ 火力を下げて' : '焼豚が香ばしい！'
    : state === 'raw' ? 'ねぎをさっと炒めよう' : state === 'burnt' ? 'ねぎの香りが飛びそう！ 火力を下げて' : 'ねぎの香りが立った！';
  return { quality, cue, state };
}

export function ingredientCue(game) {
  if (!game.ingredients.egg) return 'まず卵を入れて、少し火を通そう';
  if (!game.ingredients.rice) return eggReadiness(game).cue;
  if (!game.ingredients.veg) return game.mix < .1 ? '鍋を返してから具材を入れよう' : '具材を入れよう';
  return game.seasoned ? platingReadiness(game).cue : seasoningReadiness(game).cue;
}

export function addIngredient(game, kind, filling = 'scallion') {
  if (game.phase !== 'playing' || !['egg', 'rice', 'veg'].includes(kind) || game.ingredients[kind] || (kind === 'veg' && !['scallion', 'pork'].includes(filling))) return false;
  game.ingredients[kind] = true;
  game.lastAdded = kind;
  game.lastAddedAt = game.time;
  if (kind === 'egg') {
    game.prep += game.ingredients.rice ? .04 : .25;
    game.message = '卵がジュッ！ 少し炒めてからごはんを入れよう。';
  } else if (kind === 'rice') {
    game.rice = 1;
    const egg = eggReadiness(game);
    game.prep += game.ingredients.egg ? .1 + .25 * egg.quality : .03;
    game.message = game.ingredients.egg && egg.quality < .35 ? game.eggCook > .72 ? '卵が少し焦げた。ごはんを返して香りを整えよう。' : '卵はまだ生っぽい。火を通しながら返そう。' : 'ごはんを投入！ 手前へ引いて、卵と混ぜよう。';
  } else {
    game.filling = filling;
    game.fillingCook = 0;
    game.fillingTosses = 0;
    const timing = filling === 'scallion' ? Math.max(0, 1 - Math.abs(game.cook - .52) / .52) : Math.max(0, 1 - Math.abs(game.cook - .24) / .48);
    const heat = filling === 'scallion' ? 1 - Math.max(0, game.heat - .7) : .5 + game.heat * .5;
    game.fillingQuality = Math.max(0, Math.min(1, timing * heat * (game.mix >= .1 ? 1 : .7)));
    game.prep += game.ingredients.rice ? game.mix >= .1 ? .25 : .15 : .04;
    game.message = game.ingredients.rice ? filling === 'scallion' ? 'ねぎを投入！ 火が通りすぎる前に返そう。' : '焼豚を投入！ 香ばしく鍋で炒めよう。' : '具材を入れた。ごはんも忘れずに。';
  }
  return true;
}

export function advance(game, input, dt) {
  if (game.phase !== 'playing') return game;
  dt = Math.max(0, Math.min(dt, 0.05));
  const stage = STAGES[game.stage];
  game.time += dt;
  game.stageTime += dt;
  const disturbance = Math.sin(game.time * 2.4) * stage.sway + stage.wind + windForecast(game).force;
  game.velocity += (disturbance + input.steer * 1.75 - game.balance * 1.35 - game.velocity * 1.55) * dt;
  game.balance = Math.max(-1.45, Math.min(1.45, game.balance + game.velocity * dt * 2.2));
  const spill = game.ingredients.rice ? Math.max(0, Math.abs(game.balance) - 0.78) * dt * (game.tossed ? 0.08 : 0.045) : 0;
  game.rice = Math.max(0, game.rice - spill);
  game.lost += spill;
  game.heat = Math.max(0, Math.min(1, game.heat + input.heat * dt * 0.75));
  if (game.ingredients.egg && !game.ingredients.rice) {
    const previous = game.eggCook;
    game.eggCook = Math.min(1.5, game.eggCook + dt * game.heat * stage.heat * .3);
    if (previous < .28 && game.eggCook >= .28) game.message = '卵がふんわり！ 今ごはんを入れよう。';
    if (previous <= .72 && game.eggCook > .72) game.message = '卵が焦げそう！ ごはんを急いで。';
  }
  if (game.ingredients.rice) game.cook += dt * game.heat * stage.heat * 0.03;
  if (game.ingredients.veg) {
    const before = fillingReadiness(game).state;
    game.fillingCook = Math.min(1.5, game.fillingCook + dt * game.heat * stage.heat * .05);
    const after = fillingReadiness(game);
    if (before !== after.state) game.message = after.cue;
  }
  if (game.stageTime >= stage.seconds) {
    game.stageTime -= stage.seconds;
    game.stage++;
    game.message = game.stage < STAGES.length ? `${STAGES[game.stage].name}へ！ 揺れ方が変わる。` : 'できあがり！';
    if (game.stage >= STAGES.length) game.phase = 'finished';
  }
  if (game.ingredients.rice && game.rice <= 0.25) { game.phase = 'finished'; game.message = 'ごはんが飛んでいった！'; }
  return game;
}

export function toss(game, gesture = { lift: 0.65, lean: 0 }) {
  if (game.phase !== 'playing' || game.time - game.lastToss < 0.42) return null;
  if (!game.ingredients.rice) { game.message = 'ごはんを入れてから鍋を返そう。'; return null; }
  game.lastToss = game.time;
  game.tossed++;
  const lift = Math.max(0, Math.min(2, gesture.lift));
  const lean = Math.max(-1.5, Math.min(1.5, gesture.lean));
  game.lastLift = lift;
  game.lastLean = lean;
  const quality = Math.max(0, 1 - Math.abs(lift - 0.7) / 0.65 - Math.abs(lean) * 0.65 - Math.abs(game.balance) * 0.55);
  const safe = lift >= 0.28 && lift <= 1.25 && Math.abs(lean + game.balance * 0.55) < 0.55;
  game.lastTossQuality = safe ? quality : 0;
  game.tossOutcome = safe ? 'caught' : lift < 0.28 ? 'weak' : 'spilled';
  game.tossSpill = 0;
  if (safe) {
    game.combo++;
    game.bestCombo = Math.max(game.bestCombo, game.combo);
    game.tossQuality += quality;
    if (quality >= .82) game.perfectTosses++;
    game.mix = Math.min(1, game.mix + (game.ingredients.egg || game.ingredients.veg ? 0.025 + quality * 0.075 : .012));
    game.cook = Math.min(1.35, game.cook + 0.005 + quality * 0.008);
    if (game.ingredients.veg) game.fillingTosses++;
    game.message = quality >= .82 ? '会心の返し！ 米がきれいに舞った。' : quality > 0.65 ? 'ふわっ！ 米がきれいに回った。' : '返った！ 次はもう少しまっすぐ。';
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

export function tossReadiness(game) {
  return Math.min(1, (game.tossQuality || 0) / 5);
}

export function seasoningReadiness(game) {
  if (!game.ingredients.rice || !game.ingredients.veg) return { quality: 0, cue: !game.ingredients.rice ? 'まずごはんを入れる' : '具材を入れてから味付け', ready: false };
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
  if (game.phase !== 'playing' || game.seasoned || !game.ingredients.rice || !game.ingredients.veg) return null;
  game.seasoned = true;
  game.seasonedAt = game.time;
  game.seasoning = seasoningReadiness(game).quality;
  game.prep += game.ingredients.egg ? .15 : .04;
  game.message = game.seasoning >= 0.7 ? 'ジュワッ！ 香りが立った。' : game.mix < 0.25 ? 'まだ具が混ざる前。味が偏った。' : '調味料を入れた。次は火の通りを見よう。';
  return game.seasoning;
}

export function platingReadiness(game) {
  if (game.stage < STAGES.length - 1) return { ready: false, cue: '最後の場所で盛り付け', quality: 0 };
  const quality = Math.max(0, 1 - Math.abs(game.cook - .86) / .86);
  const cue = game.mix < .35 ? 'もう少し米と具を混ぜる'
    : game.cook < .68 ? 'もう少し火を通す'
    : game.cook > 1.05 ? '焦げる前に盛り付け！'
    : '今が盛りどき！';
  return { ready: game.mix >= .35 && cookMeter(game).state === 'ready', cue, quality };
}

export function cookMeter(game) {
  const cook = Math.max(0, game.cook);
  const state = !game.ingredients.rice ? 'empty' : cook < .68 ? 'raw' : cook <= 1.05 ? 'ready' : 'burnt';
  const label = { empty: '未投入', raw: 'もう少し', ready: '盛りどき', burnt: '焦げ注意' }[state];
  return { state, label, fill: Math.min(100, Math.round(cook / 1.5 * 100)) };
}

export function plate(game) {
  if (game.phase !== 'playing' || !game.seasoned || game.stage !== STAGES.length - 1 || game.rice <= .25) return false;
  game.plated = true;
  game.platedAt = game.time;
  game.phase = 'finished';
  game.message = '盛り付けた！';
  return true;
}

export function result(game) {
  const doneness = Math.max(0, 1 - Math.abs(game.cook - 0.86) / 0.86);
  const skill = tossReadiness(game);
  const score = Math.round(100 * (game.mix * 0.20 + doneness * 0.18 + game.rice * 0.16 + game.seasoning * 0.15 + game.prep * 0.10 + fillingReadiness(game).quality * 0.13 + skill * 0.08));
  const title = game.rice <= 0.25 ? '空っぽの鍋' : score >= 80 ? '伝説のパラパラ' : score >= 60 ? 'うまいチャーハン' : score >= 40 ? 'まだまだ食べられる' : '次はもっとおいしく';
  const comment = !game.ingredients.rice ? 'ごはんが入らないまま完成。次は卵を炒めて、ごはんを入れよう。'
    : game.rice <= 0.25 ? '米が鍋から飛んでいった。次は少しやさしく、まっすぐ返そう。'
    : !game.ingredients.egg ? '卵がないと香りと食感が惜しい。最初に卵を入れてみよう。'
    : game.eggCook > .9 ? '卵を炒めすぎた。ふんわりしたらごはんを入れよう。'
    : game.eggCook < .14 ? '卵がまだ生っぽい。少し火を通してからごはんを入れよう。'
    : !game.ingredients.veg ? '具材がまだ入っていない。ごはんを返したら加えよう。'
    : game.mix < 0.35 ? '具と米がまだ別々。鍋を小さく、何度か返してみよう。'
    : doneness < 0.45 ? '芯が少し残った。火力を見ながら、もうひと炒め。'
    : game.seasoning < 0.35 ? '香りが惜しい。具が混ざり、火が通った瞬間を狙おう。'
    : game.filling && fillingReadiness(game).state === 'burnt' ? `${game.filling === 'pork' ? '焼豚' : 'ねぎ'}を炒めすぎた。火力を下げるか、入れるタイミングを遅らせよう。`
    : game.filling && fillingReadiness(game).state === 'raw' ? `${game.filling === 'pork' ? '焼豚' : 'ねぎ'}の火入れが足りない。鍋で少し炒めて、数回返そう。`
    : game.plated && game.cook < .68 ? '少し早く盛り付けた。もうひと炒めすると、米がもっと香ばしくなる。'
    : game.plated && game.cook > 1.05 ? '少し遅く盛り付けた。焦げる前に皿へ移そう。'
    : game.tossed > 0 && skill < .25 ? '鍋の返しが少し惜しい。手前へまっすぐ引くと米が軽くほどける。'
    : score >= 80 ? '一粒ずつ香ばしく、ふわりとほどける。今日の会心のひと皿。'
    : '香ばしく仕上がった。次はもっと軽やかに返せそうだ。';
  return { score, title, doneness, seasoning: game.seasoning, skill, comment };
}

export function dishAppearance(game) {
  const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
  const rice = clamp(game.rice), mix = clamp(game.mix), seasoning = clamp(game.seasoning);
  const cook = Math.max(0, Number(game.cook) || 0);
  return {
    portion: Math.sqrt(rice),
    scatteredIngredients: Math.round((1 - mix) * rice * 20),
    mixedIngredients: Math.round(mix * rice * 25),
    unmixed: 1 - mix,
    glaze: game.seasoned ? seasoning : 0,
    pale: clamp((.55 - cook) / .55),
    char: clamp((cook - 1.05) / .5),
    steam: rice > .3 && cook > .48 ? clamp((cook - .48) / .38) * (1 - clamp((cook - 1.25) / .6)) : 0,
  };
}
