import type { CitySearchResult } from '../types/models';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseCity(value: unknown): CitySearchResult | null {
  if (
    !isRecord(value) ||
    !isFiniteNumber(value.id) ||
    typeof value.name !== 'string' ||
    !isFiniteNumber(value.latitude) ||
    !isFiniteNumber(value.longitude)
  ) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    latitude: value.latitude,
    longitude: value.longitude,
    country:
      typeof value.country === 'string' && value.country
        ? value.country
        : '未知国家',
    admin1:
      typeof value.admin1 === 'string' && value.admin1
        ? value.admin1
        : undefined,
    timezone:
      typeof value.timezone === 'string' && value.timezone
        ? value.timezone
        : undefined,
  };
}

export async function searchCities(query: string): Promise<CitySearchResult[]> {
  const keyword = query.trim();
  if (!keyword) {
    return [];
  }

  const requestUrl = `${GEOCODING_URL}?name=${encodeURIComponent(
    keyword
  )}&count=10&language=zh&format=json`;
  const response = await fetch(requestUrl);

  if (!response.ok) {
    throw new Error(`城市搜索服务响应异常（${response.status}）`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error('城市搜索服务返回了无法解析的数据');
  }

  if (!isRecord(data)) {
    throw new Error('城市搜索数据格式不完整');
  }

  if (!Array.isArray(data.results)) {
    return [];
  }

  return data.results
    .map(parseCity)
    .filter((city): city is CitySearchResult => city !== null);
}
