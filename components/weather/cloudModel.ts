import { SCENES, type WeatherSceneId } from '../../theme/weatherScenes';

/** Optional visual inputs; this module never fills in or mutates weather data. */
export type CloudWeatherInput = {
  cloud_cover?: number;
  wind_speed_10m?: number;
  wind_direction_10m?: number;
};

export const CLOUD_DEPTHS = [
  { id: 'far', size: 0.38, opacity: 0.28, speed: 0.32 },
  { id: 'middle', size: 0.65, opacity: 0.44, speed: 0.62 },
  { id: 'near', size: 1, opacity: 0.6, speed: 1 },
] as const;
export const CLOUDS_PER_DEPTH = 3;
export const MAX_CLOUDS = CLOUD_DEPTHS.length * CLOUDS_PER_DEPTH;

export type CloudShape = {
  id: string;
  depth: number;
  slot: number;
  x: number;
  y: number;
  width: number;
  height: number;
  phase: number;
  tempo: number;
  lobes: readonly { x: number; y: number; width: number; height: number }[];
};

const valid = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function getCloudCoverage(scene: WeatherSceneId, cloudCover?: number): number {
  return valid(cloudCover) ? clamp(cloudCover, 0, 100) / 100 : SCENES[scene].clouds.coverage;
}

export function getCloudWind(speed?: number, direction?: number) {
  // Visual pixels/second, not a geographic simulation. Cap storms for mobile comfort.
  const pixelsPerSecond = valid(speed) ? clamp(speed, 0, 120) * 0.32 : 2;
  const hasDirection = valid(direction) && direction >= 0 && direction <= 360;
  if (!hasDirection) {
    // Decorative drift only when the API omits direction; never claim this is measured wind.
    return { x: pixelsPerSecond, y: 0, source: 'decorative' as const };
  }
  const radians = direction * Math.PI / 180;
  // Meteorological FROM bearing -> TO vector. Screen x points east; y points south.
  return { x: -Math.sin(radians) * pixelsPerSecond, y: Math.cos(radians) * pixelsPerSecond,
    source: valid(speed) ? 'weather' as const : 'decorative' as const };
}

export function getCloudAppearance(coverage: number, depth: number, slot: number) {
  const amount = clamp(coverage, 0, 1);
  return {
    opacity: CLOUD_DEPTHS[depth].opacity * (0.3 + 0.7 * amount) * clamp(amount * CLOUDS_PER_DEPTH - slot, 0, 1),
    scale: 0.8 + 0.45 * amount,
  };
}

function mixColor(color: string, night: string): string {
  return '#' + [1, 3, 5].map(offset => Math.round(
    parseInt(color.slice(offset, offset + 2), 16) * 0.35 + parseInt(night.slice(offset, offset + 2), 16) * 0.65,
  ).toString(16).padStart(2, '0')).join('');
}

export function getCloudPalette(scene: WeatherSceneId, isDay?: number) {
  const { main, shadow, highlight } = SCENES[scene].clouds;
  if (isDay !== 0 || scene === 'clear-night' || scene === 'partly-cloudy-night') {
    return { main, shadow, highlight };
  }
  const night = SCENES['clear-night'].clouds;
  return { main: mixColor(main, night.main), shadow: mixColor(shadow, night.shadow),
    highlight: mixColor(highlight, night.highlight) };
}

/** Stable shapes independent of city/weather; regenerate only when layout changes. */
export function createCloudShapes(width: number, height: number, seed = 731): CloudShape[] {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  return CLOUD_DEPTHS.flatMap((layer, depth) => Array.from({ length: CLOUDS_PER_DEPTH }, (_, slot) => {
    const cloudWidth = Math.min(width, 520) * 0.78 * layer.size * (0.92 + random() * 0.16);
    const cloudHeight = cloudWidth * (0.32 + random() * 0.06);
    return {
      id: `${layer.id}-${slot}`, depth, slot,
      width: cloudWidth, height: cloudHeight,
      x: width * ((slot + 0.2 + random() * 0.5) / CLOUDS_PER_DEPTH),
      y: height * (0.05 + random() * 0.78),
      phase: random() * Math.PI * 2,
      tempo: 0.15 + random() * 0.12,
      lobes: Array.from({ length: 5 }, (_, index) => ({
        x: 0.03 + index * 0.14 + random() * 0.025,
        y: 0.22 - Math.sin(index / 4 * Math.PI) * 0.17 + random() * 0.04,
        width: 0.33 + random() * 0.07,
        height: 0.5 + Math.sin(index / 4 * Math.PI) * 0.22 + random() * 0.06,
      })),
    };
  }));
}

/** Wrap centers only beyond a full cloud's padded extent; resets happen offscreen. */
export function wrapCloudPosition(position: number, viewport: number, margin: number): number {
  'worklet';
  const span = viewport + margin * 2;
  return ((position + margin) % span + span) % span - margin;
}

export function cloudFrameSeconds(elapsed: number | null): number {
  'worklet';
  // First frame after resume does not advance; stalled frames never cause a big jump.
  return elapsed === null || !Number.isFinite(elapsed) ? 0 : Math.max(0, Math.min(elapsed, 64)) / 1000;
}
