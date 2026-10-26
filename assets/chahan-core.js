export const STAGES = [
  { name: '路地裏の屋台', heat: 1.05, idealHeat: .72, specialty: 'scallion', fillings: ['scallion', 'pork'], note: '強火でねぎを香ばしく', color: '#f0a448' },
  { name: '走る列車', heat: .9, idealHeat: .55, specialty: 'pork', fillings: ['pork', 'scallion'], note: '中火で焼豚をじっくり', color: '#75c1b7' },
  { name: '空中キッチン', heat: 1.2, idealHeat: .38, specialty: 'shrimp', fillings: ['shrimp', 'scallion'], note: '弱火で海老をふっくら', color: '#b9a5e8' },
];
export const COOK_SECONDS = 54;
export const FILLING_NAMES = { scallion: 'ねぎ', pork: '焼豚', shrimp: '海老' };

export function createGame(venue = 0) {
  const stage = Number.isInteger(venue) && venue >= 0 && venue < STAGES.length ? venue : 0;
  return { time: 0, stage, rice: 0, cook: 0, mix: 0, fluff: 0, heat: .48, heatFitSum: 0, heatTime: 0, panPush: 0, ingredients: { egg: false, rice: false, veg: false }, filling: null, fillingQuality: 0, fillingCook: 0, fillingTosses: 0, eggCook: 0, prep: 0, lastAdded: '', lastAddedAt: -10, lastToss: -10, lastLadleAt: -10, ladleHits: 0, ladleX: .5, lastLadleQuality: 0, tossed: 0, lost: 0, combo: 0, bestCombo: 0, tossQuality: 0, perfectTosses: 0, lastTossQuality: 0, seasoning: 0, seasoned: false, seasonedAt: -10, plated: false, platedAt: null, platingQuality: 0, lastLift: 0, lastLean: 0, pullPreview: null, tossOutcome: 'none', tossSpill: 0, phase: 'ready', message: '空の鍋から始めよう。まず卵を入れて、鍋をあおろう。' };
}

export function heatReadiness(game) {
  const target = STAGES[game.stage].idealHeat;
  const quality = Math.max(0, 1 - Math.abs(game.heat - target) / .5);
  const state = game.heat < target - .12 ? 'low' : game.heat > target + .12 ? 'high' : 'ready';
  return { target, quality, state, cue: state === 'ready' ? 'この場所にちょうどいい火力' : state === 'low' ? 'この場所では火力を上げよう' : 'この場所では火力を下げよう' };
}

export function tossForecast(game, gesture) {
  const lift = Math.max(0, Math.min(2, gesture.lift));
  const lean = Math.max(-1.5, Math.min(1.5, gesture.lean));
  const quality = Math.max(0, 1 - Math.abs(lift - .7) / .85 - Math.abs(lean) * .5);
  const state = lift < .28 ? 'weak' : lift > 1.25 ? 'strong' : Math.abs(lean) >= .55 ? 'sideways' : 'safe';
  const cue = { weak: 'もう少し手前へフリック', strong: '強すぎる！', sideways: 'まっすぐフリック', safe: '米がふわっと返る！' }[state];
  return { lift, lean, quality, state, cue };
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
  const pork = game.filling === 'pork', shrimp = game.filling === 'shrimp';
  const ideal = pork ? .7 : shrimp ? .42 : .3;
  const tolerance = pork ? .6 : shrimp ? .42 : .35;
  const cooked = Math.max(0, 1 - Math.abs(cook - ideal) / tolerance);
  const tossed = Math.min(1, (game.fillingTosses || 0) / (pork ? 3 : 2));
  const quality = Math.max(0, Math.min(1, (game.fillingQuality || 0) * .45 + cooked * .4 + tossed * .15));
  const state = cook < (pork ? .48 : shrimp ? .23 : .14) ? 'raw' : cook > (pork ? 1.05 : shrimp ? .72 : .52) ? 'burnt' : 'ready';
  const cue = pork ? state === 'raw' ? '焼豚をもう少し焼こう' : state === 'burnt' ? '焼豚が焦げそう！ 火力を下げて' : '焼豚が香ばしい！'
    : shrimp ? state === 'raw' ? '海老をもう少し炒めよう' : state === 'burnt' ? '海老が硬くなりそう！ 火力を下げて' : '海老がぷりっと仕上がった！'
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
  if (game.phase !== 'playing' || !['egg', 'rice', 'veg'].includes(kind) || game.ingredients[kind] || (kind === 'veg' && !STAGES[game.stage].fillings.includes(filling))) return false;
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
    game.message = game.ingredients.egg && egg.quality < .35 ? game.eggCook > .72 ? '卵が少し焦げた。ごはんを返して香りを整えよう。' : '卵はまだ生っぽい。火を通しながら返そう。' : 'ごはんを投入！ 鍋をあおり、タップでおたまをカンカン。';
  } else {
    game.filling = filling;
    game.fillingCook = 0;
    game.fillingTosses = 0;
    const timing = filling === 'scallion' ? Math.max(0, 1 - Math.abs(game.cook - .52) / .52) : Math.max(0, 1 - Math.abs(game.cook - .24) / .48);
    game.fillingQuality = Math.max(0, Math.min(1, timing * heatReadiness(game).quality * (game.mix >= .1 ? 1 : .7) * (filling === STAGES[game.stage].specialty ? 1 : .85)));
    game.prep += game.ingredients.rice ? game.mix >= .1 ? .25 : .15 : .04;
    game.message = game.ingredients.rice ? `${FILLING_NAMES[filling]}を投入！ 鍋をあおって火を通そう。` : '具材を入れた。ごはんも忘れずに。';
  }
  return true;
}

export function advance(game, input, dt) {
  if (game.phase !== 'playing') return game;
  dt = Math.max(0, Math.min(dt, 0.05));
  const stage = STAGES[game.stage];
  game.time += dt;
  game.heat = Math.max(0, Math.min(1, game.heat + input.heat * dt * 0.75));
  if (game.ingredients.rice) { game.heatFitSum += heatReadiness(game).quality * dt; game.heatTime += dt; }
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
  if (game.time >= COOK_SECONDS - .00001) { game.phase = 'finished'; game.message = '制限時間！ 皿の出来を見よう。'; }
  if (game.ingredients.rice && game.rice <= 0.25) { game.phase = 'finished'; game.message = 'ごはんが飛んでいった！'; }
  return game;
}

export function toss(game, gesture = { lift: 0.65, lean: 0 }) {
  if (game.phase !== 'playing' || game.time - game.lastToss < 0.42) return null;
  if (!game.ingredients.rice) { game.message = 'ごはんを入れてから鍋を返そう。'; return null; }
  game.lastToss = game.time;
  game.tossed++;
  const { lift, lean, quality, state } = tossForecast(game, gesture);
  game.lastLift = lift;
  game.lastLean = lean;
  const safe = state === 'safe';
  game.lastTossQuality = safe ? quality : 0;
  game.tossOutcome = safe ? 'caught' : state === 'weak' ? 'weak' : 'spilled';
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
    const loss = game.tossOutcome === 'weak' ? 0 : Math.min(game.rice, 0.025 + Math.max(0, lift - 1.25) * 0.12 + Math.abs(lean) * 0.08);
    game.rice -= loss;
    game.lost += loss;
    game.tossSpill = loss;
    game.message = state === 'weak' ? 'フリックが弱かった。米は鍋の底に残った。' : '斜めか強すぎ！ 米がこぼれた。';
  }
  return safe;
}

export function tossReadiness(game) {
  return Math.min(1, (game.tossQuality || 0) / 5);
}

export function tapLadle(game, x = .5) {
  if (game.phase !== 'playing') return null;
  if (!game.ingredients.rice) { game.message = 'ごはんを入れてから、おたまでほぐそう。'; return null; }
  const interval = game.time - game.lastLadleAt;
  if (interval < .12) return null;
  const rhythmic = interval >= .17 && interval <= .7;
  const cooked = game.cook >= .16 && game.cook <= 1.1;
  const quality = Math.min(1, (rhythmic ? 1 : .4) * (cooked ? 1 : game.cook < .16 ? .6 : .3) * (.55 + heatReadiness(game).quality * .45));
  game.lastLadleAt = game.time;
  game.ladleHits++;
  game.ladleX = Math.max(.2, Math.min(.8, Number.isFinite(x) ? x : .5));
  game.lastLadleQuality = quality;
  game.fluff = Math.min(1, game.fluff + .17 * quality);
  game.mix = Math.min(1, game.mix + .012 * quality);
  game.message = !cooked ? game.cook < .16 ? 'カン！ まだ米が湿っている。少し炒めよう。' : 'カン！ 焦げる前に盛り付けよう。'
    : rhythmic ? game.fluff >= .7 ? 'カンカン！ 米がパラパラにほどけた。' : 'カンカン！ 米のかたまりがほぐれてきた。'
    : 'カン！ 少し間をあけて、リズムよくほぐそう。';
  return quality;
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
  const quality = Math.max(0, 1 - Math.abs(game.cook - .86) / .86);
  const cue = game.mix < .35 ? 'もう少し米と具を混ぜる'
    : game.cook < .68 ? 'もう少し火を通す'
    : game.cook > 1.05 ? '焦げる前におたまで集めよう！'
    : '今が盛りどき！ 円を描いて中心へ';
  return { ready: game.mix >= .35 && cookMeter(game).state === 'ready', cue, quality };
}

export function cookMeter(game) {
  const cook = Math.max(0, game.cook);
  const state = !game.ingredients.rice ? 'empty' : cook < .68 ? 'raw' : cook <= 1.05 ? 'ready' : 'burnt';
  const label = { empty: '未投入', raw: 'もう少し', ready: '盛りどき', burnt: '焦げ注意' }[state];
  return { state, label, fill: Math.min(100, Math.round(cook / 1.5 * 100)) };
}

export function plate(game, gatherQuality = .5) {
  if (game.phase !== 'playing' || !game.seasoned || game.rice <= .25) return false;
  game.plated = true;
  game.platedAt = game.time;
  game.platingQuality = Math.max(0, Math.min(1, gatherQuality)) * platingReadiness(game).quality;
  game.phase = 'finished';
  game.message = game.platingQuality >= .65 ? 'おたまで丸く盛り付けた！' : 'おたまで盛り付けた。';
  return true;
}

export function result(game) {
  const doneness = Math.max(0, 1 - Math.abs(game.cook - 0.86) / 0.86);
  const skill = tossReadiness(game);
  const heatFit = game.heatTime ? game.heatFitSum / game.heatTime : 0;
  const fluff = Math.max(0, Math.min(1, game.fluff || 0));
  const score = Math.round(100 * (game.mix * 0.14 + doneness * 0.13 + game.rice * 0.11 + game.seasoning * 0.12 + game.prep * 0.08 + fillingReadiness(game).quality * 0.11 + skill * 0.07 + heatFit * 0.08 + fluff * 0.10 + (game.platingQuality || 0) * 0.06));
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
    : game.filling && fillingReadiness(game).state === 'burnt' ? `${FILLING_NAMES[game.filling]}を炒めすぎた。火力を下げるか、入れるタイミングを遅らせよう。`
    : game.filling && fillingReadiness(game).state === 'raw' ? `${FILLING_NAMES[game.filling]}の火入れが足りない。鍋で少し炒めて、数回返そう。`
    : heatFit < .45 ? `${STAGES[game.stage].name}では火力を${game.heat < STAGES[game.stage].idealHeat ? '上げて' : '下げて'}炒めよう。`
    : game.plated && game.cook < .68 ? '少し早く盛り付けた。もうひと炒めすると、米がもっと香ばしくなる。'
    : game.plated && game.cook > 1.05 ? '少し遅く盛り付けた。焦げる前に皿へ移そう。'
    : game.tossed > 0 && skill < .25 ? '鍋を手前へまっすぐフリックすると、米が軽くほどける。'
    : fluff < .35 ? 'おたまで鍋をカンカン。米のかたまりをほぐすと、もっとパラパラになる。'
    : game.plated && game.platingQuality < .45 ? 'おたまで円を描き、中心へ集めると丸く盛れる。'
    : score >= 80 ? '一粒ずつ香ばしく、丸く盛れた会心のひと皿。'
    : '香ばしく仕上がった。次はもっと軽やかに返せそうだ。';
  return { score, title, doneness, seasoning: game.seasoning, skill, heatFit, fluff, plating: game.platingQuality || 0, comment };
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
    separateGrains: Math.round(clamp(game.fluff) * rice * 38),
    roundness: game.plated ? clamp(game.platingQuality) : 0,
    steam: rice > .3 && cook > .48 ? clamp((cook - .48) / .38) * (1 - clamp((cook - 1.25) / .6)) : 0,
  };
}
