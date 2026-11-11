export type CurrentWeather = {
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  precipitation: number;
  weather_code: number;
  wind_speed_10m: number;
  is_day: number;
  uv_index: number;
};

export type OutfitRecommendation = {
  id: string;
  title: string;
  description: string;
  top: string;
  bottom: string;
  shoes: string;
  accessory: string;
  tip: string;
};

export const CLOTHING_CATEGORIES = [
  '上衣',
  '裤子',
  '裙子',
  '外套',
  '鞋子',
  '配饰',
] as const;

export type ClothingCategory = (typeof CLOTHING_CATEGORIES)[number];

export type WardrobeItem = {
  id: string;
  name: string;
  category: ClothingCategory;
  color: string;
  imageUri: string;
  createdAt: string;
};

export type NewWardrobeItem = Pick<
  WardrobeItem,
  'id' | 'name' | 'category' | 'color' | 'createdAt'
> & {
  sourceImageUri: string;
  originalFileName?: string | null;
  mimeType?: string | null;
};
