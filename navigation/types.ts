import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type {
  ClothingCategory,
  CurrentWeather,
  OutfitRecommendation,
} from '../types/models';

export type RootStackParamList = {
  Home: undefined;
  CosmicExplore: undefined;
  Wardrobe: undefined;
  Upload: undefined;
  Processing: {
    category: ClothingCategory;
    imageUri: string;
    fileName?: string | null;
    mimeType?: string | null;
  };
  RecognitionResult: {
    category: ClothingCategory;
    imageUri: string;
    fileName?: string | null;
    mimeType?: string | null;
  };
  OutfitResult: {
    cityName: string;
    weather: CurrentWeather | null;
    recommendation: OutfitRecommendation | null;
  };
};

export type ScreenProps<RouteName extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, RouteName>;
