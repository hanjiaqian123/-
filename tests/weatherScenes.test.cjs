const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Use the project's existing in-memory TS test pattern; no generated files.
const source = ts.transpileModule(
  fs.readFileSync(path.resolve(__dirname, '../theme/weatherScenes.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
const sceneModule = { exports: {} };
new Function('require', 'module', 'exports', source)(require, sceneModule, sceneModule.exports);
const { SCENES, getWeatherSceneId, getWeatherScene } = sceneModule.exports;

for (const code of [0, 1, 2]) {
  test(`WMO ${code} selects the correct day and night scene`, () => {
    const prefix = code === 2 ? 'partly-cloudy' : 'clear';
    assert.equal(getWeatherSceneId({ weather_code: code, is_day: 1 }), `${prefix}-day`);
    assert.equal(getWeatherSceneId({ weather_code: code, is_day: 0 }), `${prefix}-night`);
  });
}

const codeGroups = {
  overcast: [3],
  fog: [45, 48],
  drizzle: [51, 53, 55, 56, 57],
  rain: [61, 63, 65, 66, 67, 80, 81, 82],
  thunderstorm: [95, 96, 99],
  snow: [71, 73, 75, 77, 85, 86],
  sleet: [68, 69],
};
for (const [sceneId, codes] of Object.entries(codeGroups)) {
  test(`${sceneId} maps every specified WMO code in both day and night`, () => {
    for (const weather_code of codes) {
      for (const is_day of [0, 1]) {
        const weather = { weather_code, is_day };
        assert.equal(getWeatherSceneId(weather), sceneId, `WMO ${weather_code}, is_day ${is_day}`);
        assert.strictEqual(getWeatherScene(weather), SCENES[sceneId]);
      }
    }
  });
}

test('unknown and invalid weather codes fall back to overcast, including gaps in WMO codes', () => {
  const known = new Set([0, 1, 2, ...Object.values(codeGroups).flat()]);
  const unknown = Array.from({ length: 100 }, (_, code) => code).filter(code => !known.has(code));
  for (const weather_code of [...unknown, -1, 100, 999, 61.5, NaN, Infinity, undefined, null, '61']) {
    for (const is_day of [0, 1]) {
      assert.equal(getWeatherSceneId({ weather_code, is_day }), 'overcast');
      assert.strictEqual(getWeatherScene({ weather_code, is_day }), SCENES.overcast);
    }
  }
});

test('invalid daylight flags fall back for daylight-dependent scenes without hiding rain or snow', () => {
  for (const is_day of [-1, 2, NaN, undefined, null, '1', true]) {
    for (const weather_code of [0, 1, 2]) {
      assert.equal(getWeatherSceneId({ weather_code, is_day }), 'overcast');
    }
    assert.equal(getWeatherSceneId({ weather_code: 61, is_day }), 'rain');
    assert.equal(getWeatherSceneId({ weather_code: 71, is_day }), 'snow');
  }
});

test('exactly 11 scenes provide complete colors and bounded visual presets', () => {
  const ids = ['clear-day', 'clear-night', 'partly-cloudy-day', 'partly-cloudy-night',
    'overcast', 'fog', 'drizzle', 'rain', 'thunderstorm', 'snow', 'sleet'];
  assert.deepEqual(Object.keys(SCENES).sort(), ids.sort());
  const budgets = { none: 0, glow: 3, stars: 80, fog: 8, rain: 120, snow: 100, sleet: 100 };
  for (const scene of Object.values(SCENES)) {
    assert.equal(scene.skyGradient.length, 3);
    for (const color of [...scene.skyGradient, scene.clouds.main, scene.clouds.shadow,
      scene.clouds.highlight, scene.text.primary, scene.text.secondary, scene.particles.color]) {
      assert.match(color, /^#[\da-f]{6}$/i);
    }
    assert.ok(scene.clouds.coverage >= 0 && scene.clouds.coverage <= 1);
    assert.ok(scene.particles.intensity >= 0 && scene.particles.intensity <= 1);
    assert.ok(Object.hasOwn(budgets, scene.particles.type));
    assert.ok(Number.isInteger(scene.particles.maxCount) && scene.particles.maxCount >= 0);
    assert.ok(scene.particles.maxCount <= budgets[scene.particles.type]);
    assert.ok(['warm', 'cool', 'neutral'].includes(scene.tone));
    assert.equal(typeof scene.particles.lightning, 'boolean');
  }
});

test('particle presets distinguish drizzle, rain, snow, sleet and lightning', () => {
  assert.ok(SCENES.drizzle.particles.intensity < SCENES.rain.particles.intensity);
  assert.equal(SCENES.snow.particles.type, 'snow');
  assert.equal(SCENES.sleet.particles.type, 'sleet');
  assert.equal(SCENES.fog.particles.type, 'fog');
  assert.equal(SCENES.overcast.particles.type, 'none');
  for (const [id, scene] of Object.entries(SCENES)) {
    assert.equal(scene.particles.lightning, id === 'thunderstorm');
  }
});

test('mapping is deterministic and does not mutate weather or presets', () => {
  const before = JSON.stringify(SCENES);
  for (const weather_code of [0, 1, 2, ...Object.values(codeGroups).flat()]) {
    for (const is_day of [0, 1]) {
      const weather = Object.freeze({ weather_code, is_day });
      const first = getWeatherScene(weather);
      assert.strictEqual(first, getWeatherScene(weather));
      assert.strictEqual(first, SCENES[getWeatherSceneId(weather)]);
      assert.deepEqual(weather, { weather_code, is_day });
    }
  }
  assert.equal(JSON.stringify(SCENES), before);
});
