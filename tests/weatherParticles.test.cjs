const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loader(mocks = {}) {
  const cache = new Map();
  function load(relative) {
    const file = path.resolve(__dirname, '..', relative);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const localRequire = name => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (!name.startsWith('.')) return require(name);
      const base = path.resolve(path.dirname(file), name);
      return load(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx');
    };
    new Function('require', 'module', 'exports', source)(localRequire, module, module.exports);
    return module.exports;
  }
  return load;
}
const load = loader();
const shared = value => ({ value, set(next) { this.value = next; } });
const model = load('components/weather/weatherParticleModel.ts');
const { SCENES } = load('theme/weatherScenes.ts');
const { getParticleCount, createWeatherParticles, getParticlePosition, getLightningPulse,
  LIGHTNING_DURATION, LIGHTNING_INTERVALS, LIGHTNING_SCREEN_OPACITY, particleFrameSeconds } = model;

test('all five effects have scene-driven types; dry scenes add no duplicate stars or glow', () => {
  for (const [scene, kinds] of [['rain', ['rain']], ['snow', ['snow']], ['fog', ['fog']],
    ['thunderstorm', ['rain']], ['sleet', ['rain', 'snow']]]) {
    const field = createWeatherParticles(scene, 390, 844);
    assert.ok(field.length > 0);
    assert.deepEqual([...new Set(field.map(p => p.kind))].sort(), kinds.sort());
  }
  for (const scene of ['clear-day', 'clear-night', 'partly-cloudy-day', 'partly-cloudy-night', 'overcast']) {
    assert.equal(createWeatherParticles(scene, 390, 844).length, 0);
  }
  assert.equal(SCENES.thunderstorm.particles.lightning, true);
});

test('budgets respect scene caps, screen area and pixel density', () => {
  for (const scene of Object.keys(SCENES)) {
    for (const [width, height, density] of [[320, 568, 2], [390, 844, 3], [2048, 2048, 4], [9999, 9999, 1]]) {
      const count = getParticleCount(scene, width, height, density);
      assert.ok(count >= 0 && count <= SCENES[scene].particles.maxCount);
      assert.ok(Number.isInteger(count));
    }
  }
  assert.ok(getParticleCount('rain', 320, 568, 3) < getParticleCount('rain', 390, 844, 3));
  assert.ok(getParticleCount('rain', 390, 844, 4) < getParticleCount('rain', 390, 844, 2));
  assert.ok(getParticleCount('drizzle', 390, 844, 3) < getParticleCount('rain', 390, 844, 3));
  for (const size of [0, -1, NaN, Infinity]) assert.equal(getParticleCount('rain', size, 800, 3), 0);
});

test('sleet shares one total budget, with both kinds and unique IDs', () => {
  const particles = createWeatherParticles('sleet', 390, 844);
  const rain = particles.filter(p => p.kind === 'rain').length;
  const snow = particles.filter(p => p.kind === 'snow').length;
  assert.equal(rain + snow, getParticleCount('sleet', 390, 844, 3));
  assert.ok(rain > 0 && snow > 0 && Math.abs(rain - snow) <= 1);
  assert.equal(new Set(particles.map(p => p.id)).size, particles.length);
});

test('seeded particles are stable; rain lengths/speeds/opacity and snow sizes/sway vary', () => {
  for (const scene of ['rain', 'snow', 'fog', 'sleet', 'thunderstorm']) {
    const particles = createWeatherParticles(scene, 390, 844);
    assert.deepEqual(particles, createWeatherParticles(scene, 390, 844));
    for (const field of ['height', 'speed', 'opacity']) assert.ok(new Set(particles.map(p => p[field])).size > 1);
  }
  const snow = createWeatherParticles('snow', 390, 844);
  assert.ok(new Set(snow.map(p => p.sway)).size > 1);
  const fog = createWeatherParticles('fog', 390, 844);
  assert.ok(fog.every(p => p.opacity <= 0.08 && p.speed <= 8));
});

test('rain and snow fall; snow sways; fog moves horizontally without invented wind input', () => {
  for (const scene of ['rain', 'snow', 'fog']) {
    const p = { ...createWeatherParticles(scene, 390, 844)[0], x: 100, y: 100, phase: 0 };
    const start = getParticlePosition(p, 0, 390, 844);
    const later = getParticlePosition(p, 0.1, 390, 844);
    if (scene === 'fog') assert.ok(later.x > start.x);
    else assert.ok(later.y > start.y);
    if (scene === 'snow') assert.notEqual(later.x, start.x);
    if (scene === 'rain') assert.equal(later.x, start.x);
  }
});

test('particle seams wrap fully offscreen for rain, snow and fog', () => {
  for (const scene of ['rain', 'snow', 'fog']) {
    const p = { ...createWeatherParticles(scene, 390, 844)[0], x: 0, y: 0 };
    const horizontal = p.kind === 'fog';
    const viewport = horizontal ? 390 : 844;
    const halfSize = (horizontal ? p.width : p.height) / 2;
    const crossing = (viewport + halfSize + 4) / p.speed;
    const before = getParticlePosition(p, crossing - 0.0001, 390, 844);
    const after = getParticlePosition(p, crossing + 0.0001, 390, 844);
    const axis = horizontal ? 'x' : 'y';
    assert.ok(before[axis] - halfSize > viewport);
    assert.ok(after[axis] + halfSize < 0);
  }
});

test('lightning is brief, low amplitude, separated by long quiet intervals', () => {
  assert.ok(LIGHTNING_SCREEN_OPACITY <= 0.06);
  assert.ok(LIGHTNING_DURATION <= 0.25);
  assert.ok(Math.min(...LIGHTNING_INTERVALS) > 8);
  assert.equal(getLightningPulse(0), 0);
  let elapsed = 0;
  for (const interval of LIGHTNING_INTERVALS) {
    assert.equal(getLightningPulse(elapsed + interval / 2), 0);
    assert.ok(getLightningPulse(elapsed + interval - LIGHTNING_DURATION / 2) > 0.99);
    elapsed += interval;
  }
  for (let t = 0; t < 120; t += 0.01) {
    const pulse = getLightningPulse(t);
    assert.ok(pulse >= 0 && pulse <= 1);
  }
});

test('first resumed frame does not advance, large deltas are bounded', () => {
  assert.equal(particleFrameSeconds(null), 0);
  assert.equal(particleFrameSeconds(NaN), 0);
  assert.equal(particleFrameSeconds(3600000), 0.05);
  assert.equal(particleFrameSeconds(16), 0.016);
});

// Exercise the actual component effects with controlled hooks/frame callbacks.
// This verifies JS lifecycle wiring, not native rendering or on-device frame rate.
function componentHarness() {
  const slots = [];
  let cursor = 0;
  let effects = [];
  const frames = [];
  const slot = factory => { const index = cursor++; return slots[index] ?? (slots[index] = factory()); };
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const mocks = {
    react: {
      memo: fn => fn,
      useState: initial => { const state = slot(() => ({ value: initial }));
        return [state.value, value => { state.value = typeof value === 'function' ? value(state.value) : value; }]; },
      useMemo: (fn, deps) => { const state = slot(() => ({}));
        if (!same(state.deps, deps)) { state.value = fn(); state.deps = deps; } return state.value; },
      useEffect: (fn, deps) => { const state = slot(() => ({}));
        if (!same(state.deps, deps)) effects.push(() => { state.cleanup?.(); state.cleanup = fn(); state.deps = deps; }); },
    },
    'react-native': { View: 'View', PixelRatio: { get: () => 3 },
      StyleSheet: { create: value => value, absoluteFill: {} } },
    'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
    'react-native-reanimated': {
      default: { View: 'AnimatedView' },
      useSharedValue: value => slot(() => shared(value)),
      useAnimatedStyle: fn => ({ read: fn }),
      useFrameCallback: callback => {
        const frame = slot(() => {
          const result = { active: false, callback, setActive(value) { this.active = value; } };
          frames.push(result); return result;
        });
        frame.callback = callback;
        return frame;
      },
    },
  };
  const Component = loader(mocks)('components/weather/WeatherParticles.tsx').default;
  let tree;
  return {
    frames,
    render(props) { cursor = 0; effects = []; tree = Component(props); effects.forEach(effect => effect()); return tree; },
    layout() { tree.props.onLayout({ nativeEvent: { layout: { width: 390, height: 844 } } }); },
    tick(delta) { frames.filter(frame => frame.active).forEach(frame => frame.callback({ timeSincePreviousFrame: delta })); },
    unmount() { slots.forEach(state => state.cleanup?.()); },
  };
}

test('actual particle effect wiring pauses/resumes and clears lightning for reduced motion/background', () => {
  const h = componentHarness();
  const lightning = shared(0);
  const props = { scene: 'thunderstorm', animate: true, lightning };
  h.render(props); h.layout();
  let tree = h.render(props);
  assert.equal(h.frames.filter(frame => frame.active).length, 1);
  const time = tree.props.children[0][0].props.time;
  for (let i = 0; i < 166; i++) h.tick(50); // Within the first pulse.
  assert.ok(lightning.value > 0);
  tree = h.render({ ...props, animate: false });
  assert.equal(lightning.value, 0);
  assert.equal(h.frames.filter(frame => frame.active).length, 0);
  const pausedTime = time.value;
  h.tick(10000);
  assert.equal(time.value, pausedTime);
  assert.equal(tree.props.children[1].props.style[2].read().opacity, 0);
  h.render(props);
  h.tick(null);
  assert.equal(time.value, pausedTime);
  h.tick(16);
  assert.equal(lightning.value, 0); // Does not replay paused lightning.
  assert.ok(time.value > pausedTime);
  h.unmount();
  assert.equal(lightning.value, 0);
  assert.equal(h.frames.filter(frame => frame.active).length, 0);
});

test('initial reduced motion has static particles and no active callback or flash', () => {
  const h = componentHarness();
  const props = { scene: 'thunderstorm', animate: false, lightning: shared(0) };
  h.render(props); h.layout();
  const tree = h.render(props);
  assert.ok(tree.props.children[0].length > 0);
  assert.equal(h.frames.filter(frame => frame.active).length, 0);
  assert.equal(tree.props.children[1].props.style[2].read().opacity, 0);
  h.unmount();
});

test('rapid keyed scene replacement disposes each field; dry scenes run no particle clock', () => {
  const previous = [];
  const lightning = shared(0);
  for (let i = 0; i < 30; i++) {
    previous.at(-1)?.unmount();
    const scene = ['thunderstorm', 'snow', 'fog', 'sleet', 'clear-day'][i % 5];
    const h = componentHarness();
    previous.push(h);
    const props = { scene, animate: true, lightning };
    h.render(props); h.layout();
    const tree = h.render(props);
    assert.equal(tree.props.children[0].length, getParticleCount(scene, 390, 844, 3));
    assert.ok(previous.flatMap(item => item.frames).filter(frame => frame.active).length <= 1);
    assert.equal(lightning.value, 0);
  }
  previous.at(-1).unmount();
  assert.equal(previous.flatMap(item => item.frames).filter(frame => frame.active).length, 0);
});
