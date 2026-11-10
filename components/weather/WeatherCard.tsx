import { StyleSheet, Text, View } from 'react-native';

import type { CurrentWeather } from '../../App';

type WeatherCardProps = {
  weather: CurrentWeather | null;
  isLoading: boolean;
};

type WeatherDisplay = {
  text: string;
  icon: string;
};

function getWeatherDisplay(weather: CurrentWeather): WeatherDisplay {
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

export default function WeatherCard({
  weather,
  isLoading,
}: WeatherCardProps) {
  const weatherDisplay = weather ? getWeatherDisplay(weather) : null;

  return (
    <View style={styles.weatherCard}>
      <Text style={styles.city}>今日天气 · 长沙</Text>

      <View style={styles.weatherMain}>
        <View>
          <Text style={styles.temperature}>
            {weather ? Math.round(weather.temperature_2m) : '--'}°
          </Text>

          <Text style={styles.weatherText}>
            {weatherDisplay?.text ??
              (isLoading ? '天气加载中...' : '暂无天气数据')}
          </Text>

          <Text style={styles.feelsLike}>
            体感温度 {weather ? weather.apparent_temperature : '--'}°C
          </Text>
        </View>

        <Text style={styles.weatherIcon}>
          {weatherDisplay?.icon ?? '⌛'}
        </Text>
      </View>

      <View style={styles.weatherDetails}>
        <Text style={styles.detail}>
          湿度 {weather ? weather.relative_humidity_2m : '--'}%
        </Text>

        <Text style={styles.detail}>
          风速 {weather ? weather.wind_speed_10m : '--'} km/h
        </Text>

        <Text style={styles.detail}>
          紫外线{' '}
          {weather
            ? `${weather.uv_index.toFixed(1)} ${getUvRisk(weather.uv_index)}`
            : '--'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weatherCard: {
    backgroundColor: '#234968',
    borderRadius: 22,
    padding: 22,
    marginBottom: 28,
  },
  city: {
    color: '#D9EAF7',
    fontSize: 14,
  },
  weatherMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 18,
  },
  temperature: {
    color: '#FFFFFF',
    fontSize: 58,
    fontWeight: '300',
  },
  weatherText: {
    color: '#FFFFFF',
    fontSize: 17,
  },
  feelsLike: {
    color: '#D9EAF7',
    fontSize: 12,
    marginTop: 6,
  },
  weatherIcon: {
    fontSize: 65,
  },
  weatherDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#54728A',
    paddingTop: 16,
  },
  detail: {
    color: '#FFFFFF',
    fontSize: 12,
  },
});
