import type { CitySearchResult } from '../types/models';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const CHANGSHA_ALIASES = new Set(['长沙', '长沙市']);

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

function isHunanChangsha(city: CitySearchResult): boolean {
  const normalizedName = city.name.replace(/市$/, '');
  const normalizedAdmin1 = city.admin1?.replace(/省$/, '');

  return normalizedName === '长沙' &&
    normalizedAdmin1 === '湖南' &&
    city.country === '中国';
}

async function fetchCityResults(keyword: string): Promise<CitySearchResult[]> {
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

export async function searchCities(query: string): Promise<CitySearchResult[]> {
  const keyword = query.trim();
  if (!keyword) {
    return [];
  }

  const primaryResults = await fetchCityResults(keyword);
  if (!CHANGSHA_ALIASES.has(keyword)) {
    return primaryResults;
  }

  // Open-Meteo's Chinese query for “长沙” can return villages in other
  // provinces without returning Hunan's prefecture-level Changsha. Use the
  // canonical romanized query only for this ambiguous city, then verify the
  // country and province instead of trusting the repeated place name alone.
  const fallbackResults = primaryResults.some(isHunanChangsha)
    ? []
    : await fetchCityResults('Changsha');
  const uniqueResults = new Map<number, CitySearchResult>();

  for (const city of [...primaryResults, ...fallbackResults]) {
    uniqueResults.set(city.id, city);
  }

  return [...uniqueResults.values()]
    .sort((left, right) => Number(isHunanChangsha(right)) - Number(isHunanChangsha(left)))
    .slice(0, 10);
}
