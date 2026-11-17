import type { CurrentWeather } from '../types/models';

export type WeatherSceneId =
  | 'clear-day'
  | 'clear-night'
  | 'partly-cloudy-day'
  | 'partly-cloudy-night'
  | 'overcast'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'thunderstorm'
  | 'snow'
  | 'sleet';

export type WeatherSceneInput = Readonly<Pick<CurrentWeather, 'weather_code' | 'is_day'>>;

export type WeatherScene = {
  readonly skyGradient: readonly [string, string, string];
  readonly clouds: {
    readonly main: string;
    readonly shadow: string;
    readonly highlight: string;
    /** Visual coverage preset, 0–1; not measured cloud_cover. */
    readonly coverage: number;
  };
  readonly particles: {
    readonly type: 'none' | 'glow' | 'stars' | 'fog' | 'rain' | 'snow' | 'sleet';
    /** Relative visual density, 0–1; not measured precipitation. */
    readonly intensity: number;
    /** Total budget, including both rain and snow for sleet. */
    readonly maxCount: number;
    readonly color: string;
    readonly lightning: boolean;
  };
  readonly tone: 'warm' | 'cool' | 'neutral';
  readonly text: { readonly primary: string; readonly secondary: string };
};

/** Visual presets only. No timers, rendering, network requests or weather mutation. */
export const SCENES = {
  'clear-day': {
    skyGradient: ['#F6C98E', '#F4DFC0', '#FFF3DF'],
    clouds: { main: '#FFF3DF', shadow: '#C9B9AE', highlight: '#FFFCF5', coverage: 0.08 },
    particles: { type: 'glow', intensity: 0.2, maxCount: 3, color: '#FFF5D6', lightning: false },
    tone: 'warm',
    text: { primary: '#292238', secondary: '#514357' },
  },
  'clear-night': {
    skyGradient: ['#030718', '#101C44', '#302052'],
    clouds: { main: '#405075', shadow: '#18213E', highlight: '#8794BF', coverage: 0.05 },
    particles: { type: 'stars', intensity: 0.7, maxCount: 80, color: '#EAF6FF', lightning: false },
    tone: 'cool',
    text: { primary: '#F7FAFF', secondary: '#B8C9E8' },
  },
  'partly-cloudy-day': {
    skyGradient: ['#88AFCB', '#B7CED8', '#F3E6D1'],
    clouds: { main: '#F5EBDD', shadow: '#9CAEBF', highlight: '#FFFAF0', coverage: 0.45 },
    particles: { type: 'glow', intensity: 0.1, maxCount: 2, color: '#FFF5D6', lightning: false },
    tone: 'warm',
    text: { primary: '#202B42', secondary: '#3E4E65' },
  },
  'partly-cloudy-night': {
    skyGradient: ['#0C1530', '#252B51', '#4A3B64'],
    clouds: { main: '#596381', shadow: '#29324D', highlight: '#9297B6', coverage: 0.45 },
    particles: { type: 'stars', intensity: 0.3, maxCount: 40, color: '#EAF6FF', lightning: false },
    tone: 'cool',
    text: { primary: '#F7FAFF', secondary: '#CFD7EE' },
  },
  overcast: {
    skyGradient: ['#8393A5', '#ACB8C4', '#D5DCE0'],
    clouds: { main: '#BAC5CE', shadow: '#758597', highlight: '#E4E9EC', coverage: 0.95 },
    particles: { type: 'none', intensity: 0, maxCount: 0, color: '#D5DCE0', lightning: false },
    tone: 'neutral',
    text: { primary: '#202B3C', secondary: '#364456' },
  },
  fog: {
    skyGradient: ['#A5AFB7', '#C4CCD0', '#E0E4E3'],
    clouds: { main: '#CCD3D5', shadow: '#96A3AE', highlight: '#EFF1EB', coverage: 0.8 },
    particles: { type: 'fog', intensity: 0.75, maxCount: 8, color: '#EDF0EE', lightning: false },
    tone: 'neutral',
    text: { primary: '#27333C', secondary: '#43515B' },
  },
  drizzle: {
    skyGradient: ['#617D7E', '#8DA5A0', '#BDCEC4'],
    clouds: { main: '#A3B8AF', shadow: '#536D71', highlight: '#D6E2D8', coverage: 0.8 },
    particles: { type: 'rain', intensity: 0.3, maxCount: 50, color: '#D3E9E3', lightning: false },
    tone: 'cool',
    text: { primary: '#10282C', secondary: '#172F33' },
  },
  rain: {
    skyGradient: ['#162F3C', '#2B4754', '#466371'],
    clouds: { main: '#4E6975', shadow: '#203844', highlight: '#8AA4AD', coverage: 0.95 },
    particles: { type: 'rain', intensity: 0.75, maxCount: 120, color: '#BEDCE8', lightning: false },
    tone: 'cool',
    text: { primary: '#F3FAFF', secondary: '#CFDEE7' },
  },
  thunderstorm: {
    skyGradient: ['#0D0D1B', '#242136', '#40394F'],
    clouds: { main: '#39364A', shadow: '#151522', highlight: '#79718C', coverage: 1 },
    particles: { type: 'rain', intensity: 1, maxCount: 120, color: '#BBC6E2', lightning: true },
    tone: 'cool',
    text: { primary: '#F7F5FF', secondary: '#D1C9E5' },
  },
  snow: {
    skyGradient: ['#9BBEC9', '#CADEE3', '#EDF5F3'],
    clouds: { main: '#D8E7E9', shadow: '#8EAAB8', highlight: '#F8FCF9', coverage: 0.85 },
    particles: { type: 'snow', intensity: 0.65, maxCount: 100, color: '#FFFFFF', lightning: false },
    tone: 'cool',
    text: { primary: '#203643', secondary: '#405563' },
  },
  sleet: {
    skyGradient: ['#7C96AC', '#A5B8CA', '#CED8E1'],
    clouds: { main: '#B2C2D0', shadow: '#6C839B', highlight: '#E5ECF2', coverage: 0.9 },
    particles: { type: 'sleet', intensity: 0.7, maxCount: 100, color: '#F0F6FF', lightning: false },
    tone: 'cool',
    text: { primary: '#203044', secondary: '#35465B' },
  },
} as const satisfies Readonly<Record<WeatherSceneId, WeatherScene>>;

/** Explicit codes avoid treating gaps in the WMO table as valid weather. */
export function getWeatherSceneId(weather: WeatherSceneInput): WeatherSceneId {
  switch (weather.weather_code) {
    case 0:
    case 1:
      if (weather.is_day === 1) return 'clear-day';
      if (weather.is_day === 0) return 'clear-night';
      return 'overcast'; // Missing/invalid daylight flags must not invent a night sky.
    case 2:
      if (weather.is_day === 1) return 'partly-cloudy-day';
      if (weather.is_day === 0) return 'partly-cloudy-night';
      return 'overcast';
    case 3:
      return 'overcast';
    case 45:
    case 48:
      return 'fog';
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return 'drizzle';
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
    case 80:
    case 81:
    case 82:
      return 'rain';
    case 68:
    case 69:
      // Requested WMO compatibility codes beyond Open-Meteo's usual code subset.
      return 'sleet';
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return 'snow';
    case 95:
    case 96:
    case 99:
      return 'thunderstorm';
    default:
      return 'overcast';
  }
}

/** Returns the shared readonly preset without allocating a new config on each call. */
export function getWeatherScene(weather: WeatherSceneInput): WeatherScene {
  return SCENES[getWeatherSceneId(weather)];
}
