const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = ts.transpileModule(
  fs.readFileSync(path.resolve(__dirname, '../components/weather/weatherSkyTransition.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
const transitionModule = { exports: {} };
new Function('require', 'module', 'exports', source)(require, transitionModule, transitionModule.exports);
const { createSkyTransition, skyTransitionReducer: reduce, SKY_TRANSITION_DURATION } = transitionModule.exports;
const request = (state, scene, animate = true) => reduce(state, { type: 'request', scene, animate });
const complete = state => reduce(state, { type: 'finished', revision: state.revision });
const displayed = state => state.scenes[state.front];

test('first render has a settled sky; transitions take 1000ms', () => {
  const state = createSkyTransition('overcast');
  assert.equal(displayed(state), 'overcast');
  assert.equal(state.incoming, null);
  assert.equal(state.pending, null);
  assert.equal(SKY_TRANSITION_DURATION, 1000);
});

test('day to night only recolors the hidden slot, then settles on night', () => {
  const initial = createSkyTransition('clear-day');
  const fading = request(initial, 'clear-night');
  assert.equal(displayed(fading), 'clear-day');
  assert.notEqual(fading.front, fading.incoming);
  assert.equal(fading.scenes[fading.incoming], 'clear-night');
  const settled = complete(fading);
  assert.equal(displayed(settled), 'clear-night');
  assert.equal(settled.incoming, null);
});

test('rapid city changes coalesce to the latest scene without recoloring a visible layer', () => {
  const fading = request(createSkyTransition('clear-day'), 'rain');
  const queued = request(request(fading, 'snow'), 'thunderstorm');
  assert.strictEqual(queued.scenes, fading.scenes);
  assert.equal(queued.revision, fading.revision);
  assert.equal(queued.pending, 'thunderstorm');
  const next = complete(queued);
  assert.equal(displayed(next), 'rain');
  assert.equal(next.scenes[next.incoming], 'thunderstorm');
  assert.equal(next.pending, null);
  assert.equal(displayed(complete(next)), 'thunderstorm');
});

test('returning to the incoming scene removes an obsolete pending destination', () => {
  const fading = request(createSkyTransition('clear-day'), 'rain');
  const latest = request(request(fading, 'snow'), 'rain');
  assert.equal(latest.pending, null);
  assert.equal(complete(latest).incoming, null);
  assert.equal(displayed(complete(latest)), 'rain');
});

test('returning to the original city during a fade smoothly transitions back', () => {
  const fading = request(createSkyTransition('clear-day'), 'rain');
  const back = complete(request(fading, 'clear-day'));
  assert.equal(displayed(back), 'rain');
  assert.equal(back.scenes[back.incoming], 'clear-day');
  assert.equal(displayed(complete(back)), 'clear-day');
});

test('same-scene weather updates do not restart or enqueue animations', () => {
  const state = createSkyTransition('snow');
  assert.strictEqual(request(state, 'snow'), state);
  const fading = request(state, 'rain');
  assert.strictEqual(request(fading, 'rain'), fading);
});

test('background, lost focus or reduced motion snaps to latest and discards stale callbacks', () => {
  const fading = request(createSkyTransition('clear-day'), 'rain');
  const queued = request(fading, 'snow');
  const stopped = request(queued, 'snow', false);
  assert.equal(displayed(stopped), 'snow');
  assert.equal(stopped.incoming, null);
  assert.equal(stopped.pending, null);
  assert.strictEqual(reduce(stopped, { type: 'finished', revision: fading.revision }), stopped);
  assert.strictEqual(request(stopped, 'snow', true), stopped); // No replay on resume.
  const resumed = request(stopped, 'fog');
  assert.strictEqual(reduce(resumed, { type: 'finished', revision: fading.revision }), resumed);
  assert.equal(displayed(complete(resumed)), 'fog');
});

test('weather changes while motion is disabled are immediately reflected', () => {
  let state = createSkyTransition('rain');
  for (const scene of ['clear-night', 'snow', 'sleet', 'overcast']) {
    state = request(state, scene, false);
    assert.equal(displayed(state), scene);
    assert.equal(state.incoming, null);
    assert.equal(state.pending, null);
  }
  assert.strictEqual(request(state, 'overcast'), state);
});

test('duplicate completions cannot finish a newer transition', () => {
  const fading = request(createSkyTransition('fog'), 'rain');
  const next = complete(request(fading, 'snow'));
  assert.strictEqual(reduce(next, { type: 'finished', revision: fading.revision }), next);
  const settled = complete(next);
  assert.strictEqual(complete(settled), settled);
});

test('a burst of 1000 changes always uses exactly two slots and eventually shows the latest', () => {
  const scenes = ['clear-day', 'clear-night', 'rain', 'snow', 'sleet', 'thunderstorm', 'fog'];
  let state = createSkyTransition('overcast');
  let latest;
  for (let index = 0; index < 1000; index++) {
    latest = scenes[index % scenes.length];
    Object.freeze(state.scenes);
    Object.freeze(state);
    state = request(state, latest);
    if (index % 7 === 0 && state.incoming !== null) state = complete(state);
    assert.equal(state.scenes.length, 2);
  }
  for (let count = 0; count < 2 && state.incoming !== null; count++) state = complete(state);
  assert.equal(state.incoming, null);
  assert.equal(state.pending, null);
  assert.equal(displayed(state), latest);
});
