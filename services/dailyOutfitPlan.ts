import type { ClothingCategory, HourlyWeather, OutfitRecommendation, WardrobeItem } from '../types/models';
import { getOutfitRecommendations } from './outfitRecommendations';

export const DAY_PERIODS = [
  { id: 'morning', label: '早晨', startHour: 6, endHour: 11, timeLabel: '06:00–10:59', icon: '☀' },
  { id: 'midday', label: '中午', startHour: 11, endHour: 17, timeLabel: '11:00–16:59', icon: '☼' },
  { id: 'evening', label: '晚上', startHour: 17, endHour: 24, timeLabel: '17:00–23:59', icon: '☾' },
] as const;

export type DayPeriodId = (typeof DAY_PERIODS)[number]['id'];
export type PlanSlot = {
  id: string;
  label: string;
  generic: string;
  item?: WardrobeItem;
};
export type PeriodWeather = {
  minTemperature: number;
  maxTemperature: number;
  minApparent: number | null;
  maxApparent: number | null;
  maxRainProbability: number;
  maxWind: number | null;
  precipitation: number;
  weather_code: number;
  is_day: number;
};
export type PeriodPlan = {
  period: (typeof DAY_PERIODS)[number];
  date: string | null;
  status: 'ready' | 'partial' | 'insufficient';
  coverage: string;
  observedHours: number;
  expectedHours: number;
  weather: PeriodWeather | null;
  recommendation: OutfitRecommendation | null;
  slots: PlanSlot[];
  reasons: string[];
};

export function getCityDate(now: Date, timezone?: string, utcOffsetSeconds?: number): string | null {
  if (!Number.isFinite(now.getTime())) return null;
  if (timezone) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
      }).formatToParts(now);
      const part = (name: string) => parts.find((entry) => entry.type === name)?.value;
      const date = `${part('year')}-${part('month')}-${part('day')}`;
      if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) return date;
    } catch { /* Use the API offset when the runtime lacks this time zone. */ }
  }
  return typeof utcOffsetSeconds === 'number' && Number.isFinite(utcOffsetSeconds) &&
    Math.abs(utcOffsetSeconds) <= 86400
    ? new Date(now.getTime() + utcOffsetSeconds * 1000).toISOString().slice(0, 10)
    : null;
}

function validHour(hour: HourlyWeather): boolean {
  return /^[0-9]{4}-[0-9]{2}-[0-9]{2}T(?:[01][0-9]|2[0-3]):00(?::00)?$/.test(hour.time) &&
    [hour.temperature_2m, hour.relative_humidity_2m, hour.precipitation_probability,
      hour.precipitation, hour.weather_code].every(Number.isFinite) &&
    hour.relative_humidity_2m >= 0 && hour.relative_humidity_2m <= 100 &&
    [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67,
      71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99].includes(hour.weather_code) &&
    hour.precipitation_probability >= 0 && hour.precipitation_probability <= 100 &&
    hour.precipitation >= 0 && (hour.is_day === 0 || hour.is_day === 1);
}

function weatherPriority(hour: HourlyWeather): number {
  const code = hour.weather_code;
  if (code >= 66 && code <= 67) return 600;
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 500;
  if (code >= 95 && code <= 99) return 400;
  if ((code >= 51 && code <= 65) || (code >= 80 && code <= 82) || hour.precipitation > 0) return 300;
  if (code === 45 || code === 48) return 200;
  return code;
}

type SlotRule = {
  id: string;
  label: string;
  generic: string;
  categories: ClothingCategory[];
  // Every group is required; at least one expression in each group must match.
  groups: RegExp[];
};

function getSlotRules(weather: PeriodWeather, outfit: OutfitRecommendation): SlotRule[] {
  const cold = outfit.id.startsWith('cold-');
  const cool = outfit.id.startsWith('cool-');
  const hot = outfit.id.startsWith('hot-');
  const wet = /防水/.test(outfit.shoes) || weather.maxRainProbability >= 60;
  const windy = weather.maxWind !== null && weather.maxWind >= 30;
  const rules: SlotRule[] = [{
    id: 'top', label: '上装 / 内搭', categories: ['上衣'],
    generic: cold ? '保暖针织衫或抓绒内搭' : cool ? '长袖上衣或卫衣' : hot ? '透气短袖或速干上衣' : '长袖或轻薄上衣',
    groups: cold ? [/保暖|羊毛|抓绒|加绒|厚/] : cool ? [/长袖|卫衣|针织|抓绒/] : hot ? [/短袖|T恤|t恤|透气|速干|亚麻/] : [/长袖|衬衫|薄|透气/],
  }];
  if (cold || cool || wet || windy || /外套|开衫/.test(outfit.top)) {
    const groups: RegExp[] = [];
    if (cold) groups.push(/羽绒|棉服|羊毛|加绒|抓绒|保暖|厚/);
    else if (cool) groups.push(/外套|夹克|风衣|卫衣|雨衣/);
    else groups.push(/薄|轻便|轻量|防晒/);
    if (wet) groups.push(/防水|雨衣/);
    if (windy) groups.push(/防风/);
    if (wet && windy) groups.push(/连帽/);
    rules.push({
      id: 'outer', label: '外层', categories: ['外套'], groups,
      generic: `${wet ? '防水' : ''}${windy ? '防风连帽' : ''}${cold ? '保暖外套' : cool ? '外套' : '轻薄外套'}`,
    });
  }
  rules.push({
    id: 'bottom', label: '下装', generic: outfit.bottom, categories: ['裤子'],
    groups: cold ? [/长裤|裤/, /加绒|厚|保暖|防寒/] : hot ? [/裤/, /薄|短裤|透气|速干|亚麻/] : [/长裤|牛仔裤|西装裤|工装裤|运动裤/],
  });
  const shoeGroups = [/鞋|靴/];
  if (cold) shoeGroups.push(/保暖|加绒|厚/);
  if (wet) shoeGroups.push(/防水/, /防滑/);
  if (hot) shoeGroups.push(/透气|网面|轻薄|凉/);
  rules.push({ id: 'shoes', label: '鞋履', categories: ['鞋子'], groups: shoeGroups, generic: wet ? `防水防滑${cold ? '保暖靴' : '鞋'}` : outfit.shoes });
  let accessory = outfit.accessory;
  if (wet && !/伞|雨衣/.test(accessory) && !cold) accessory = windy ? '连帽雨衣（不建议撑伞）' : '折叠伞';
  const accessoryTerms = accessory.match(/围巾|手套|帽|伞|雨衣|太阳镜|双肩包|单肩包|通勤包|配饰/g) ?? [];
  rules.push({
    id: 'accessory', label: '随身物品', generic: accessory, categories: ['配饰'],
    groups: accessoryTerms.length ? accessoryTerms.map((term) => new RegExp(term)) : [/^$/],
  });
  return rules;
}

export function matchPlanWardrobe(weather: PeriodWeather, outfit: OutfitRecommendation, items: WardrobeItem[]): PlanSlot[] {
  const used = new Set<string>();
  return getSlotRules(weather, outfit).map((rule) => {
    const item = items.find((candidate) => {
      if (used.has(candidate.id) || !rule.categories.includes(candidate.category) || !candidate.name.trim()) return false;
      // Never infer weather protection from the image, color or category alone.
      const name = candidate.name.replace(/\s/g, '');
      if (/(?:不|非|无|没有).{0,3}(?:保暖|防水|防滑|防风|透气)|(?:防水|保暖|防滑|防风)性差/.test(name)) return false;
      if (outfit.id.startsWith('cold-') && /短裤|薄款|轻薄|短袖|凉鞋/.test(name)) return false;
      if (outfit.id.startsWith('cool-') && /短裤|短袖|凉鞋/.test(name)) return false;
      if (outfit.id.startsWith('hot-') && /羽绒|加绒|厚|羊毛/.test(name)) return false;
      return rule.groups.every((group) => group.test(name));
    });
    if (item) used.add(item.id);
    return { id: rule.id, label: rule.label, generic: rule.generic, item };
  });
}

export function buildDailyOutfitPlan({
  hourly, items, now, timezone, utcOffsetSeconds,
}: {
  hourly: readonly HourlyWeather[];
  items: WardrobeItem[];
  now: Date;
  timezone?: string;
  utcOffsetSeconds?: number;
}): PeriodPlan[] {
  const date = getCityDate(now, timezone, utcOffsetSeconds);
  return DAY_PERIODS.map((period) => {
    const expectedHours = period.endHour - period.startHour;
    // Keep one record per local hour. Tomorrow's morning is never today's morning.
    const unique = new Map<number, HourlyWeather>();
    for (const hour of hourly) {
      if (!date || !validHour(hour) || hour.time.slice(0, 10) !== date) continue;
      const h = Number(hour.time.slice(11, 13));
      if (h >= period.startHour && h < period.endHour && !unique.has(h)) unique.set(h, hour);
    }
    const samples = [...unique.values()].sort((a, b) => a.time.localeCompare(b.time));
    const base: PeriodPlan = {
      period, date, status: 'insufficient', observedHours: samples.length, expectedHours,
      coverage: !date ? '城市时间信息不足，无法确定今天的日期。' : `数据不足：本次24小时预报未覆盖今天${period.label}。`,
      weather: null, recommendation: null, slots: [], reasons: [],
    };
    if (!samples.length) return base;
    const coverageHours = samples.map((sample) => sample.time.slice(11, 16)).join('、');
    const complete = samples.every((hour) => typeof hour.apparent_temperature === 'number' &&
      Number.isFinite(hour.apparent_temperature) && typeof hour.wind_speed_10m === 'number' &&
      Number.isFinite(hour.wind_speed_10m) && hour.wind_speed_10m >= 0);
    const representative = samples.reduce((worst, hour) => weatherPriority(hour) > weatherPriority(worst) ? hour : worst);
    const min = (values: number[]) => Math.min(...values);
    const max = (values: number[]) => Math.max(...values);
    const apparent = samples.map((hour) => hour.apparent_temperature as number);
    const weather: PeriodWeather = {
      minTemperature: min(samples.map((hour) => hour.temperature_2m)),
      maxTemperature: max(samples.map((hour) => hour.temperature_2m)),
      minApparent: complete ? min(apparent) : null, maxApparent: complete ? max(apparent) : null,
      maxRainProbability: max(samples.map((hour) => hour.precipitation_probability)),
      precipitation: max(samples.map((hour) => hour.precipitation)),
      maxWind: complete ? max(samples.map((hour) => hour.wind_speed_10m as number)) : null,
      weather_code: representative.weather_code, is_day: representative.is_day,
    };
    const coverage = samples.length === expectedHours ? `已覆盖 ${expectedHours}/${expectedHours} 小时` :
      `数据不足：仅覆盖 ${samples.length}/${expectedHours} 小时；建议只适用于这些已覆盖小时。`;
    const availableCoverage = `${coverage}（${coverageHours}，城市当地时间）`;
    if (!complete) return { ...base, weather, coverage: `${availableCoverage}；缺少体感温度或风速，暂不生成穿搭。` };
    const input = {
      temperature_2m: weather.minTemperature,
      apparent_temperature: weather.minApparent!, wind_speed_10m: weather.maxWind!,
      precipitation: weather.precipitation, weather_code: weather.weather_code,
      precipitation_probability: weather.maxRainProbability,
      future_precipitation: samples.reduce((total, hour) => total + hour.precipitation, 0),
      future_weather_codes: samples.map((hour) => hour.weather_code),
      max_wind_speed_10m: weather.maxWind!,
      min_temperature: weather.minTemperature,
      max_temperature: weather.maxTemperature,
    };
    const candidates = getOutfitRecommendations(input).map((recommendation) => ({
      recommendation, slots: matchPlanWardrobe(weather, recommendation, items),
    }));
    const chosen = candidates.reduce((best, candidate) =>
      candidate.slots.filter((slot) => slot.item).length > best.slots.filter((slot) => slot.item).length ? candidate : best);
    const reasons = [
      `气温 ${weather.minTemperature.toFixed(1)}–${weather.maxTemperature.toFixed(1)}°C，体感 ${weather.minApparent!.toFixed(1)}–${weather.maxApparent!.toFixed(1)}°C；按体感下限选取原有温度区间。`,
      `最高降水概率 ${Math.round(weather.maxRainProbability)}%，最高小时降水 ${weather.precipitation.toFixed(1)} mm。${weather.maxRainProbability >= 60 ? '建议准备雨具；概率不等于一定降雨。' : '结合天气代码与预报降水判断是否需要雨具。'}`,
      `最高风速 ${weather.maxWind!.toFixed(1)} km/h。${weather.maxWind! >= 30 ? '达到原有大风阈值，优先防风外层；风雨同时出现时优先连帽雨衣。' : '未达到原有大风阈值。'}`,
    ];
    if (samples.some((hour) => hour.weather_code >= 95)) {
      reasons.push('覆盖小时中有雷暴预报，请减少户外停留，优先安排室内活动。');
    }
    if (weather.maxTemperature - weather.minTemperature >= 6) {
      reasons.push('此时段温差达到 6°C，建议选择便于穿脱的叠穿搭配。');
    }
    return {
      ...base, weather, coverage: availableCoverage,
      status: samples.length === expectedHours ? 'ready' : 'partial',
      recommendation: chosen.recommendation, slots: chosen.slots, reasons,
    };
  });
}
