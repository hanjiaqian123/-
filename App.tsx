import { StatusBar } from 'expo-status-bar';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';

import { useCallback, useEffect, useState } from 'react';

import OutfitCard from './components/outfit/OutfitCard';
import WeatherCard from './components/weather/WeatherCard';

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
// 穿搭推荐的数据类型
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

// 根据天气生成穿搭建议
function getBaseOutfitRecommendations(
  weather: CurrentWeather
): OutfitRecommendation[] {

  const temperature = weather.apparent_temperature;

  // 寒冷天气
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
        tip: '气温较低，建议做好保暖。如果有降雨，还要注意防水。'
      },
      {
        id: 'cold-commute',
        title: '都市保暖通勤风',
        description: '利落、厚实、有质感',
        top: '🧥 羊毛大衣搭配保暖针织衫',
        bottom: '👖 加绒直筒长裤',
        shoes: '🥾 防风短靴',
        accessory: '🧤 保暖手套',
        tip: '通勤时建议采用针织衫与大衣叠穿，兼顾室内外温差。'
      },
      {
        id: 'cold-sport',
        title: '冬日活力运动风',
        description: '轻暖、灵活、有活力',
        top: '🧥 抓绒卫衣搭配短款羽绒服',
        bottom: '👖 加绒运动长裤',
        shoes: '👟 保暖高帮运动鞋',
        accessory: '🧢 针织帽',
        tip: '户外活动可选择轻量羽绒与抓绒内层，方便运动又能减少热量流失。'
      }
    ];
  }

  // 凉爽天气
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
        tip: '天气偏凉，建议穿一件外套，避免着凉。'
      },
      {
        id: 'cool-commute',
        title: '利落轻通勤风',
        description: '简洁、挺括、易叠穿',
        top: '🧥 风衣搭配薄针织衫',
        bottom: '👖 直筒西装长裤',
        shoes: '👞 轻便乐福鞋',
        accessory: '🧣 薄款围巾',
        tip: '早晚偏凉时可以系上薄围巾，中午升温后脱下风衣即可。'
      },
      {
        id: 'cool-sport',
        title: '轻户外运动风',
        description: '防风、灵活、休闲',
        top: '🧥 防风外套搭配长袖运动衫',
        bottom: '👖 束脚运动长裤',
        shoes: '👟 缓震运动鞋',
        accessory: '🎒 轻量双肩包',
        tip: '选择方便活动的防风外层，运动后及时增添外套避免受凉。'
      }
    ];
  }

  // 温和天气
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
        tip: '气温比较舒适，适合轻薄衣物，可以根据早晚温差增减衣物。'
      },
      {
        id: 'mild-commute',
        title: '清爽轻熟通勤风',
        description: '干净、轻盈、有质感',
        top: '👔 衬衫搭配薄款针织开衫',
        bottom: '👖 垂感直筒裤',
        shoes: '👞 轻便通勤鞋',
        accessory: '👜 简约单肩包',
        tip: '薄开衫适合应对空调房和早晚温差，白天温暖时可以单穿衬衫。'
      },
      {
        id: 'mild-outdoor',
        title: '城市轻户外风',
        description: '透气、实用、有层次',
        top: '🧥 轻薄防晒外套搭配透气上衣',
        bottom: '👖 宽松工装长裤',
        shoes: '🥾 轻量徒步鞋',
        accessory: '🧢 遮阳帽',
        tip: '轻薄外层便于随时穿脱，适合步行、骑行或短时间户外活动。'
      }
    ];
  }

  // 炎热天气
  return [
    {
      id: 'hot-summer',
      title: '清爽夏日风',
      description: '清凉、透气、轻便',
      top: '👕 透气短袖',
      bottom: '🩳 轻薄休闲裤',
      shoes: '👟 透气运动鞋',
      accessory: '🕶️ 太阳镜',
      tip: '天气较热，建议选择透气面料，注意防晒和补水。'
    },
    {
      id: 'hot-commute',
      title: '轻盈夏日通勤风',
      description: '清爽、利落、不闷热',
      top: '👔 亚麻短袖衬衫',
      bottom: '👖 轻薄垂感长裤',
      shoes: '👞 透气便鞋',
      accessory: '👜 轻量通勤包',
      tip: '选择亚麻或速干面料，进入空调环境时可准备一件轻薄外搭。'
    },
    {
      id: 'hot-sport',
      title: '活力速干运动风',
      description: '速干、轻量、方便活动',
      top: '🎽 速干运动上衣',
      bottom: '🩳 透气运动短裤',
      shoes: '👟 网面跑步鞋',
      accessory: '🧢 防晒运动帽',
      tip: '户外运动尽量避开高温时段，并及时补水和做好防晒。'
    }
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

const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=28.2282&longitude=112.9388&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,uv_index&timezone=Asia%2FShanghai';

function isCurrentWeather(value: unknown): value is CurrentWeather {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const weather = value as Record<string, unknown>;
  return [
    'temperature_2m',
    'relative_humidity_2m',
    'apparent_temperature',
    'precipitation',
    'weather_code',
    'wind_speed_10m',
    'is_day',
    'uv_index',
  ].every((key) => typeof weather[key] === 'number');
}

export default function App() {
  // 保存天气数据
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [primaryRecommendationIndex, setPrimaryRecommendationIndex] =
    useState(0);

  const recommendations = weather ? getOutfitRecommendations(weather) : [];
  const orderedRecommendations = recommendations.map(
    (_, index) =>
      recommendations[
        (primaryRecommendationIndex + index) % recommendations.length
      ]
  );

  const getWeather = useCallback(async () => {
    setIsLoading(true);
    setWeatherError(null);

    try {
      const response = await fetch(WEATHER_URL);
      if (!response.ok) {
        throw new Error(`天气服务响应异常（${response.status}）`);
      }

      const data: unknown = await response.json();
      const current =
        data && typeof data === 'object'
          ? (data as { current?: unknown }).current
          : undefined;

      if (!isCurrentWeather(current)) {
        throw new Error('天气数据格式不完整');
      }

      setWeather(current);
      setPrimaryRecommendationIndex(0);
    } catch (error) {
      console.error('天气获取失败：', error);
      setWeather(null);
      setWeatherError(
        error instanceof Error ? error.message : '天气获取失败，请稍后重试'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    getWeather();
  }, [getWeather]);

  function showNextRecommendation() {
    if (recommendations.length > 1) {
      setPrimaryRecommendationIndex(
        (currentIndex) => (currentIndex + 1) % recommendations.length
      );
    }
  }

  return (
    <ScrollView style={styles.page}>
      <StatusBar style="dark" />

      {/* 顶部标题 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>WeatherFit</Text>
          <Text style={styles.subtitle}>
            WEATHER × OUTFIT
          </Text>
        </View>
        <Text style={styles.avatar}>👤</Text>
      </View>

      {/* 天气信息 */}
      <WeatherCard weather={weather} isLoading={isLoading} />

      {weatherError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>天气加载失败</Text>
          <Text style={styles.errorMessage}>{weatherError}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="重新加载天气"
            disabled={isLoading}
            onPress={getWeather}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.retryButtonText}>重新加载天气</Text>
          </Pressable>
        </View>
      ) : null}

      {/* 穿搭推荐 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          今日穿搭推荐
        </Text>

        <Text style={styles.sectionSubtitle}>
          根据天气，找到今天最适合你的穿搭
        </Text>
      </View>

      {weather ? (
        orderedRecommendations.map((recommendation, index) => (
          <OutfitCard
            key={recommendation.id}
            recommendation={recommendation}
            isPrimary={index === 0}
            onChangeOutfit={
              index === 0 ? showNextRecommendation : undefined
            }
          />
        ))
      ) : (
        !weatherError && (
          <OutfitCard recommendation={null} isPrimary={true} />
        )
      )}

      {/* 功能入口 */}
      <Text style={styles.sectionTitle}>更多功能</Text>

      <View style={styles.features}>
        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>👚</Text>
          <Text style={styles.featureTitle}>我的衣橱</Text>
          <Text style={styles.featureDescription}>
            管理个人衣物
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>❤️</Text>
          <Text style={styles.featureTitle}>穿搭收藏</Text>
          <Text style={styles.featureDescription}>
            保存喜欢的搭配
          </Text>
        </View>
      </View>

      <Text style={styles.footer}>
        WeatherFit · 让每天穿搭更简单
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F3F6FA',
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 55,
    marginBottom: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: 27,
    fontWeight: '800',
    color: '#18324B',
  },
  subtitle: {
    fontSize: 10,
    letterSpacing: 2,
    color: '#8293A5',
    marginTop: 4,
  },
  avatar: {
    fontSize: 28,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#18324B',
    fontSize: 21,
    fontWeight: '700',
    marginBottom: 7,
  },
  sectionSubtitle: {
    color: '#8293A5',
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
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 17,
  },
  featureIcon: {
    fontSize: 27,
    marginBottom: 12,
  },
  featureTitle: {
    color: '#18324B',
    fontWeight: '700',
    fontSize: 15,
  },
  featureDescription: {
    color: '#8293A5',
    fontSize: 11,
    marginTop: 6,
  },
  footer: {
    textAlign: 'center',
    color: '#A0ADBA',
    fontSize: 11,
    marginTop: 30,
    marginBottom: 35,
  },
});
