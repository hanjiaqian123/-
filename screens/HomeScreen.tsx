import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CosmicBackground from '../components/cosmic/CosmicBackground';
import OutfitCard from '../components/outfit/OutfitCard';
import CitySearch from '../components/weather/CitySearch';
import HourlyWeatherForecast from '../components/weather/HourlyWeather';
import WeatherCard from '../components/weather/WeatherCard';
import type { ScreenProps } from '../navigation/types';
import { fetchWeather } from '../services/weatherApi';
import { cosmicTheme } from '../theme/cosmicTheme';
import type {
  CitySearchResult,
  CurrentWeather,
  HourlyWeather,
  OutfitRecommendation,
  WeatherLocation,
} from '../types/models';

function getBaseOutfitRecommendations(
  weather: CurrentWeather
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

function getOutfitRecommendations(
  weather: CurrentWeather
): OutfitRecommendation[] {
  const code = weather.weather_code;
  const isSnowy =
    (code >= 71 && code <= 77) ||
    (code >= 85 && code <= 86);
  const isFreezingRain = code >= 66 && code <= 67;
  const isThunderstorm = code >= 95 && code <= 99;
  const isRainy =
    (code >= 51 && code <= 65) ||
    (code >= 80 && code <= 82) ||
    isFreezingRain ||
    isThunderstorm ||
    weather.precipitation > 0;
  const isWindy = weather.wind_speed_10m >= 30;

  const baseWeather =
    isSnowy || isFreezingRain
      ? {
          ...weather,
          apparent_temperature: Math.min(weather.apparent_temperature, 8),
        }
      : weather;

  return getBaseOutfitRecommendations(baseWeather).map((recommendation) => {
    if (isSnowy || isFreezingRain) {
      return {
        ...recommendation,
        description: `防寒、防滑、保暖 · ${recommendation.description}`,
        top: `🧥 防水保暖外层 + ${recommendation.top.replace(/^\S+\s*/, '')}`,
        bottom: '👖 防风保暖长裤',
        shoes: '🥾 防水防滑保暖靴',
        accessory: '🧣 保暖围巾与手套',
        tip: `当前有${isFreezingRain ? '冻雨' : '降雪'}，优先防水、防滑和保暖。${recommendation.tip}`,
      };
    }

    if (isRainy) {
      return {
        ...recommendation,
        description: `${
          isWindy ? '防水、防风' : '防水、便捷'
        }、舒适 · ${recommendation.description}`,
        top: `🌧️ ${
          isWindy ? '防水防风外套' : '轻便防水外套'
        } + ${recommendation.top.replace(/^\S+\s*/, '')}`,
        shoes: '🥾 防水防滑鞋',
        accessory: isWindy ? '🧢 连帽雨衣' : '☂️ 折叠伞',
        tip: `${
          isThunderstorm ? '雷雨天气请减少户外停留，' : ''
        }${
          isWindy ? '风雨较强时用连帽雨衣代替雨伞，' : ''
        }穿搭已加入雨具和防水鞋。${recommendation.tip}`,
      };
    }

    if (isWindy) {
      return {
        ...recommendation,
        description: `防风、利落、舒适 · ${recommendation.description}`,
        top: `🧥 防风外层 + ${recommendation.top.replace(/^\S+\s*/, '')}`,
        accessory: '🧢 贴合防风帽',
        tip: `当前风速较高，优先选择收口、防风且不易飘动的单品。${recommendation.tip}`,
      };
    }

    return recommendation;
  });
}

const DEFAULT_CITY: WeatherLocation = {
  name: '长沙',
  latitude: 28.2282,
  longitude: 112.9388,
  country: '中国',
  admin1: '湖南省',
  timezone: 'Asia/Shanghai',
};

function formatLastUpdated(date: Date | null): string {
  if (!date) {
    return '等待首次更新';
  }

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `更新于 ${hours}:${minutes}`;
}

export default function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [hourlyWeather, setHourlyWeather] = useState<HourlyWeather[]>([]);
  const [selectedCity, setSelectedCity] =
    useState<WeatherLocation>(DEFAULT_CITY);
  const [isCitySearchVisible, setIsCitySearchVisible] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [primaryRecommendationIndex, setPrimaryRecommendationIndex] =
    useState(0);
  const weatherRequestInFlight = useRef(false);

  const recommendations = weather ? getOutfitRecommendations(weather) : [];
  const orderedRecommendations = recommendations.map(
    (_, index) =>
      recommendations[
        (primaryRecommendationIndex + index) % recommendations.length
      ]
  );

  const getWeather = useCallback(
    async (
      targetCity: WeatherLocation,
      updateSelectedCity = false
    ): Promise<boolean> => {
      if (weatherRequestInFlight.current) {
        return false;
      }

      weatherRequestInFlight.current = true;
      setIsLoading(true);
      setWeatherError(null);

      try {
        const forecast = await fetchWeather({
          latitude: targetCity.latitude,
          longitude: targetCity.longitude,
        });

        setWeather(forecast.current);
        setHourlyWeather(forecast.hourly);
        if (updateSelectedCity) {
          setSelectedCity(targetCity);
        }
        setLastUpdated(new Date());
        setPrimaryRecommendationIndex(0);
        return true;
      } catch (error) {
        console.error('天气获取失败：', error);
        setWeatherError(
          error instanceof Error ? error.message : '天气获取失败，请稍后重试'
        );
        return false;
      } finally {
        weatherRequestInFlight.current = false;
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const requestTimer = setTimeout(() => {
      void getWeather(DEFAULT_CITY);
    }, 0);

    return () => clearTimeout(requestTimer);
  }, [getWeather]);

  function showNextRecommendation() {
    if (recommendations.length > 1) {
      setPrimaryRecommendationIndex(
        (currentIndex) => (currentIndex + 1) % recommendations.length
      );
    }
  }

  function selectCity(city: CitySearchResult) {
    if (weatherRequestInFlight.current) {
      return;
    }

    setIsCitySearchVisible(false);
    void getWeather(city, true);
  }

  const primaryRecommendation = orderedRecommendations[0] ?? null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <CosmicBackground>
      <ScrollView
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
        style={styles.page}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>WeatherFit</Text>
            <Text style={styles.subtitle}>WEATHER × OUTFIT</Text>
          </View>
          <Text style={styles.avatar}>👤</Text>
        </View>

        <View style={styles.weatherToolbar}>
          <Pressable
            accessibilityLabel={`切换城市，当前城市${selectedCity.name}`}
            accessibilityRole="button"
            disabled={isLoading}
            onPress={() => setIsCitySearchVisible(true)}
            style={({ pressed }) => [
              styles.cityButton,
              isLoading && styles.toolbarButtonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.cityButtonText}>📍 {selectedCity.name}⌄</Text>
            <Text numberOfLines={1} style={styles.cityMeta}>
              {[selectedCity.admin1, selectedCity.country]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </Pressable>

          <View style={styles.refreshArea}>
            <Pressable
              accessibilityLabel={`刷新${selectedCity.name}天气`}
              accessibilityRole="button"
              disabled={isLoading}
              onPress={() => void getWeather(selectedCity)}
              style={({ pressed }) => [
                styles.refreshButton,
                isLoading && styles.toolbarButtonDisabled,
                pressed && styles.buttonPressed,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.refreshButtonText}>↻ 刷新</Text>
              )}
            </Pressable>
            <Text style={styles.lastUpdated}>
              {formatLastUpdated(lastUpdated)}
            </Text>
          </View>
        </View>

        <WeatherCard
          cityName={selectedCity.name}
          weather={weather}
          isLoading={isLoading}
        />

        {weatherError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>天气更新失败</Text>
            <Text style={styles.errorMessage}>{weatherError}</Text>
            <Pressable
              accessibilityLabel="重新加载天气"
              accessibilityRole="button"
              disabled={isLoading}
              onPress={() => void getWeather(selectedCity)}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.retryButtonText}>重新加载天气</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.forecastSurface}>
          <HourlyWeatherForecast
            data={hourlyWeather}
            isLoading={isLoading}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>今日穿搭推荐</Text>
          <Text style={styles.sectionSubtitle}>
            根据天气，找到今天最适合你的穿搭
          </Text>
        </View>

        {weather ? (
          orderedRecommendations.map((recommendation, index) => (
            <OutfitCard
              isPrimary={index === 0}
              key={recommendation.id}
              onChangeOutfit={
                index === 0 ? showNextRecommendation : undefined
              }
              recommendation={recommendation}
            />
          ))
        ) : (
          !weatherError && (
            <OutfitCard recommendation={null} isPrimary={true} />
          )
        )}

        <Text style={styles.sectionTitle}>更多功能</Text>

        <View style={styles.features}>
          <Pressable
            accessibilityLabel="打开我的衣橱"
            accessibilityRole="button"
            onPress={() => navigation.navigate('Wardrobe')}
            style={({ pressed }) => [
              styles.featureCard,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.featureIcon}>👚</Text>
            <Text style={styles.featureTitle}>我的衣橱</Text>
            <Text style={styles.featureDescription}>管理个人衣物</Text>
          </Pressable>

          <Pressable
            accessibilityLabel="生成智能穿搭"
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate('OutfitResult', {
                cityName: selectedCity.name,
                weather,
                recommendation: primaryRecommendation,
              })
            }
            style={({ pressed }) => [
              styles.featureCard,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.featureIcon}>✨</Text>
            <Text style={styles.featureTitle}>智能穿搭</Text>
            <Text style={styles.featureDescription}>结合天气与衣橱</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>WeatherFit · 让每天穿搭更简单</Text>
      </ScrollView>

      <CitySearch
        onClose={() => setIsCitySearchVisible(false)}
        onSelectCity={selectCity}
        visible={isCitySearchVisible}
      />
      </CosmicBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F3F6FA',
    flex: 1,
  },
  page: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  pageContent: {
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
    marginTop: 18,
  },
  logo: {
    color: cosmicTheme.colors.textPrimary,
    fontSize: 27,
    fontWeight: '800',
  },
  subtitle: {
    color: cosmicTheme.colors.softStarlight,
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 4,
  },
  avatar: {
    fontSize: 28,
  },
  weatherToolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cityButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flex: 1,
    marginRight: 12,
    minHeight: 58,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  cityButtonText: {
    color: '#18324B',
    fontSize: 15,
    fontWeight: '800',
  },
  cityMeta: {
    color: '#8293A5',
    fontSize: 10,
    marginTop: 4,
  },
  refreshArea: {
    alignItems: 'flex-end',
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: '#234968',
    borderRadius: 15,
    height: 38,
    justifyContent: 'center',
    minWidth: 78,
    paddingHorizontal: 13,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  lastUpdated: {
    color: cosmicTheme.colors.textSecondary,
    fontSize: 9,
    marginTop: 5,
  },
  toolbarButtonDisabled: {
    opacity: 0.62,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: cosmicTheme.colors.textPrimary,
    fontSize: 21,
    fontWeight: '700',
    marginBottom: 7,
  },
  sectionSubtitle: {
    color: cosmicTheme.colors.textSecondary,
    fontSize: 13,
  },
  errorCard: {
    backgroundColor: '#FFF1F0',
    borderColor: '#F3B9B4',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    padding: 16,
  },
  errorTitle: {
    color: '#A3332A',
    fontSize: 15,
    fontWeight: '700',
  },
  errorMessage: {
    color: '#8A4B46',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#234968',
    borderRadius: 14,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.78,
  },
  features: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flex: 1,
    padding: 17,
  },
  featureIcon: {
    fontSize: 27,
    marginBottom: 12,
  },
  featureTitle: {
    color: '#18324B',
    fontSize: 15,
    fontWeight: '700',
  },
  featureDescription: {
    color: '#8293A5',
    fontSize: 11,
    marginTop: 6,
  },
  footer: {
    color: cosmicTheme.colors.textSecondary,
    fontSize: 11,
    marginBottom: 35,
    marginTop: 30,
    textAlign: 'center',
  },
  forecastSurface: {
    backgroundColor: cosmicTheme.colors.surface,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 16,
  },
});
