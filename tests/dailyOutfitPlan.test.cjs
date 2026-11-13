// Synthetic inputs are test-only; production consumes fetchWeather directly.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function loadTypeScript(relative) {
  const root = path.resolve(__dirname, '..');
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (name) => name.startsWith('.')
    ? loadTypeScript(path.relative(root, path.resolve(path.dirname(file), name + '.ts'))) : require(name);
  new Function('require', 'module', 'exports', source)(localRequire, module, module.exports);
  return module.exports;
}
const { buildDailyOutfitPlan, getCityDate } = loadTypeScript('services/dailyOutfitPlan.ts');
const { buildOutfitWeatherContext, getOutfitRecommendations } = loadTypeScript('services/outfitRecommendations.ts');
const { fetchWeather } = loadTypeScript('services/weatherApi.ts');
const { searchCities } = loadTypeScript('services/citySearchApi.ts');
const day = '2026-11-13';
const now = new Date('2026-11-13T04:00:00Z');
function hour(h, overrides = {}) {
  return { time: day + 'T' + String(h).padStart(2, '0') + ':00', temperature_2m: 18,
    apparent_temperature: 17, wind_speed_10m: 10, relative_humidity_2m: 65,
    precipitation_probability: 10, precipitation: 0, weather_code: 0, is_day: 1, ...overrides };
}
const fullDay = () => Array.from({ length: 24 }, (_, h) => hour(h));
const build = (hourly = fullDay(), items = [], other = {}) => buildDailyOutfitPlan({
  hourly, items, now, timezone: 'Asia/Shanghai', ...other,
});
const item = (name, category) => ({ id: name, name, category, color: '黑色', imageUri: 'file:///test.png', createdAt: day });
function scenario(overrides = {}) {
  const rows = fullDay().map(entry => ({ ...entry, ...overrides }));
  const current = {
    temperature_2m: overrides.temperature_2m ?? 18,
    apparent_temperature: overrides.apparent_temperature ?? 17,
    precipitation: overrides.current_precipitation ?? overrides.precipitation ?? 0,
    weather_code: overrides.current_weather_code ?? overrides.weather_code ?? 0,
    wind_speed_10m: overrides.current_wind_speed_10m ?? overrides.wind_speed_10m ?? 10,
    relative_humidity_2m: 65, is_day: 1, uv_index: 1,
  };
  const home = getOutfitRecommendations(buildOutfitWeatherContext(current, rows))[0];
  const daily = build(rows)[0].recommendation;
  return { home, daily };
}
function assertHomeAndDailyAgree(result) {
  assert.ok(result.home); assert.ok(result.daily);
  for (const field of ['id', 'top', 'bottom', 'shoes', 'accessory', 'tip']) {
    assert.equal(result.home[field], result.daily[field], `首页和全天计划的 ${field} 应一致`);
  }
}

test('A: 14C / feels 12C / rain / 35kmh uses warm inner and waterproof windproof outer', () => {
  const result = scenario({ temperature_2m: 14, apparent_temperature: 12,
    weather_code: 61, precipitation: 0.4, precipitation_probability: 80,
    wind_speed_10m: 35 });
  assertHomeAndDailyAgree(result);
  assert.match(result.home.id, /^cool-/);
  assert.match(result.home.top, /防水防风保暖外层/);
  assert.match(result.home.top, /保暖针织|抓绒/);
  assert.match(result.home.tip, /湿冷/); assert.match(result.home.tip, /风力|风速/);
  assert.doesNotMatch(result.home.top + result.home.tip, /只穿衬衫|单穿衬衫/);
});

test('B: 8C clear weather keeps the original cold band', () => {
  const result = scenario({ temperature_2m: 8, apparent_temperature: 8,
    weather_code: 0, precipitation: 0, precipitation_probability: 0,
    wind_speed_10m: 5 });
  assertHomeAndDailyAgree(result);
  assert.match(result.home.id, /^cold-/); assert.match(result.home.top, /厚外套|羽绒/);
  assert.doesNotMatch(result.home.top, /防水/);
});

test('C: 18C windy weather adds a windproof outer without contradictory shirt advice', () => {
  const result = scenario({ temperature_2m: 18, apparent_temperature: 18,
    weather_code: 0, precipitation: 0, precipitation_probability: 0,
    wind_speed_10m: 35 });
  assertHomeAndDailyAgree(result);
  assert.match(result.home.id, /^mild-/); assert.match(result.home.top, /防风外层/);
  assert.match(result.home.tip, /最高风速 35\.0 km\/h/);
  assert.doesNotMatch(result.home.tip, /白天温暖时可以单穿|单穿衬衫/);
});

test('D: 25C with dry current conditions and high future rain probability adds rain gear', () => {
  const result = scenario({ temperature_2m: 25, apparent_temperature: 25,
    current_weather_code: 0, current_precipitation: 0,
    weather_code: 0, precipitation: 0, precipitation_probability: 85,
    wind_speed_10m: 10 });
  assertHomeAndDailyAgree(result);
  assert.match(result.home.id, /^hot-/); assert.match(result.home.top, /防水/);
  assert.match(result.home.shoes, /防水防滑/); assert.match(result.home.accessory, /伞/);
  assert.match(result.home.tip, /未来降雨概率最高 85%/);
});

test('actual hourly weather independently selects all three period bands', () => {
  const data = fullDay().map((entry, h) => ({ ...entry,
    temperature_2m: h < 11 ? 5 : h < 17 ? 28 : 13,
    apparent_temperature: h < 11 ? 4 : h < 17 ? 27 : 12 }));
  const plans = build(data);
  assert.deepEqual(plans.map(p => p.status), ['ready', 'ready', 'ready']);
  assert.deepEqual(plans.map(p => p.recommendation.id.split('-')[0]), ['cold', 'hot', 'cool']);
  assert.deepEqual(plans.map(p => p.observedHours), [5, 6, 7]);
  assert.deepEqual(plans.map(p => p.weather.minTemperature), [5, 28, 13]);
});
test('tomorrow morning never substitutes today; partial hours are declared', () => {
  const rows = [...fullDay().slice(12), ...fullDay().slice(0, 12).map(h => ({ ...h, time: h.time.replace(day, '2026-11-14') }))];
  const plans = build(rows);
  assert.equal(plans[0].recommendation, null);
  assert.equal(plans[0].status, 'insufficient');
  assert.equal(plans[1].status, 'partial'); assert.match(plans[1].coverage, /5\/6/);
  assert.match(plans[1].coverage, /12:00/); assert.equal(plans[2].status, 'ready');
});
test('city timezone, offset fallback, and unknown timezone use correct dates', () => {
  const instant = new Date('2026-11-13T00:30:00Z');
  assert.equal(getCityDate(instant, 'Asia/Shanghai'), day);
  assert.equal(getCityDate(instant, 'America/Los_Angeles'), '2026-11-12');
  assert.equal(getCityDate(instant, 'Invalid/City', -28800), '2026-11-12');
  assert.equal(getCityDate(instant), null);
  assert.ok(build(fullDay(), [], { timezone: undefined }).every(p => p.recommendation === null));
});
test('missing apparent temperature or wind cannot be replaced with fake values', () => {
  for (const field of ['apparent_temperature', 'wind_speed_10m']) {
    const rows = fullDay(); delete rows[7][field]; const plan = build(rows)[0];
    assert.equal(plan.recommendation, null); assert.equal(plan.weather.minTemperature, 18);
    assert.match(plan.coverage, /缺少体感温度或风速/);
  }
});
test('duplicate and invalid hours, empty and stale forecasts are handled', () => {
  const plan = build([hour(6), hour(6), hour(7, { temperature_2m: NaN }), hour(8, { precipitation: -1 }), hour(9, { time: day + 'T29:00' })])[0];
  assert.equal(plan.observedHours, 1); assert.equal(plan.status, 'partial');
  assert.ok(build([]).every(p => p.recommendation === null));
  assert.ok(build(fullDay().map(h => ({ ...h, time: h.time.replace(day, '2026-11-12') }))).every(p => p.recommendation === null));
});
test('rain, thunderstorm and wind reuse original protection and reasons', () => {
  const rows = fullDay(); rows[8] = hour(8, { weather_code: 95, wind_speed_10m: 40, precipitation: 2, precipitation_probability: 90 });
  const plan = build(rows)[0];
  assert.match(plan.recommendation.top, /防水防风/); assert.match(plan.recommendation.tip, /雷雨/);
  assert.equal(plan.recommendation.accessory, '🧢 连帽雨衣'); assert.equal(plan.weather.maxWind, 40);
  assert.ok(plan.reasons.some(r => r.includes('90%')));
});
test('snow and freezing rain retain the original cold override', () => {
  for (const code of [71, 85, 66]) {
    const plan = build(fullDay().map(h => ({ ...h, weather_code: code, apparent_temperature: 18 })))[0];
    assert.match(plan.recommendation.id, /^cold-/); assert.match(plan.recommendation.shoes, /防水防滑保暖/);
  }
});
test('all twelve styles and four temperature boundaries remain intact', () => {
  const ids = new Set();
  for (const [temperature, band] of [[8, 'cold'], [8.01, 'cool'], [15, 'cool'], [15.01, 'mild'], [22, 'mild'], [22.01, 'hot']]) {
    const out = getOutfitRecommendations({ apparent_temperature: temperature, precipitation: 0, weather_code: 0, wind_speed_10m: 0 });
    assert.equal(out.length, 3); assert.ok(out.every(o => o.id.startsWith(band))); out.forEach(o => ids.add(o.id));
  }
  assert.equal(ids.size, 12);
});
test('empty or ambiguous wardrobe names yield generic suggestions only', () => {
  for (const items of [[], [item('简约圆领上衣', '上衣'), item('日常裤子', '裤子')]]) {
    assert.ok(build(undefined, items)[0].slots.every(s => !s.item && s.generic));
  }
});
test('matching uses actual wardrobe items with category and explicit name clues', () => {
  const items = [item('薄款长袖上衣', '上衣'), item('日常直筒长裤', '裤子'), item('轻便休闲鞋', '鞋子'), item('通用物品', '配饰')];
  const plan = build(undefined, items)[0];
  assert.equal(plan.slots.find(s => s.id === 'top').item.id, items[0].id);
  assert.equal(plan.slots.find(s => s.id === 'bottom').item.id, items[1].id);
  assert.equal(plan.slots.find(s => s.id === 'shoes').item.id, items[2].id);
  assert.equal(plan.slots.find(s => s.id === 'accessory').item, undefined);
  assert.ok(plan.slots.filter(s => s.item).every(s => items.includes(s.item)));
});
test('rain/wind protection rejects unverified, negated and duplicate matches', () => {
  const rows = fullDay().map(h => ({ ...h, apparent_temperature: 12, weather_code: 61, wind_speed_10m: 35, precipitation: 1 }));
  const items = [item('连帽防水防风外套', '外套'), item('防水防滑鞋', '鞋子'), item('不防水防滑鞋', '鞋子'), item('防水鞋', '鞋子'), item('轻便外套', '外套')];
  const plan = build(rows, items)[0];
  assert.equal(plan.slots.find(s => s.id === 'outer').item.id, items[0].id);
  assert.equal(plan.slots.find(s => s.id === 'shoes').item.id, items[1].id);
  const rejected = build(rows, items.slice(2))[0];
  assert.equal(rejected.slots.find(s => s.id === 'shoes').item, undefined);
  assert.equal(rejected.slots.find(s => s.id === 'outer').item, undefined);
  const matched = plan.slots.flatMap(s => s.item ? [s.item.id] : []);
  assert.equal(matched.length, new Set(matched).size);
});
test('high rain probability adds precaution, never fake precipitation', () => {
  const plan = build(fullDay().map(h => ({ ...h, precipitation_probability: 85 })))[0];
  assert.equal(plan.weather.precipitation, 0); assert.match(plan.slots.find(s => s.id === 'accessory').generic, /伞/);
  assert.ok(plan.reasons.some(r => r.includes('概率不等于一定降雨')));
});
function apiData() {
  const rows = fullDay();
  return { latitude: 28.225, longitude: 112.933, timezone: 'Asia/Shanghai', utc_offset_seconds: 28800,
    current_units: { time: 'iso8601', interval: 'seconds', temperature_2m: '°C' },
    hourly_units: { time: 'iso8601', temperature_2m: '°C' },
    current: { ...rows[0], interval: 900, uv_index: 1 },
    hourly: Object.fromEntries(Object.keys(rows[0]).map(key => [key, rows.map(h => h[key])])) };
}
test('one weather request includes added hourly fields and returns timing metadata', async () => {
  const original = global.fetch; let calls = 0;
  try {
    global.fetch = async input => {
      calls++; const url = new URL(input);
      assert.equal(url.searchParams.get('timezone'), 'auto'); assert.equal(url.searchParams.get('forecast_hours'), '24');
      assert.ok(url.searchParams.get('hourly').includes('apparent_temperature'));
      assert.ok(url.searchParams.get('hourly').includes('wind_speed_10m'));
      assert.ok(url.searchParams.get('current').includes('uv_index'));
      return new Response(JSON.stringify(apiData()));
    };
    const data = await fetchWeather({ latitude: 28.2282, longitude: 112.9388 });
    assert.equal(calls, 1); assert.equal(data.hourly.length, 24); assert.equal(data.hourly[0].wind_speed_10m, 10);
    assert.equal(data.hourly[0].apparent_temperature, 17); assert.equal(data.timezone, 'Asia/Shanghai'); assert.equal(data.utcOffsetSeconds, 28800);
    assert.equal(data.metadata.currentTime, day + 'T00:00'); assert.equal(data.metadata.currentInterval, 900);
    assert.deepEqual(data.metadata.requestCoordinates, { latitude: 28.2282, longitude: 112.9388 });
    assert.deepEqual(data.metadata.responseCoordinates, { latitude: 28.225, longitude: 112.933 });
    assert.equal(data.metadata.units.current.temperature_2m, '°C'); assert.equal(data.metadata.units.hourly.temperature_2m, '°C');
  } finally { global.fetch = original; }
});
test('Chinese Changsha search verifies Hunan administration and preserves other searches', async () => {
  const original = global.fetch; const queries = [];
  try {
    global.fetch = async input => {
      const name = new URL(input).searchParams.get('name'); queries.push(name);
      if (name === '长沙') return new Response(JSON.stringify({ results: [
        { id: 1, name: '长沙', latitude: 31, longitude: 108.3, country: '中国', admin1: '重庆市', timezone: 'Asia/Shanghai' },
      ] }));
      if (name === 'Changsha') return new Response(JSON.stringify({ results: [
        { id: 2, name: '长沙市', latitude: 28.19874, longitude: 112.97087, country: '中国', admin1: '湖南', timezone: 'Asia/Shanghai' },
      ] }));
      return new Response(JSON.stringify({ results: [
        { id: 3, name: '北京', latitude: 39.9, longitude: 116.4, country: '中国', admin1: '北京市', timezone: 'Asia/Shanghai' },
      ] }));
    };
    const changsha = await searchCities('长沙');
    assert.deepEqual(queries, ['长沙', 'Changsha']);
    assert.equal(changsha[0].id, 2); assert.equal(changsha[0].admin1, '湖南'); assert.equal(changsha[0].country, '中国');
    queries.length = 0;
    const beijing = await searchCities('北京');
    assert.deepEqual(queries, ['北京']); assert.equal(beijing[0].id, 3);
  } finally { global.fetch = original; }
});
test('missing plan fields preserve original current/hourly data, HTTP errors propagate', async () => {
  const original = global.fetch;
  try {
    const input = apiData(); input.hourly.apparent_temperature[7] = null; delete input.hourly.wind_speed_10m;
    global.fetch = async () => new Response(JSON.stringify(input));
    const data = await fetchWeather({ latitude: 0, longitude: 0 });
    assert.equal(data.hourly.length, 24); assert.equal(data.hourly[7].apparent_temperature, undefined);
    assert.ok(build(data.hourly).every(p => p.recommendation === null));
    global.fetch = async () => new Response('', { status: 503 });
    await assert.rejects(fetchWeather({ latitude: 0, longitude: 0 }), /503/);
  } finally { global.fetch = original; }
});
