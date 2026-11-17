const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function harness(storage = {}) {
  const values = new Map();
  const cache = new Map();
  const native = Object.fromEntries(['View', 'Text', 'Image', 'Pressable'].map((name) => [name,
    ({ children, source, accessibilityLabel, accessibilityState, disabled }) => React.createElement(
      name === 'Image' ? 'img' : name === 'Pressable' ? 'button' : 'div', {
        ...(source ? { src: source.uri } : {}),
        'aria-label': accessibilityLabel, 'aria-pressed': accessibilityState?.selected, disabled,
      }, children),
  ]));
  native.StyleSheet = { create: (styles) => styles };
  function load(relative) {
    const file = path.resolve(__dirname, '..', relative);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const localRequire = (name) => {
      if (name === 'react-native') return native;
      if (name === '@react-native-async-storage/async-storage') return {
        getItem: async (key) => values.get(key) ?? null,
        setItem: async (key, value) => { values.set(key, value); },
        removeItem: async (key) => { values.delete(key); }, ...storage,
      };
      if (!name.startsWith('.')) return require(name);
      const base = path.resolve(path.dirname(file), name);
      return load(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx');
    };
    new Function('require', 'module', 'exports', source)(localRequire, module, module.exports);
    return module.exports;
  }
  return { load, values };
}

const clothing = (id, category, name) => ({ id, category, name, color: '米色',
  imageUri: 'https://wardrobe.test/' + id + '.jpg', createdAt: '2026-11-17T08:00:00Z' });
const context = () => ({
  cityName: '长沙', periodLabel: '早晨 06:00–10:59', occasion: '通勤',
  weather: { apparent_temperature: 16, temperature_2m: 18, precipitation: 0, weather_code: 0, wind_speed_10m: 10 },
  wardrobe: [clothing('top-a', '上衣', '中厚针织衫'), clothing('top-b', '上衣', '中厚卫衣'),
    clothing('outer-a', '外套', '中厚夹克'), clothing('outer-b', '外套', '中厚大衣'),
    clothing('pants-a', '裤子', '直筒长裤'), clothing('shoes-a', '鞋子', '休闲鞋')],
});
const outfits = () => [
  { items: { top: 'top-a', outerwear: 'outer-a', bottoms: 'pants-a', shoes: 'shoes-a' }, missingSlots: [] },
  { items: { top: 'top-a', outerwear: 'outer-b', bottoms: 'pants-a', shoes: 'shoes-a' }, missingSlots: [] },
  { items: { top: 'top-b', outerwear: 'outer-a', bottoms: 'pants-a', shoes: 'shoes-a' }, missingSlots: [] },
];
function fixture(h) {
  const logic = h.load('services/outfitTrial.ts');
  const trial = { ...logic.createOutfitTrial(context()), outfits: outfits() };
  return { ...logic, trial };
}

test('16C commute: dislike records the entire outfit; both requests preserve the captured context', () => {
  const { createOutfitTrial, toggleOutfitFeedback, buildRecommendationRequest } = fixture(harness());
  const original = context();
  let trial = { ...createOutfitTrial(original), outfits: outfits() };
  const first = buildRecommendationRequest(trial, false);
  original.weather.apparent_temperature = 30;
  original.wardrobe[0].name = '已修改的上衣';
  original.occasion = '运动';
  trial = toggleOutfitFeedback(trial, trial.outfits[0].items, 'aesthetic', 'dislike');
  const second = buildRecommendationRequest(trial, true);
  assert.equal(first.limit, 4);
  assert.equal('feedback' in first, false);
  for (const key of ['weather', 'wardrobe', 'occasion']) assert.deepEqual(first[key], second[key]);
  assert.equal(second.weather.apparent_temperature, 16);
  assert.equal(second.wardrobe[0].name, '中厚针织衫');
  assert.deepEqual(second.feedback, [{ items: outfits()[0].items, feelsLikeC: 16, occasion: '通勤', aesthetic: 'dislike' }]);
});

test('like + tooCold coexist; each group toggles independently and all-skipped omits feedback', () => {
  const { trial, toggleOutfitFeedback, buildRecommendationRequest } = fixture(harness());
  const items = trial.outfits[0].items;
  let next = toggleOutfitFeedback(trial, items, 'aesthetic', 'like');
  next = toggleOutfitFeedback(next, items, 'thermal', 'tooCold');
  assert.equal(next.feedback.length, 1);
  assert.equal(next.feedback[0].aesthetic, 'like');
  assert.equal(next.feedback[0].thermal, 'tooCold');
  assert.equal(buildRecommendationRequest(next, true).feedback[0].occasion, next.context.occasion);
  next = toggleOutfitFeedback(next, items, 'aesthetic', 'like');
  assert.equal(next.feedback[0].aesthetic, undefined);
  assert.equal(next.feedback[0].thermal, 'tooCold');
  next = toggleOutfitFeedback(next, items, 'thermal', 'justRight');
  assert.equal(next.feedback[0].thermal, 'justRight');
  next = toggleOutfitFeedback(next, items, 'thermal', 'justRight');
  assert.equal('feedback' in buildRecommendationRequest(next, true), false);
});

test('partial outfits retain null slots; empty outfits cannot generate feedback', () => {
  const { trial, toggleOutfitFeedback } = fixture(harness());
  const partial = { top: 'top-a', outerwear: null, bottoms: null, shoes: 'shoes-a' };
  assert.deepEqual(toggleOutfitFeedback(trial, partial, 'thermal', 'tooHot').feedback[0].items, partial);
  assert.deepEqual(toggleOutfitFeedback(trial, { top: null, outerwear: null, bottoms: null, shoes: null }, 'aesthetic', 'like'), trial);
});

test('network sends full feedback and obeys server ranking, including alternatives sharing a top', async () => {
  const h = harness();
  const { trial, toggleOutfitFeedback } = fixture(h);
  const { requestWardrobeOutfits } = h.load('services/outfitApi.ts');
  const originalFetch = global.fetch;
  const originalUrl = process.env.EXPO_PUBLIC_WEATHER_API_URL;
  process.env.EXPO_PUBLIC_WEATHER_API_URL = 'https://backend.test/';
  const requests = [];
  try {
    global.fetch = async (url, init) => {
      requests.push(JSON.parse(init.body));
      assert.equal(url, 'https://backend.test/v1/outfits/recommend');
      assert.equal(init.method, 'POST');
      return new Response(JSON.stringify({ outfits: requests.length === 1 ? outfits() : [outfits()[1], outfits()[0]] }));
    };
    assert.deepEqual(await requestWardrobeOutfits(trial, false), outfits());
    const rated = toggleOutfitFeedback(trial, trial.outfits[0].items, 'aesthetic', 'dislike');
    const result = await requestWardrobeOutfits(rated, true);
    assert.equal(result[0].items.top, 'top-a');
    assert.equal(result[0].items.outerwear, 'outer-b');
    assert.deepEqual(requests[1].feedback[0].items, outfits()[0].items);
    const both = toggleOutfitFeedback(toggleOutfitFeedback(trial, trial.outfits[0].items, 'aesthetic', 'like'), trial.outfits[0].items, 'thermal', 'tooCold');
    await requestWardrobeOutfits(both, true);
    assert.equal(requests[2].feedback[0].aesthetic, 'like');
    assert.equal(requests[2].feedback[0].thermal, 'tooCold');
  } finally {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_WEATHER_API_URL;
    else process.env.EXPO_PUBLIC_WEATHER_API_URL = originalUrl;
  }
});

test('HTTP failure/retry retains choices; empty, invalid, single, and aborted results are handled', async () => {
  const h = harness();
  const { trial, toggleOutfitFeedback } = fixture(h);
  const rated = toggleOutfitFeedback(trial, trial.outfits[0].items, 'thermal', 'tooCold');
  const { requestWardrobeOutfits } = h.load('services/outfitApi.ts');
  const originalFetch = global.fetch;
  const originalUrl = process.env.EXPO_PUBLIC_WEATHER_API_URL;
  process.env.EXPO_PUBLIC_WEATHER_API_URL = 'https://backend.test';
  let firstPayload;
  try {
    global.fetch = async (_, init) => { firstPayload = init.body; return new Response('', { status: 503 }); };
    await assert.rejects(requestWardrobeOutfits(rated, true), /503/);
    assert.equal(rated.feedback[0].thermal, 'tooCold');
    global.fetch = async (_, init) => {
      assert.equal(init.body, firstPayload);
      return new Response(JSON.stringify({ outfits: [outfits()[0]] }));
    };
    assert.equal((await requestWardrobeOutfits(rated, true)).length, 1);
    for (const [body, error] of [[{ outfits: [] }, /暂未生成/], [{ outfits: [{ items: {} }] }, /格式/], [{ outfit: outfits()[0] }, /格式/]]) {
      global.fetch = async () => new Response(JSON.stringify(body));
      await assert.rejects(requestWardrobeOutfits(rated, true), error);
    }
    global.fetch = async (_, init) => {
      if (init.signal.aborted) throw new Error('aborted');
    };
    const controller = new AbortController(); controller.abort();
    await assert.rejects(requestWardrobeOutfits(rated, true, controller.signal), /中断或超时/);
    delete process.env.EXPO_PUBLIC_WEATHER_API_URL;
    await assert.rejects(requestWardrobeOutfits(rated, true), /尚未配置/);
  } finally {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_WEATHER_API_URL;
    else process.env.EXPO_PUBLIC_WEATHER_API_URL = originalUrl;
  }
});

test('restart restores whole feedback, photos, context and results from AsyncStorage', async () => {
  const h = harness();
  const { trial, toggleOutfitFeedback } = fixture(h);
  const partial = { items: { top: 'top-a', outerwear: null, bottoms: null, shoes: 'shoes-a' }, missingSlots: ['bottoms'] };
  trial.outfits.push(partial);
  let next = toggleOutfitFeedback(trial, partial.items, 'aesthetic', 'like');
  next = toggleOutfitFeedback(next, partial.items, 'thermal', 'tooCold');
  next.recommendations = outfits();
  await h.load('services/outfitTrialStorage.ts').saveOutfitTrial(next);
  const fresh = harness({ getItem: async (key) => h.values.get(key) ?? null });
  assert.deepEqual(await fresh.load('services/outfitTrialStorage.ts').loadOutfitTrial(), next);
  await h.load('services/outfitTrialStorage.ts').saveOutfitTrial(null);
  assert.equal(await h.load('services/outfitTrialStorage.ts').loadOutfitTrial(), null);
});

test('rapid autosaves serialize; a failed save can be retried without losing latest choices', async () => {
  const writes = []; let release; let fail = true;
  const h = harness({ setItem: async (_, value) => {
    writes.push(JSON.parse(value));
    if (writes.length === 1) await new Promise((resolve) => { release = resolve; });
    if (fail) { fail = false; throw new Error('disk full'); }
  } });
  const { trial, toggleOutfitFeedback } = fixture(h);
  const { saveOutfitTrial } = h.load('services/outfitTrialStorage.ts');
  const first = saveOutfitTrial(trial);
  const rejected = assert.rejects(first, /disk full/);
  const next = toggleOutfitFeedback(trial, trial.outfits[0].items, 'aesthetic', 'like');
  const second = saveOutfitTrial(next);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(writes.length, 1);
  release();
  await rejected; await second;
  assert.deepEqual(writes[1].feedback, next.feedback);
});

test('corrupted or mismatched saved feedback is surfaced, not silently discarded', async () => {
  for (const kind of ['json', 'occasion', 'items']) {
    const h = harness();
    const { trial, toggleOutfitFeedback } = fixture(h);
    const next = toggleOutfitFeedback(trial, trial.outfits[0].items, 'aesthetic', 'like');
    if (kind === 'occasion') next.feedback[0].occasion = '运动';
    if (kind === 'items') next.feedback[0].items.top = 'unknown-top';
    const fresh = harness({ getItem: async () => kind === 'json' ? '{' : JSON.stringify(next) });
    await assert.rejects(fresh.load('services/outfitTrialStorage.ts').loadOutfitTrial());
  }
});

test('cards resolve actual photo URIs, mark missing slots only, and hide feedback for empty outfits', () => {
  const h = harness();
  const Card = h.load('components/outfit/WardrobeTrialCard.tsx').default;
  const render = (outfit, choice) => renderToStaticMarkup(React.createElement(Card, {
    outfit, wardrobe: context().wardrobe, title: '试搭 1', choice, onChoose: () => {},
  }));
  const html = render(outfits()[0], { aesthetic: 'like', thermal: 'tooCold' });
  for (const id of Object.values(outfits()[0].items)) assert.ok(html.includes('https://wardrobe.test/' + id + '.jpg'));
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 2);
  const partial = render({ items: { top: 'top-a', outerwear: null, bottoms: null, shoes: 'shoes-a' }, missingSlots: ['bottoms'] });
  assert.match(partial, /缺少下装/);
  assert.doesNotMatch(partial, /缺少外套/);
  const empty = render({ items: { top: null, outerwear: null, bottoms: null, shoes: null }, missingSlots: ['top', 'bottoms', 'shoes'] });
  assert.doesNotMatch(empty, /<button/);
});

test('selected period forwards its own apparent temperature and never fills missing data from current weather', () => {
  const { getPeriodTrialWeather } = harness().load('services/dailyOutfitPlan.ts');
  const plan = { recommendation: {}, weather: { minTemperature: 18, maxTemperature: 22, minApparent: 16,
    maxWind: 12, maxRainProbability: 20, precipitation: 0, weather_code: 3 } };
  assert.equal(getPeriodTrialWeather(plan).apparent_temperature, 16);
  assert.equal(getPeriodTrialWeather(plan).wind_speed_10m, 12);
  assert.equal(getPeriodTrialWeather({ ...plan, weather: { ...plan.weather, minApparent: null } }), null);
  assert.equal(getPeriodTrialWeather({ ...plan, recommendation: null }), null);
});
