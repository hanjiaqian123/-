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

const PLAN_FIELDS = ['apparent_temperature', 'wind_speed_10m'] as const;

type WeatherRequest = {
  latitude: number;
  longitude: number;
};

export type WeatherSnapshotMetadata = {
  currentTime: string;
  currentInterval?: number;
  requestCoordinates: {
    latitude: number;
    longitude: number;
  };
  responseCoordinates?: {
    latitude: number;
    longitude: number;
  };
  timezone?: string;
  utcOffsetSeconds?: number;
  units: {
    current: Record<string, string>;
    hourly: Record<string, string>;
  };
};

export type WeatherForecast = {
  current: CurrentWeather;
  hourly: HourlyWeather[];
  timezone?: string;
  utcOffsetSeconds?: number;
  metadata: WeatherSnapshotMetadata;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseUnits(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string'
    )
  );
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
    // Missing plan-only fields must not break the existing current/hourly UI.
    // The daily planner explicitly reports insufficient data in that case.
    ...Object.fromEntries(PLAN_FIELDS.flatMap((field) => {
      const values = value[field];
      const entry = Array.isArray(values) && values.length === times.length
        ? values[index] : undefined;
      return isFiniteNumber(entry) && (field !== 'wind_speed_10m' || entry >= 0)
        ? [[field, entry]] : [];
    })),
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
    ['hourly', [...HOURLY_FIELDS, ...PLAN_FIELDS].join(',')],
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

  const currentRecord = data.current as unknown as Record<string, unknown>;
  const currentTime = typeof currentRecord.time === 'string'
    ? currentRecord.time
    : null;
  if (!currentTime) {
    throw new Error('当前天气数据缺少有效时间');
  }

  const hourly = parseHourlyWeather(data.hourly);
  if (!hourly) {
    throw new Error('逐小时天气数据格式不完整');
  }

  const timezone = typeof data.timezone === 'string' ? data.timezone : undefined;
  const utcOffsetSeconds = isFiniteNumber(data.utc_offset_seconds) &&
    Math.abs(data.utc_offset_seconds) <= 86400
    ? data.utc_offset_seconds : undefined;
  const currentInterval = isFiniteNumber(currentRecord.interval) &&
    currentRecord.interval > 0
    ? currentRecord.interval
    : undefined;
  const responseCoordinates = isFiniteNumber(data.latitude) &&
    data.latitude >= -90 && data.latitude <= 90 &&
    isFiniteNumber(data.longitude) &&
    data.longitude >= -180 && data.longitude <= 180
    ? { latitude: data.latitude, longitude: data.longitude }
    : undefined;

  return {
    current: data.current,
    hourly,
    timezone,
    utcOffsetSeconds,
    metadata: {
      currentTime,
      currentInterval,
      requestCoordinates: {
        latitude: request.latitude,
        longitude: request.longitude,
      },
      responseCoordinates,
      timezone,
      utcOffsetSeconds,
      units: {
        current: parseUnits(data.current_units),
        hourly: parseUnits(data.hourly_units),
      },
    },
  };
}
