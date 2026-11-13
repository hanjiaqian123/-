import type {
  CurrentWeather,
  HourlyWeather,
  OutfitRecommendation,
} from '../types/models';

export type OutfitWeather = Pick<CurrentWeather,
  'apparent_temperature' | 'precipitation' | 'weather_code' | 'wind_speed_10m'
> & {
  temperature_2m?: number;
  precipitation_probability?: number;
  future_precipitation?: number;
  future_weather_codes?: readonly number[];
  max_wind_speed_10m?: number;
  min_temperature?: number;
  max_temperature?: number;
};

export type OutfitWeatherRisks = {
  isSnowy: boolean;
  isFreezingRain: boolean;
  isThunderstorm: boolean;
  hasCurrentRain: boolean;
  hasRainRisk: boolean;
  isWindy: boolean;
  isWetCold: boolean;
  hasLargeTemperatureRange: boolean;
  effectiveWindSpeed: number;
};

const HIGH_RAIN_PROBABILITY = 60;
const HIGH_WIND_SPEED = 30;
const LARGE_TEMPERATURE_RANGE = 6;

function isSnowCode(code: number): boolean {
  return (code >= 71 && code <= 77) || (code >= 85 && code <= 86);
}

function isFreezingRainCode(code: number): boolean {
  return code >= 66 && code <= 67;
}

function isThunderstormCode(code: number): boolean {
  return code >= 95 && code <= 99;
}

function isRainCode(code: number): boolean {
  return (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    isThunderstormCode(code);
}

function maxOrFallback(values: number[], fallback: number): number {
  return values.length ? Math.max(...values) : fallback;
}

function minOrFallback(values: number[], fallback: number): number {
  return values.length ? Math.min(...values) : fallback;
}

export function buildOutfitWeatherContext(
  current: CurrentWeather,
  hourly: readonly HourlyWeather[]
): OutfitWeather {
  const hourlyWind = hourly.flatMap((hour) =>
    typeof hour.wind_speed_10m === 'number' && Number.isFinite(hour.wind_speed_10m)
      ? [hour.wind_speed_10m]
      : []
  );
  const temperatureSamples = [
    current.temperature_2m,
    ...hourly.map((hour) => hour.temperature_2m),
  ]
    .filter(Number.isFinite);

  return {
    temperature_2m: current.temperature_2m,
    apparent_temperature: current.apparent_temperature,
    precipitation: current.precipitation,
    precipitation_probability: maxOrFallback(
      hourly.map((hour) => hour.precipitation_probability).filter(Number.isFinite),
      0
    ),
    future_precipitation: hourly.reduce(
      (total, hour) => total + (Number.isFinite(hour.precipitation) ? hour.precipitation : 0),
      0
    ),
    weather_code: current.weather_code,
    future_weather_codes: hourly.map((hour) => hour.weather_code),
    wind_speed_10m: current.wind_speed_10m,
    max_wind_speed_10m: maxOrFallback(hourlyWind, current.wind_speed_10m),
    min_temperature: minOrFallback(temperatureSamples, current.temperature_2m),
    max_temperature: maxOrFallback(temperatureSamples, current.temperature_2m),
  };
}

export function getOutfitWeatherRisks(
  weather: OutfitWeather
): OutfitWeatherRisks {
  const futureCodes = weather.future_weather_codes ?? [];
  const allCodes = [weather.weather_code, ...futureCodes];
  const isSnowy = allCodes.some(isSnowCode);
  const isFreezingRain = allCodes.some(isFreezingRainCode);
  const isThunderstorm = allCodes.some(isThunderstormCode);
  const hasCurrentRain = isRainCode(weather.weather_code) ||
    weather.precipitation > 0;
  const hasForecastRain = futureCodes.some(isRainCode) ||
    (weather.precipitation_probability ?? 0) >= HIGH_RAIN_PROBABILITY ||
    (weather.future_precipitation ?? 0) > 0;
  const hasRainRisk = hasCurrentRain || hasForecastRain ||
    isSnowy || isFreezingRain;
  const effectiveWindSpeed = Math.max(
    weather.wind_speed_10m,
    weather.max_wind_speed_10m ?? weather.wind_speed_10m
  );
  const isWindy = effectiveWindSpeed >= HIGH_WIND_SPEED;
  const actualTemperature = weather.temperature_2m ?? weather.apparent_temperature;
  const isWetCold = hasRainRisk &&
    Math.min(actualTemperature, weather.apparent_temperature) <= 15;
  const hasLargeTemperatureRange = typeof weather.min_temperature === 'number' &&
    typeof weather.max_temperature === 'number' &&
    weather.max_temperature - weather.min_temperature >= LARGE_TEMPERATURE_RANGE;

  return {
    isSnowy,
    isFreezingRain,
    isThunderstorm,
    hasCurrentRain,
    hasRainRisk,
    isWindy,
    isWetCold,
    hasLargeTemperatureRange,
    effectiveWindSpeed,
  };
}

function getBaseOutfitRecommendations(
  weather: OutfitWeather
): OutfitRecommendation[] {
  const temperature = weather.apparent_temperature;

  if (temperature <= 8) {
    return [
      {
        id: 'cold-warm',
        title: '温暖保暖风',
        description: '保暖、防风、舒适',
        top: '🧥 厚外套或羽绒服',
        bottom: '👖 加厚长裤',
        shoes: '🥾 保暖运动鞋',
        accessory: '🧣 围巾',
        tip: '气温较低，建议做好保暖。如果有降雨，还要注意防水。',
      },
      {
        id: 'cold-commute',
        title: '都市保暖通勤风',
        description: '利落、厚实、有质感',
        top: '🧥 羊毛大衣搭配保暖针织衫',
        bottom: '👖 加绒直筒长裤',
        shoes: '🥾 防风短靴',
        accessory: '🧤 保暖手套',
        tip: '通勤时建议采用针织衫与大衣叠穿，兼顾室内外温差。',
      },
      {
        id: 'cold-sport',
        title: '冬日活力运动风',
        description: '轻暖、灵活、有活力',
        top: '🧥 抓绒卫衣搭配短款羽绒服',
        bottom: '👖 加绒运动长裤',
        shoes: '👟 保暖高帮运动鞋',
        accessory: '🧢 针织帽',
        tip: '户外活动可选择轻量羽绒与抓绒内层，方便运动又能减少热量流失。',
      },
    ];
  }

  if (temperature <= 15) {
    return [
      {
        id: 'cool-layered',
        title: '简约叠穿风',
        description: '舒适、轻暖、有层次',
        top: '🧥 卫衣或夹克',
        bottom: '👖 休闲长裤',
        shoes: '👟 运动鞋',
        accessory: '🧢 轻便帽子',
        tip: '天气偏凉，建议穿一件外套，避免着凉。',
      },
      {
        id: 'cool-commute',
        title: '利落轻通勤风',
        description: '简洁、挺括、易叠穿',
        top: '🧥 风衣搭配薄针织衫',
        bottom: '👖 直筒西装长裤',
        shoes: '👞 轻便乐福鞋',
        accessory: '🧣 薄款围巾',
        tip: '早晚偏凉时可以系上薄围巾，中午升温后脱下风衣即可。',
      },
      {
        id: 'cool-sport',
        title: '轻户外运动风',
        description: '防风、灵活、休闲',
        top: '🧥 防风外套搭配长袖运动衫',
        bottom: '👖 束脚运动长裤',
        shoes: '👟 缓震运动鞋',
        accessory: '🎒 轻量双肩包',
        tip: '选择方便活动的防风外层，运动后及时增添外套避免受凉。',
      },
    ];
  }

  if (temperature <= 22) {
    return [
      {
        id: 'mild-casual',
        title: '轻松休闲风',
        description: '轻薄、透气、舒适',
        top: '👕 长袖或薄外套',
        bottom: '👖 休闲长裤',
        shoes: '👟 休闲运动鞋',
        accessory: '👜 轻便配饰',
        tip: '气温比较舒适，适合轻薄衣物，可以根据早晚温差增减衣物。',
      },
      {
        id: 'mild-commute',
        title: '清爽轻熟通勤风',
        description: '干净、轻盈、有质感',
        top: '👔 衬衫搭配薄款针织开衫',
        bottom: '👖 垂感直筒裤',
        shoes: '👞 轻便通勤鞋',
        accessory: '👜 简约单肩包',
        tip: '薄开衫适合应对空调房和早晚温差，白天温暖时可以单穿衬衫。',
      },
      {
        id: 'mild-outdoor',
        title: '城市轻户外风',
        description: '透气、实用、有层次',
        top: '🧥 轻薄防晒外套搭配透气上衣',
        bottom: '👖 宽松工装长裤',
        shoes: '🥾 轻量徒步鞋',
        accessory: '🧢 遮阳帽',
        tip: '轻薄外层便于随时穿脱，适合步行、骑行或短时间户外活动。',
      },
    ];
  }

  return [
    {
      id: 'hot-summer',
      title: '清爽夏日风',
      description: '清凉、透气、轻便',
      top: '👕 透气短袖',
      bottom: '🩳 轻薄休闲裤',
      shoes: '👟 透气运动鞋',
      accessory: '🕶️ 太阳镜',
      tip: '天气较热，建议选择透气面料，注意防晒和补水。',
    },
    {
      id: 'hot-commute',
      title: '轻盈夏日通勤风',
      description: '清爽、利落、不闷热',
      top: '👔 亚麻短袖衬衫',
      bottom: '👖 轻薄垂感长裤',
      shoes: '👞 透气便鞋',
      accessory: '👜 轻量通勤包',
      tip: '选择亚麻或速干面料，进入空调环境时可准备一件轻薄外搭。',
    },
    {
      id: 'hot-sport',
      title: '活力速干运动风',
      description: '速干、轻量、方便活动',
      top: '🎽 速干运动上衣',
      bottom: '🩳 透气运动短裤',
      shoes: '👟 网面跑步鞋',
      accessory: '🧢 防晒运动帽',
      tip: '户外运动尽量避开高温时段，并及时补水和做好防晒。',
    },
  ];
}

function mergeDescriptionTags(
  recommendation: OutfitRecommendation,
  riskTags: string[]
): string {
  const existingTags = recommendation.description
    .split(/[、·]/)
    .map((tag) => tag.trim())
    .filter(Boolean);

  return [...new Set([...riskTags, ...existingTags])].join('、');
}

function getInnerLayer(recommendation: OutfitRecommendation): string {
  const top = recommendation.top.replace(/^\S+\s*/, '');

  return top
    .replace(/^厚外套或羽绒服$/, '保暖针织或抓绒内层')
    .replace(/^羊毛大衣搭配/, '')
    .replace(/^抓绒卫衣搭配短款羽绒服$/, '抓绒卫衣')
    .replace(/^卫衣或夹克$/, '卫衣或长袖上衣')
    .replace(/^风衣搭配/, '')
    .replace(/^防风外套搭配/, '')
    .replace(/^长袖或薄外套$/, '长袖上衣')
    .replace(/^衬衫搭配/, '衬衫与')
    .replace(/^轻薄防晒外套搭配/, '');
}

function formatTemperature(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${value.toFixed(1)}°C`
    : '数据不足';
}

export function getOutfitRecommendations(
  weather: OutfitWeather
): OutfitRecommendation[] {
  const risks = getOutfitWeatherRisks(weather);

  const baseWeather =
    risks.isSnowy || risks.isFreezingRain
      ? {
          ...weather,
          apparent_temperature: Math.min(weather.apparent_temperature, 8),
        }
      : weather;

  return getBaseOutfitRecommendations(baseWeather).map((recommendation) => {
    if (risks.isSnowy || risks.isFreezingRain) {
      return {
        ...recommendation,
        description: mergeDescriptionTags(recommendation, [
          '防寒', '防水', '防滑', '保暖',
        ]),
        top: '🧥 防水防风保暖外层 + 保暖针织或抓绒内层',
        bottom: '👖 防风保暖长裤',
        shoes: '🥾 防水防滑保暖靴',
        accessory: '🧣 保暖围巾与手套',
        tip: `预报包含${risks.isFreezingRain ? '冻雨' : '降雪'}，已采用防水防风保暖外层、保暖内层与防滑鞋，避免轻薄单穿。`,
      };
    }

    if (risks.hasRainRisk) {
      const protectedOuter = risks.isWindy
        ? risks.isWetCold ? '防水防风保暖外层' : '防水防风外层'
        : risks.isWetCold ? '防水保暖外层' : '轻便防水外层';
      const innerLayer = risks.isWetCold
        ? '保暖针织或抓绒内层'
        : getInnerLayer(recommendation);
      const rainTiming = risks.hasCurrentRain
        ? '当前有降雨'
        : `未来降雨概率最高 ${Math.round(weather.precipitation_probability ?? 0)}%`;
      const coldReason = risks.isWetCold
        ? `实际气温 ${formatTemperature(weather.temperature_2m)}、体感 ${formatTemperature(weather.apparent_temperature)}，雨水会加重湿冷感；`
        : '';
      const windReason = risks.isWindy
        ? `最高风速 ${risks.effectiveWindSpeed.toFixed(1)} km/h，风力会加快散热；`
        : '';
      const accessory = risks.isWindy ? '🧢 连帽雨衣' : '☂️ 折叠伞';
      const accessoryLabel = accessory.replace(/^\S+\s*/, '');

      return {
        ...recommendation,
        description: mergeDescriptionTags(recommendation, [
          '防水', ...(risks.isWindy ? ['防风'] : []),
          ...(risks.isWetCold ? ['保暖'] : []),
        ]),
        top: `🌧️ ${protectedOuter} + ${innerLayer}`,
        shoes: '🥾 防水防滑鞋',
        accessory,
        tip: `${risks.isThunderstorm ? '雷雨天气请减少户外停留；' : ''}${rainTiming}；${coldReason}${windReason}已搭配${protectedOuter}、${innerLayer}与防水防滑鞋，并准备${accessoryLabel}。`,
      };
    }

    if (risks.isWindy) {
      return {
        ...recommendation,
        description: mergeDescriptionTags(recommendation, ['防风']),
        top: `🧥 防风外层 + ${getInnerLayer(recommendation)}`,
        accessory: '🧢 贴合防风帽',
        tip: `最高风速 ${risks.effectiveWindSpeed.toFixed(1)} km/h，已搭配收口防风外层与不易飘动的配饰，不建议只穿单层上衣。`,
      };
    }

    if (risks.hasLargeTemperatureRange) {
      const temperatureRange = (weather.max_temperature ?? 0) -
        (weather.min_temperature ?? 0);
      return {
        ...recommendation,
        tip: `预报温差约 ${temperatureRange.toFixed(1)}°C，保留当前基础搭配，并准备可穿脱的分层外搭。`,
      };
    }

    return recommendation;
  });
}
