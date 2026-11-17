const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function load(relative) {
  const file = path.resolve(__dirname, '..', relative);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = name => name.startsWith('.')
    ? load(path.resolve(path.dirname(file), name + '.ts')) : require(name);
  new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports);
  return module.exports;
}
const { CLOUD_DEPTHS, MAX_CLOUDS, getCloudCoverage, getCloudWind, getCloudAppearance,
  getCloudPalette, createCloudShapes, wrapCloudPosition, cloudFrameSeconds } = load('components/weather/cloudModel.ts');
const { SCENES } = load('theme/weatherScenes.ts');
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('meteorological FROM wind is converted to screen TO direction for all compass points', () => {
  for (const [bearing, x, y] of [[0, 0, 1], [90, -1, 0], [180, 0, -1], [270, 1, 0], [360, 0, 1]]) {
    const wind = getCloudWind(10, bearing);
    close(wind.x, x * 3.2); close(wind.y, y * 3.2);
    assert.equal(wind.source, 'weather');
  }
  const northEast = getCloudWind(10, 45);
  assert.ok(northEast.x < 0 && northEast.y > 0); // Moves southwest.
  close(Math.hypot(northEast.x, northEast.y), 3.2);
});

test('wind speed scales motion, calm is stationary, extremes are bounded', () => {
  close(Math.hypot(getCloudWind(0, 45).x, getCloudWind(0, 45).y), 0);
  close(getCloudWind(20, 270).x, 2 * getCloudWind(10, 270).x);
  close(getCloudWind(999, 270).x, getCloudWind(120, 270).x);
  close(getCloudWind(-4, 270).x, 0);
});

test('missing or invalid weather is explicitly decorative, never NaN motion', () => {
  for (const direction of [undefined, NaN, Infinity, -1, 361]) {
    const wind = getCloudWind(20, direction);
    assert.equal(wind.source, 'decorative');
    assert.ok(Number.isFinite(wind.x) && Number.isFinite(wind.y));
  }
  assert.equal(getCloudWind(undefined, 90).source, 'decorative');
  assert.equal(getCloudWind(NaN, 90).source, 'decorative');
});

test('actual cloud cover overrides scene presets including explicit zero, with safe bounds', () => {
  assert.equal(getCloudCoverage('overcast', 0), 0);
  assert.equal(getCloudCoverage('clear-day', 100), 1);
  assert.equal(getCloudCoverage('rain', 50), 0.5);
  assert.equal(getCloudCoverage('rain', -20), 0);
  assert.equal(getCloudCoverage('rain', 120), 1);
  for (const invalid of [undefined, NaN, Infinity, null]) {
    assert.equal(getCloudCoverage('overcast', invalid), SCENES.overcast.clouds.coverage);
  }
});

test('cloud cover increases visible count, area and opacity within a nine-cloud budget', () => {
  const shapes = createCloudShapes(390, 800);
  let previousCount = 0;
  for (const amount of [0, 0.08, 0.3, 0.5, 0.8, 1]) {
    const visible = shapes.filter(shape => getCloudAppearance(amount, shape.depth, shape.slot).opacity > 0);
    assert.ok(visible.length >= previousCount && visible.length <= MAX_CLOUDS);
    if (amount === 0) assert.equal(visible.length, 0);
    if (amount === 1) assert.equal(visible.length, 9);
    previousCount = visible.length;
  }
  assert.ok(getCloudAppearance(1, 2, 0).scale > getCloudAppearance(0.1, 2, 0).scale);
  assert.ok(getCloudAppearance(1, 2, 0).opacity > getCloudAppearance(0.1, 2, 0).opacity);
});

test('three depths have strictly increasing size, opacity and movement speed', () => {
  assert.deepEqual(CLOUD_DEPTHS.map(layer => layer.id), ['far', 'middle', 'near']);
  for (const field of ['size', 'opacity', 'speed']) {
    assert.ok(CLOUD_DEPTHS[0][field] < CLOUD_DEPTHS[1][field]);
    assert.ok(CLOUD_DEPTHS[1][field] < CLOUD_DEPTHS[2][field]);
  }
});

test('seeded geometry is stable, varied, bounded and uses elongated lobes', () => {
  for (const [width, height] of [[320, 600], [390, 800], [800, 390], [1200, 1600]]) {
    const shapes = createCloudShapes(width, height);
    assert.deepEqual(shapes, createCloudShapes(width, height));
    assert.equal(shapes.length, 9);
    assert.equal(new Set(shapes.map(shape => shape.id)).size, 9);
    assert.equal(new Set(shapes.map(shape => shape.phase)).size, 9);
    for (const shape of shapes) {
      assert.ok(shape.width > shape.height * 2);
      assert.ok(shape.x >= 0 && shape.x <= width && shape.y >= 0 && shape.y <= height);
      assert.equal(shape.lobes.length, 5); // Plus base, highlight and shadow = 8 ellipses.
      for (const lobe of shape.lobes) {
        assert.ok(lobe.width * shape.width > lobe.height * shape.height);
      }
    }
  }
  assert.notDeepEqual(createCloudShapes(390, 800, 1), createCloudShapes(390, 800, 2));
});

test('day/night colors differ for overcast, rain and snow as well as clear weather', () => {
  for (const scene of ['overcast', 'rain', 'snow', 'sleet', 'thunderstorm']) {
    assert.notDeepEqual(getCloudPalette(scene, 0), getCloudPalette(scene, 1));
    for (const color of Object.values(getCloudPalette(scene, 0))) assert.match(color, /^#[0-9a-f]{6}$/i);
  }
  assert.equal(getCloudPalette('clear-night', 0).main, SCENES['clear-night'].clouds.main);
  assert.notEqual(getCloudPalette('clear-day', 1).main, getCloudPalette('clear-night', 0).main);
});

test('wrapping is periodic in both directions and normal visible travel stays continuous', () => {
  for (const viewport of [320, 800]) {
    const margin = 100;
    const span = viewport + 2 * margin;
    for (const position of [-20000, -100, 0, 135, 20000]) {
      const wrapped = wrapCloudPosition(position, viewport, margin);
      assert.ok(wrapped >= -margin && wrapped < viewport + margin);
      close(wrapCloudPosition(position + span, viewport, margin), wrapped);
      close(wrapCloudPosition(position - span, viewport, margin), wrapped);
    }
    close(wrapCloudPosition(120.1, viewport, margin) - wrapCloudPosition(120, viewport, margin), 0.1);
  }
});

test('loop seams are outside the viewport even with maximum scale, bob and breathing', () => {
  for (const shape of createCloudShapes(390, 800)) {
    for (const [dimension, viewport] of [[shape.width, 390], [shape.height, 800]]) {
      const margin = dimension * 0.72 + 8;
      const extent = dimension * 0.52 * 1.25 * 1.025 + 3;
      const before = wrapCloudPosition(viewport + margin - 0.001, viewport, margin);
      const after = wrapCloudPosition(viewport + margin + 0.001, viewport, margin);
      assert.ok(before - extent > viewport);
      assert.ok(after + extent < 0);
      const reverseBefore = wrapCloudPosition(-margin + 0.001, viewport, margin);
      const reverseAfter = wrapCloudPosition(-margin - 0.001, viewport, margin);
      assert.ok(reverseBefore + extent < 0);
      assert.ok(reverseAfter - extent > viewport);
    }
  }
});

test('first resumed frame is still and stalled frames cannot teleport clouds', () => {
  assert.equal(cloudFrameSeconds(null), 0);
  assert.equal(cloudFrameSeconds(NaN), 0);
  assert.equal(cloudFrameSeconds(-1), 0);
  close(cloudFrameSeconds(16), 0.016);
  assert.equal(cloudFrameSeconds(3600000), 0.064);
  assert.ok(cloudFrameSeconds(3600000) * getCloudWind(120, 270).x < 2.5);
});
