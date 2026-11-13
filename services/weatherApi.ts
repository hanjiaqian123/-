import type { CurrentWeather, HourlyWeather } from '../types/models';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const FORECAST_HOURS = 24;

const CURRENT_FIELDS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'is_day',
  'precipitation',
  'weather_code',
  'wind_speed_10m',
  'uv_index',
] as const;

const HOURLY_FIELDS = [
  'temperature_2m',
  'relative_humidity_2m',
  'precipitation_probability',
  'precipitation',
  'weather_code',
  'is_day',
] as const;

type WeatherRequest = {
  latitude: number;
  longitude: number;
};

export type WeatherForecast = {
  current: CurrentWeather;
  hourly: HourlyWeather[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isCurrentWeather(value: unknown): value is CurrentWeather {
  if (!isRecord(value)) {
    return false;
  }

  return CURRENT_FIELDS.every((field) => isFiniteNumber(value[field]));
}

function parseHourlyWeather(value: unknown): HourlyWeather[] | null {
  if (!isRecord(value) || !Array.isArray(value.time)) {
    return null;
  }

  const times = value.time;
  if (
    times.length < FORECAST_HOURS ||
    !times.every((time) => typeof time === 'string')
  ) {
    return null;
  }

  const hourlyValues: Record<(typeof HOURLY_FIELDS)[number], number[]> = {
    temperature_2m: [],
    relative_humidity_2m: [],
    precipitation_probability: [],
    precipitation: [],
    weather_code: [],
    is_day: [],
  };

  for (const field of HOURLY_FIELDS) {
    const fieldValues = value[field];
    if (
      !Array.isArray(fieldValues) ||
      fieldValues.length !== times.length ||
      !fieldValues.every(isFiniteNumber)
    ) {
      return null;
    }

    hourlyValues[field] = fieldValues;
  }

  return times.slice(0, FORECAST_HOURS).map((time, index) => ({
    time,
    temperature_2m: hourlyValues.temperature_2m[index],
    relative_humidity_2m: hourlyValues.relative_humidity_2m[index],
    precipitation_probability:
      hourlyValues.precipitation_probability[index],
    precipitation: hourlyValues.precipitation[index],
    weather_code: hourlyValues.weather_code[index],
    is_day: hourlyValues.is_day[index],
  }));
}

function buildWeatherUrl({ latitude, longitude }: WeatherRequest): string {
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error('天气请求坐标无效');
  }

  const query = [
    ['latitude', String(latitude)],
    ['longitude', String(longitude)],
    ['current', CURRENT_FIELDS.join(',')],
    ['hourly', HOURLY_FIELDS.join(',')],
    ['forecast_hours', String(FORECAST_HOURS)],
    ['timezone', 'auto'],
  ]
    .map(
      ([key, value]) => `${key}=${encodeURIComponent(value)}`
    )
    .join('&');

  return `${FORECAST_URL}?${query}`;
}

export async function fetchWeather(
  request: WeatherRequest
): Promise<WeatherForecast> {
  const response = await fetch(buildWeatherUrl(request));
  if (!response.ok) {
    throw new Error(`天气服务响应异常（${response.status}）`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error('天气服务返回了无法解析的数据');
  }

  if (!isRecord(data) || !isCurrentWeather(data.current)) {
    throw new Error('当前天气数据格式不完整');
  }

  const hourly = parseHourlyWeather(data.hourly);
  if (!hourly) {
    throw new Error('逐小时天气数据格式不完整');
  }

  return {
    current: data.current,
    hourly,
  };
}
