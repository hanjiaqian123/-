import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { cosmicTheme } from '../../theme/cosmicTheme';
import type { CurrentWeather } from '../../types/models';

type WeatherCardProps = {
  weather: CurrentWeather | null;
  isLoading: boolean;
  isStale?: boolean;
  dataTimeLabel?: string;
  cityName: string;
  motionEnabled?: boolean;
};

export type WeatherDisplay = {
  text: string;
  icon: string;
};

export function getWeatherDisplay(
  weather: Pick<CurrentWeather, 'weather_code' | 'is_day'>
): WeatherDisplay {
  const code = weather.weather_code;
  const isDay = weather.is_day === 1;

  if (code === 0) {
    return { text: '晴天', icon: isDay ? '☀️' : '🌙' };
  }

  if (code >= 1 && code <= 2) {
    return { text: '多云', icon: isDay ? '🌤️' : '☁️' };
  }

  if (code === 3) {
    return { text: '阴天', icon: '☁️' };
  }

  if (code === 45 || code === 48) {
    return { text: '雾', icon: '🌫️' };
  }

  if (code >= 51 && code <= 55) {
    return { text: '毛毛雨', icon: '🌦️' };
  }

  if (code >= 56 && code <= 57) {
    return { text: '冻毛毛雨', icon: '🌧️' };
  }

  if (code >= 61 && code <= 65) {
    return { text: '降雨', icon: '🌧️' };
  }

  if (code >= 66 && code <= 67) {
    return { text: '冻雨', icon: '🌧️' };
  }

  if (code >= 71 && code <= 77) {
    return { text: '降雪', icon: '❄️' };
  }

  if (code >= 80 && code <= 82) {
    return { text: '阵雨', icon: '🌦️' };
  }

  if (code >= 85 && code <= 86) {
    return { text: '阵雪', icon: '🌨️' };
  }

  if (code >= 95 && code <= 99) {
    return { text: '雷暴', icon: '⛈️' };
  }

  return { text: '天气变化中', icon: isDay ? '🌤️' : '☁️' };
}

function getUvRisk(uvIndex: number): string {
  if (uvIndex <= 2) {
    return '低';
  }

  if (uvIndex <= 5) {
    return '中';
  }

  if (uvIndex <= 7) {
    return '高';
  }

  if (uvIndex <= 10) {
    return '很高';
  }

  return '极高';
}

// Four decorative stars share one UI-thread clock; no per-frame React updates.
function RefreshStar({
  progress,
  index,
  isLoading,
  shouldAnimate,
}: {
  progress: SharedValue<number>;
  index: number;
  isLoading: boolean;
  shouldAnimate: boolean;
}) {
  const starStyle = useAnimatedStyle(() => {
    const phase = (progress.value + index * 0.22) % 1;
    const brightness = 1 - Math.abs(phase * 2 - 1);

    return {
      opacity: isLoading ? (shouldAnimate ? 0.22 + brightness * 0.65 : 0.65) : 0,
      transform: [
        { scale: isLoading && shouldAnimate ? 0.8 + brightness * 0.3 : 1 },
      ],
    };
  });

  return (
    <Animated.Text
      style={[
        styles.refreshStar,
        { left: `${18 + index * 21}%`, top: 4 + (index % 2) * 4 },
        starStyle,
      ]}
    >
      ✦
    </Animated.Text>
  );
}

export default function WeatherCard({
  weather,
  isLoading,
  isStale = false,
  dataTimeLabel,
  cityName,
  motionEnabled = true,
}: WeatherCardProps) {
  const weatherDisplay = weather ? getWeatherDisplay(weather) : null;
  const reduceMotion = useReducedMotion();
  const shouldAnimate = motionEnabled && !reduceMotion;
  const hasWeather = weather !== null;
  const temperatureReveal = useSharedValue(1);
  const iconFloat = useSharedValue(0);
  const refreshProgress = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(temperatureReveal);

    // New successful weather objects trigger a reveal; failed refreshes keep
    // the same object and leave the visible reading untouched.
    if (!weather || !shouldAnimate) {
      temperatureReveal.value = 1;
      return;
    }

    temperatureReveal.value = 0;
    temperatureReveal.value = withTiming(1, {
      duration: cosmicTheme.motion.weatherRevealDuration,
      easing: Easing.out(Easing.cubic),
    });

    return () => cancelAnimation(temperatureReveal);
  }, [shouldAnimate, temperatureReveal, weather]);

  useEffect(() => {
    cancelAnimation(iconFloat);
    iconFloat.value = 0;

    if (!hasWeather || !shouldAnimate) {
      return;
    }

    iconFloat.value = withRepeat(
      withTiming(1, {
        duration: cosmicTheme.motion.weatherFloatDuration,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    return () => cancelAnimation(iconFloat);
  }, [hasWeather, iconFloat, shouldAnimate]);

  useEffect(() => {
    cancelAnimation(refreshProgress);
    refreshProgress.value = 0;

    if (!isLoading || !shouldAnimate) {
      return;
    }

    refreshProgress.value = withRepeat(
      withTiming(1, {
        duration: cosmicTheme.motion.weatherRefreshDuration,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    return () => cancelAnimation(refreshProgress);
  }, [isLoading, refreshProgress, shouldAnimate]);

  const temperatureStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + temperatureReveal.value * 0.65,
    transform: [{ translateY: (1 - temperatureReveal.value) * 8 }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: iconFloat.value * -4 },
      { rotate: `${iconFloat.value * 2}deg` },
    ],
  }));

  return (
    <View style={styles.weatherCard}>
      <LinearGradient
        colors={cosmicTheme.gradients.weatherCard}
        end={{ x: 1, y: 0.9 }}
        start={{ x: 0, y: 0 }}
        style={styles.cardContent}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        >
          <LinearGradient
            colors={cosmicTheme.gradients.weatherRim}
            end={{ x: 1, y: 0 }}
            start={{ x: 0, y: 0 }}
            style={styles.rimLight}
          />
          <View style={styles.distantOrbit} />
          {[0, 1, 2, 3].map((index) => (
            <RefreshStar
              index={index}
              isLoading={isLoading}
              key={index}
              progress={refreshProgress}
              shouldAnimate={shouldAnimate}
            />
          ))}
        </View>

        <View style={styles.cardHeader}>
          <View style={styles.cityCopy}>
            <Text style={styles.eyebrow}>CURRENT WEATHER</Text>
            <Text style={styles.city}>今日天气 · {cityName}</Text>
          </View>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                isLoading && styles.loadingDot,
                isStale && !isLoading && styles.staleDot,
              ]}
            />
            <Text style={styles.statusText}>
              {isLoading
                ? '更新中'
                : isStale && weather
                  ? '数据可能已过期'
                  : weather
                    ? '当前天气'
                    : '等待数据'}
            </Text>
          </View>
        </View>

        <View style={styles.weatherMain}>
          <View style={styles.temperatureCopy}>
            <Animated.View style={[styles.temperatureRow, temperatureStyle]}>
              <Text
                accessibilityLabel={
                  weather
                    ? `温度${Math.round(weather.temperature_2m)}摄氏度`
                    : '暂无温度数据'
                }
                adjustsFontSizeToFit
                minimumFontScale={0.6}
                numberOfLines={1}
                style={styles.temperature}
              >
                {weather ? Math.round(weather.temperature_2m) : '--'}°
              </Text>
              <Text style={styles.temperatureUnit}>C</Text>
            </Animated.View>

            <Text style={styles.weatherText}>
              {weatherDisplay?.text ??
                (isLoading ? '天气加载中...' : '暂无天气数据')}
            </Text>

            <Text style={styles.feelsLike}>
              体感温度 {weather ? weather.apparent_temperature : '--'}°C
            </Text>
          </View>

          <View style={styles.iconStage}>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
            >
              <LinearGradient
                colors={cosmicTheme.gradients.weatherHalo}
                end={{ x: 0.9, y: 1 }}
                start={{ x: 0.1, y: 0 }}
                style={styles.iconHalo}
              />
              <View style={styles.iconOrbit} />
              <View style={styles.orbitStar} />
            </View>
            <Animated.View style={iconStyle}>
              <Text style={styles.weatherIcon}>
                {weatherDisplay?.icon ?? '⌛'}
              </Text>
            </Animated.View>
          </View>
        </View>

        {weather && dataTimeLabel ? (
          <Text style={[styles.dataTime, isStale && styles.staleDataTime]}>
            {dataTimeLabel} · 城市当地时间
          </Text>
        ) : null}

        <View style={styles.weatherDetails}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>湿度</Text>
            <Text style={styles.detail}>
              {weather ? weather.relative_humidity_2m : '--'}%
            </Text>
          </View>

          <View style={styles.metric}>
            <Text style={styles.metricLabel}>风速</Text>
            <Text style={styles.detail}>
              {weather ? weather.wind_speed_10m : '--'} km/h
            </Text>
          </View>

          <View style={styles.metric}>
            <Text style={styles.metricLabel}>紫外线</Text>
            <Text style={styles.detail}>
              {weather
                ? `${weather.uv_index.toFixed(1)} ${getUvRisk(weather.uv_index)}`
                : '--'}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  weatherCard: {
    backgroundColor: cosmicTheme.colors.deepSpaceBlue,
    borderColor: cosmicTheme.colors.cardBorder,
    borderRadius: 26,
    borderWidth: 1,
    marginBottom: 28,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 22,
  },
  rimLight: {
    height: 1,
    left: 24,
    position: 'absolute',
    right: 24,
    top: 0,
  },
  distantOrbit: {
    borderColor: cosmicTheme.colors.cardDivider,
    borderRadius: 180,
    borderWidth: 1,
    height: 270,
    position: 'absolute',
    right: -130,
    top: -150,
    width: 330,
  },
  refreshStar: {
    color: cosmicTheme.colors.starlight,
    fontSize: 16,
    position: 'absolute',
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  cityCopy: {
    flex: 1,
  },
  eyebrow: {
    color: cosmicTheme.colors.violetLight,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2.2,
  },
  city: {
    color: cosmicTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 7,
  },
  statusBadge: {
    alignItems: 'center',
    backgroundColor: cosmicTheme.colors.cardInset,
    borderColor: cosmicTheme.colors.cardDivider,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    flexShrink: 1,
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  statusDot: {
    backgroundColor: cosmicTheme.colors.softStarlight,
    borderRadius: 3,
    height: 4,
    width: 4,
  },
  loadingDot: {
    backgroundColor: cosmicTheme.colors.violetLight,
  },
  staleDot: {
    backgroundColor: '#FFB86B',
  },
  statusText: {
    color: cosmicTheme.colors.textSecondary,
    flexShrink: 1,
    fontSize: 10,
  },
  weatherMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
    marginBottom: 24,
    marginTop: 24,
  },
  temperatureCopy: {
    flex: 1,
    minWidth: 0,
  },
  temperatureRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
  },
  temperature: {
    color: cosmicTheme.colors.textPrimary,
    flexShrink: 1,
    fontSize: 82,
    fontVariant: ['tabular-nums'],
    fontWeight: '200',
    letterSpacing: -4,
  },
  temperatureUnit: {
    color: cosmicTheme.colors.softStarlight,
    fontSize: 17,
    fontWeight: '500',
    marginLeft: 4,
  },
  weatherText: {
    color: cosmicTheme.colors.textPrimary,
    fontSize: 17,
  },
  feelsLike: {
    color: cosmicTheme.colors.textSecondary,
    fontSize: 12,
    marginTop: 6,
  },
  dataTime: {
    color: cosmicTheme.colors.textSecondary,
    fontSize: 10,
    marginBottom: 14,
  },
  staleDataTime: {
    color: '#FFD29A',
  },
  weatherIcon: {
    fontSize: 62,
  },
  iconStage: {
    alignItems: 'center',
    height: 112,
    justifyContent: 'center',
    width: 100,
  },
  iconHalo: {
    borderRadius: 80,
    height: 124,
    left: -12,
    position: 'absolute',
    top: -6,
    width: 124,
  },
  iconOrbit: {
    borderColor: cosmicTheme.colors.orbitLine,
    borderRadius: 70,
    borderWidth: 1,
    height: 66,
    left: -10,
    position: 'absolute',
    top: 24,
    transform: [{ rotate: '-24deg' }],
    width: 120,
  },
  orbitStar: {
    backgroundColor: cosmicTheme.colors.violetLight,
    borderRadius: 3,
    height: 4,
    position: 'absolute',
    right: 1,
    top: 25,
    width: 4,
  },
  weatherDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: cosmicTheme.colors.cardDivider,
    paddingTop: 16,
  },
  metric: {
    backgroundColor: cosmicTheme.colors.cardInset,
    borderRadius: 12,
    flexBasis: 74,
    flexGrow: 1,
    paddingHorizontal: 9,
    paddingVertical: 11,
  },
  metricLabel: {
    color: cosmicTheme.colors.textSecondary,
    fontSize: 10,
    marginBottom: 6,
  },
  detail: {
    color: cosmicTheme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
});
