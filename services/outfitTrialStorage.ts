import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOTHING_CATEGORIES } from '../types/models';
import type { OutfitTrial } from '../types/outfits';
import { hasOutfitItems, isOutfitItems, isRecord, outfitKey, parseOutfits } from './outfitTrial';

const STORAGE_KEY = '@weatherfit/outfit-trial/v1';
// Serialize autosaves so a slow earlier write cannot overwrite a later choice.
let pendingWrite: Promise<void> = Promise.resolve();

export function saveOutfitTrial(trial: OutfitTrial | null): Promise<void> {
  const serialized = trial ? JSON.stringify(trial) : null;
  const write = pendingWrite.catch(() => {}).then(() => serialized === null
    ? AsyncStorage.removeItem(STORAGE_KEY)
    : AsyncStorage.setItem(STORAGE_KEY, serialized));
  pendingWrite = write;
  return write;
}

export async function loadOutfitTrial(): Promise<OutfitTrial | null> {
  await pendingWrite.catch(() => {});
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const trial: unknown = JSON.parse(raw);
  const fail = () => { throw new Error('试搭记录无法恢复，请重试读取或开始新的试搭'); };
  if (!isRecord(trial) || trial.version !== 1 || typeof trial.createdAt !== 'string' ||
    !isRecord(trial.context) || !Array.isArray(trial.feedback)) return fail();
  const context = trial.context;
  if (typeof context.cityName !== 'string' || typeof context.periodLabel !== 'string' ||
    typeof context.occasion !== 'string' || !context.occasion || !isRecord(context.weather) ||
    !['apparent_temperature', 'precipitation', 'weather_code', 'wind_speed_10m'].every((key) =>
      typeof (context.weather as Record<string, unknown>)[key] === 'number' &&
      Number.isFinite((context.weather as Record<string, unknown>)[key])) ||
    !Array.isArray(context.wardrobe) || !context.wardrobe.every((item) => isRecord(item) &&
      ['id', 'name', 'imageUri', 'color', 'createdAt'].every((key) => typeof item[key] === 'string') &&
      CLOTHING_CATEGORIES.includes(item.category as typeof CLOTHING_CATEGORIES[number]))) return fail();
  const outfits = parseOutfits(trial.outfits);
  if (trial.recommendations !== null && !parseOutfits(trial.recommendations).length) return fail();
  if (!trial.feedback.every((entry) => isRecord(entry) && isOutfitItems(entry.items) &&
    hasOutfitItems(entry.items) && outfits.some((outfit) => outfitKey(outfit.items) === outfitKey(entry.items as typeof outfit.items)) &&
    entry.occasion === context.occasion && entry.feelsLikeC === (context.weather as Record<string, unknown>).apparent_temperature &&
    (entry.aesthetic === undefined || ['like', 'dislike'].includes(entry.aesthetic as string)) &&
    (entry.thermal === undefined || ['tooHot', 'justRight', 'tooCold'].includes(entry.thermal as string)) &&
    (entry.aesthetic || entry.thermal))) return fail();
  return trial as OutfitTrial;
}
