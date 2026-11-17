import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import WeatherBackground from '../components/weather/WeatherBackground';
import OutfitCard from '../components/outfit/OutfitCard';
import DailyOutfitPlan from '../components/outfit/DailyOutfitPlan';
import CitySearch from '../components/weather/CitySearch';
import HourlyWeatherForecast from '../components/weather/HourlyWeather';
import WeatherCard from '../components/weather/WeatherCard';
import type { ScreenProps } from '../navigation/types';
import {
  fetchWeather,
  type WeatherSnapshotMetadata,
} from '../services/weatherApi';
import {
  buildOutfitWeatherContext,
  getOutfitRecommendations,
} from '../services/outfitRecommendations';
import { cosmicTheme } from '../theme/cosmicTheme';
import type {
  CitySearchResult,
  CurrentWeather,
  HourlyWeather,
  WeatherLocation,
} from '../types/models';


const DEFAULT_CITY: WeatherLocation = {
  name: '长沙',
  latitude: 28.2282,
  longitude: 112.9388,
  country: '中国',
  admin1: '湖南省',
  timezone: 'Asia/Shanghai',
};

function formatWeatherDataTime(value?: string): string {
  if (!value) {
    return '等待首次更新';
  }

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/
  );
  if (!match) {
    return `数据时间 ${value}`;
  }

  return `数据时间 ${match[2]}-${match[3]} ${match[4]}:${match[5]}`;
}

export default function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const isFocused = useIsFocused();
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [hourlyWeather, setHourlyWeather] = useState<HourlyWeather[]>([]);
  const [forecastMetadata, setForecastMetadata] =
    useState<WeatherSnapshotMetadata | null>(null);
  const [selectedCity, setSelectedCity] =
    useState<WeatherLocation>(DEFAULT_CITY);
  const [isCitySearchVisible, setIsCitySearchVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [isWeatherStale, setIsWeatherStale] = useState(false);
  const [primaryRecommendationIndex, setPrimaryRecommendationIndex] =
    useState(0);
  const weatherRequestInFlight = useRef(false);
  const hasWeatherSnapshot = useRef(false);

  const recommendations = weather
    ? getOutfitRecommendations(
        buildOutfitWeatherContext(weather, hourlyWeather)
      )
    : [];
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
        setForecastMetadata(forecast.metadata);
        if (updateSelectedCity) {
          setSelectedCity(targetCity);
        }
        hasWeatherSnapshot.current = true;
        setIsWeatherStale(false);
        setPrimaryRecommendationIndex(0);
        return true;
      } catch (error) {
        console.error('天气获取失败：', error);
        setWeatherError(
          error instanceof Error ? error.message : '天气获取失败，请稍后重试'
        );
        setIsWeatherStale(hasWeatherSnapshot.current);
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
      <WeatherBackground weather={weather} motionEnabled={isFocused}>
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
              {formatWeatherDataTime(forecastMetadata?.currentTime)}
            </Text>
          </View>
        </View>

        <WeatherCard
          cityName={selectedCity.name}
          weather={weather}
          isLoading={isLoading}
          isStale={isWeatherStale}
          dataTimeLabel={formatWeatherDataTime(forecastMetadata?.currentTime)}
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
          <DailyOutfitPlan
            hourly={hourlyWeather}
            cityName={selectedCity.name}
            timezone={forecastMetadata?.timezone ?? selectedCity.timezone}
            utcOffsetSeconds={forecastMetadata?.utcOffsetSeconds}
            isLoading={isLoading}
            weatherError={weatherError}
            lastUpdated={null}
            active={isFocused}
            onOpenWardrobe={() => navigation.navigate('Wardrobe')}
          />
          <Text style={styles.outfitEyebrow}>YOUR DAILY EDIT</Text>
          <Text style={styles.sectionTitle}>今日穿搭推荐</Text>
          <Text style={styles.sectionSubtitle}>
            跟随此刻天气，探索今天的三种风格
          </Text>
        </View>

        {weather ? (
          orderedRecommendations.map((recommendation, index) => (
            <OutfitCard
              isPrimary={index === 0}
              position={index + 1}
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

        <Pressable
          accessibilityLabel="打开宇宙探索"
          accessibilityRole="button"
          onPress={() => navigation.navigate('CosmicExplore')}
          style={({ pressed }) => [styles.exploreEntry, pressed && styles.buttonPressed]}
        >
          <Text style={styles.exploreIcon}>✦</Text>
          <View style={styles.exploreCopy}>
            <Text style={styles.exploreTitle}>宇宙探索</Text>
            <Text style={styles.exploreDescription}>从今天的天气，出发去看宇宙</Text>
          </View>
          <Text style={styles.exploreArrow}>↗</Text>
        </Pressable>

        <Text style={styles.footer}>WeatherFit · 让每天穿搭更简单</Text>
      </ScrollView>

      <CitySearch
        onClose={() => setIsCitySearchVisible(false)}
        onSelectCity={selectCity}
        visible={isCitySearchVisible}
      />
      </WeatherBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F3F6FA',
    flex: 1,
  },
  exploreEntry: {
    flexDirection: 'row', alignItems: 'center', gap: 15,
    backgroundColor: cosmicTheme.colors.explorePanel,
    borderColor: cosmicTheme.colors.cardBorder, borderWidth: 1,
    borderRadius: 20, padding: 18, marginTop: 18, minHeight: 88,
  },
  exploreIcon: { color: cosmicTheme.colors.violetLight, fontSize: 27 },
  exploreCopy: { flex: 1 },
  exploreTitle: { color: cosmicTheme.colors.textPrimary, fontSize: 16, fontWeight: '700' },
  exploreDescription: { color: cosmicTheme.colors.textSecondary, fontSize: 10, lineHeight: 18, marginTop: 5 },
  exploreArrow: { color: cosmicTheme.colors.softStarlight, fontSize: 22 },
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
  outfitEyebrow: {
    color: cosmicTheme.colors.violetLight,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.4,
    marginBottom: 8,
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
