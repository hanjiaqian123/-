import { SCENES, type WeatherSceneId } from '../../theme/weatherScenes';

export type ParticleKind = 'rain' | 'snow' | 'fog';
export type WeatherParticle = {
  id: number;
  kind: ParticleKind;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  opacity: number;
  sway: number;
  phase: number;
  frequency: number;
};

export const PARTICLE_LIMITS = { rain: 120, snow: 100, sleet: 100, fog: 8 } as const;
export const LIGHTNING_SCREEN_OPACITY = 0.055;
export const LIGHTNING_DURATION = 0.22;
// Visual timing only: not an estimate of real lightning frequency.
export const LIGHTNING_INTERVALS = [8.4, 13.2, 10.6, 16.3] as const;

export function getParticleCount(scene: WeatherSceneId, width: number, height: number, pixelRatio: number): number {
  const { type, maxCount, intensity } = SCENES[scene].particles;
  if (!(type in PARTICLE_LIMITS) || !Number.isFinite(width) || !Number.isFinite(height)
    || width <= 0 || height <= 0) return 0;
  const cap = Math.min(maxCount, PARTICLE_LIMITS[type as keyof typeof PARTICLE_LIMITS]);
  const areaFactor = Math.max(0.35, Math.min(1, width * height / (390 * 844)));
  // Pixel density is a rendering-cost heuristic, not a claim about device CPU/GPU capability.
  const density = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 3;
  const densityFactor = Math.max(0.55, Math.min(1, 3 / density));
  return Math.min(cap, Math.round(cap * intensity * areaFactor * densityFactor));
}

/** Seed once per scene/layout; no random number generation in frame callbacks. */
export function createWeatherParticles(scene: WeatherSceneId, width: number, height: number, pixelRatio = 3): WeatherParticle[] {
  const config = SCENES[scene].particles;
  let seed = Array.from(scene).reduce((hash, char) => Math.imul(hash, 31) + char.charCodeAt(0), 271) >>> 0;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: getParticleCount(scene, width, height, pixelRatio) }, (_, id) => {
    const kind: ParticleKind = config.type === 'sleet' ? (id % 2 === 0 ? 'rain' : 'snow')
      : config.type === 'fog' ? 'fog' : config.type === 'snow' ? 'snow' : 'rain';
    const size = 2 + random() * 3;
    return {
      id, kind, x: random() * width, y: random() * height,
      width: kind === 'fog' ? width * (0.85 + random() * 0.65) : kind === 'snow' ? size : 0.8 + random() * 0.8,
      height: kind === 'fog' ? 32 + random() * 52 : kind === 'snow' ? size : (10 + random() * 22) * (0.6 + config.intensity * 0.4),
      speed: kind === 'fog' ? 3 + random() * 5 : kind === 'snow' ? 18 + random() * 30 : 180 + random() * 220,
      opacity: kind === 'fog' ? 0.035 + random() * 0.045 : kind === 'snow' ? 0.3 + random() * 0.4 : 0.15 + random() * 0.3,
      sway: kind === 'snow' ? 7 + random() * 19 : kind === 'fog' ? 3 + random() * 5 : 0,
      phase: random() * Math.PI * 2,
      frequency: 0.3 + random() * 0.5,
    };
  });
}

function wrap(value: number, viewport: number, margin: number): number {
  'worklet';
  const span = viewport + margin * 2;
  return ((value + margin) % span + span) % span - margin;
}

/** Positions are centers, and wrap margins enclose the entire particle. */
export function getParticlePosition(particle: WeatherParticle, time: number, width: number, height: number) {
  'worklet';
  if (particle.kind === 'fog') {
    return { x: wrap(particle.x + time * particle.speed, width, particle.width / 2 + 4),
      y: particle.y + Math.sin(time * 0.12 + particle.phase) * particle.sway };
  }
  return {
    x: particle.x + Math.sin(time * particle.frequency + particle.phase) * particle.sway,
    y: wrap(particle.y + time * particle.speed, height, particle.height / 2 + 4),
  };
}

export function particleFrameSeconds(elapsed: number | null): number {
  'worklet';
  return elapsed === null || !Number.isFinite(elapsed) ? 0 : Math.max(0, Math.min(elapsed, 50)) / 1000;
}

/** A single soft pulse with no strobe/double flash; long, varied quiet intervals. */
export function getLightningPulse(time: number): number {
  'worklet';
  if (!Number.isFinite(time) || time < 0) return 0;
  const cycle = 8.4 + 13.2 + 10.6 + 16.3;
  let remaining = time % cycle;
  for (let index = 0; index < LIGHTNING_INTERVALS.length; index++) {
    const interval = LIGHTNING_INTERVALS[index];
    const start = interval - LIGHTNING_DURATION;
    if (remaining < interval) {
      if (remaining < start) return 0;
      const progress = (remaining - start) / LIGHTNING_DURATION;
      return Math.sin(progress * Math.PI) ** 2;
    }
    remaining -= interval;
  }
  return 0;
}
