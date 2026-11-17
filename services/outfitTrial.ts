import {
  OUTFIT_SLOTS,
  type FeedbackChoice,
  type OutfitFeedback,
  type OutfitItems,
  type OutfitTrial,
  type TrialContext,
  type WardrobeOutfit,
} from '../types/outfits';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isOutfitItems(value: unknown): value is OutfitItems {
  return isRecord(value) && OUTFIT_SLOTS.every((slot) =>
    value[slot] === null || (typeof value[slot] === 'string' && value[slot].length > 0));
}

export function parseOutfits(value: unknown): WardrobeOutfit[] {
  if (!Array.isArray(value) || value.length > 4 || !value.every((outfit) =>
    isRecord(outfit) && isOutfitItems(outfit.items) && Array.isArray(outfit.missingSlots) &&
    outfit.missingSlots.every((slot: unknown) => OUTFIT_SLOTS.includes(slot as typeof OUTFIT_SLOTS[number])))) {
    throw new Error('推荐结果格式不正确，请稍后重试');
  }
  // Keep complete items and the server's ordering; do not reconstruct or rerank.
  return value as WardrobeOutfit[];
}

export function outfitKey(items: OutfitItems): string {
  return JSON.stringify(OUTFIT_SLOTS.map((slot) => items[slot]));
}

export function hasOutfitItems(items: OutfitItems): boolean {
  return OUTFIT_SLOTS.some((slot) => items[slot] !== null);
}

export function createOutfitTrial(context: TrialContext): OutfitTrial {
  return {
    version: 1, createdAt: new Date().toISOString(),
    context: JSON.parse(JSON.stringify(context)),
    outfits: [], feedback: [], recommendations: null,
  };
}

export function toggleOutfitFeedback<K extends keyof FeedbackChoice>(
  trial: OutfitTrial, items: OutfitItems, field: K, value: NonNullable<FeedbackChoice[K]>
): OutfitTrial {
  if (!hasOutfitItems(items)) return trial;
  const key = outfitKey(items);
  const previous = trial.feedback.find((entry) => outfitKey(entry.items) === key);
  const next: OutfitFeedback = {
    ...previous, items: { ...items },
    feelsLikeC: trial.context.weather.apparent_temperature,
    occasion: trial.context.occasion,
  };
  if (next[field] === value) delete next[field];
  else next[field] = value;
  const feedback = trial.feedback.filter((entry) => outfitKey(entry.items) !== key);
  if (next.aesthetic || next.thermal) feedback.push(next);
  return { ...trial, feedback };
}

export function buildRecommendationRequest(trial: OutfitTrial, withFeedback: boolean) {
  const { weather, wardrobe, occasion } = trial.context;
  return {
    weather, wardrobe, occasion, limit: 4,
    ...(withFeedback && trial.feedback.length ? { feedback: trial.feedback } : {}),
  };
}
