import type { WardrobeItem } from './models';
import type { OutfitWeather } from '../services/outfitRecommendations';

export const OUTFIT_SLOTS = ['top', 'outerwear', 'bottoms', 'shoes'] as const;
export type OutfitSlot = (typeof OUTFIT_SLOTS)[number];
export type OutfitItems = Record<OutfitSlot, string | null>;
export type WardrobeOutfit = {
  items: OutfitItems;
  missingSlots: OutfitSlot[];
};
export type OutfitFeedback = {
  items: OutfitItems;
  feelsLikeC: number;
  occasion: string;
  aesthetic?: 'like' | 'dislike';
  thermal?: 'tooHot' | 'justRight' | 'tooCold';
};
export type FeedbackChoice = Pick<OutfitFeedback, 'aesthetic' | 'thermal'>;
export type TrialContext = {
  cityName: string;
  periodLabel: string;
  weather: OutfitWeather;
  wardrobe: WardrobeItem[];
  occasion: string;
};
export type OutfitTrial = {
  version: 1;
  createdAt: string;
  context: TrialContext;
  outfits: WardrobeOutfit[];
  feedback: OutfitFeedback[];
  recommendations: WardrobeOutfit[] | null;
};
