import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { HourlyWeather as HourlyWeatherData } from '../../types/models';
import { getWeatherDisplay } from './WeatherCard';

type HourlyWeatherProps = {
  data: HourlyWeatherData[];
  isLoading: boolean;
};

function formatHour(time: string): string {
  const timePart = time.split('T')[1];
  return timePart?.slice(0, 5) || '--:--';
}

function getWeatherReminder(data: HourlyWeatherData[]): string | null {
  const validHours = data.filter(
    (hour) =>
      Number.isFinite(hour.temperature_2m) &&
      Number.isFinite(hour.precipitation_probability)
  );

  if (validHours.length === 0) {
    return null;
  }

  const temperatures = validHours.map((hour) => hour.temperature_2m);
  const maxRainProbability = Math.max(
    ...validHours.map((hour) => hour.precipitation_probability)
  );
  const currentTemperature = temperatures[0];
  const lowestTemperature = Math.min(...temperatures);
  const highestTemperature = Math.max(...temperatures);

  const rainAdvice =
    maxRainProbability >= 60
      ? '未来24小时降雨概率较高，建议随身带伞。'
      : maxRainProbability >= 30
        ? '部分时段可能下雨，带一把折叠伞更安心。'
        : '未来24小时降雨概率较低，暂时不用特意带伞。';

  let clothingAdvice = '温度变化较平稳，按当前穿搭即可。';
  if (lowestTemperature <= currentTemperature - 5) {
    clothingAdvice = '之后会明显降温，建议带一件方便穿脱的外套。';
  } else if (highestTemperature >= currentTemperature + 5) {
    clothingAdvice = '之后会明显升温，建议选择方便增减的叠穿。';
  } else if (highestTemperature - lowestTemperature >= 8) {
    clothingAdvice = '昼夜温差较大，建议预留一层轻薄外搭。';
  }

  return `${rainAdvice}${clothingAdvice}`;
}

export default function HourlyWeather({
  data,
  isLoading,
}: HourlyWeatherProps) {
  const reminder = getWeatherReminder(data);

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.title}>未来24小时</Text>
          <Text style={styles.subtitle}>逐小时天气趋势</Text>
        </View>
        <Text style={styles.rangeLabel}>24H</Text>
      </View>

      {data.length > 0 ? (
        <ScrollView
          contentContainerStyle={styles.hourList}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {data.map((hour, index) => {
            const display = getWeatherDisplay(hour);
            const isCurrentHour = index === 0;

            return (
              <View
                key={`${hour.time}-${index}`}
                style={[
                  styles.hourCard,
                  isCurrentHour && styles.currentHourCard,
                ]}
              >
                <Text
                  style={[
                    styles.time,
                    isCurrentHour && styles.currentHourText,
                  ]}
                >
                  {isCurrentHour ? '现在' : formatHour(hour.time)}
                </Text>
                <Text accessibilityLabel={display.text} style={styles.icon}>
                  {display.icon}
                </Text>
                <Text
                  style={[
                    styles.temperature,
                    isCurrentHour && styles.currentTemperature,
                  ]}
                >
                  {Math.round(hour.temperature_2m)}°
                </Text>
                <Text
                  style={[
                    styles.rainProbability,
                    isCurrentHour && styles.currentRainProbability,
                  ]}
                >
                  💧 {Math.round(hour.precipitation_probability)}%
                </Text>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            {isLoading ? '正在加载逐小时天气...' : '暂无逐小时天气数据'}
          </Text>
        </View>
      )}

      {reminder ? (
        <View style={styles.reminderCard}>
          <Text style={styles.reminderIcon}>💡</Text>
          <View style={styles.reminderCopy}>
            <Text style={styles.reminderTitle}>天气提醒</Text>
            <Text style={styles.reminderText}>{reminder}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    color: '#18324B',
    fontSize: 21,
    fontWeight: '700',
  },
  subtitle: {
    color: '#8293A5',
    fontSize: 12,
    marginTop: 4,
  },
  rangeLabel: {
    backgroundColor: '#E1EFF7',
    borderRadius: 12,
    color: '#315D7B',
    fontSize: 10,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  hourList: {
    gap: 10,
    paddingRight: 4,
  },
  hourCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E4EBF0',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    width: 88,
  },
  currentHourCard: {
    backgroundColor: '#234968',
    borderColor: '#234968',
  },
  time: {
    color: '#6A7C8C',
    fontSize: 11,
    fontWeight: '700',
  },
  currentHourText: {
    color: '#D9EAF7',
  },
  icon: {
    fontSize: 27,
    marginTop: 9,
  },
  temperature: {
    color: '#18324B',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 7,
  },
  currentTemperature: {
    color: '#FFFFFF',
  },
  rainProbability: {
    color: '#6AA5C9',
    fontSize: 10,
    marginTop: 7,
  },
  currentRainProbability: {
    color: '#D9EAF7',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
  },
  emptyText: {
    color: '#8293A5',
    fontSize: 13,
  },
  reminderCard: {
    backgroundColor: '#FFF8E8',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 11,
    marginTop: 14,
    padding: 15,
  },
  reminderIcon: {
    fontSize: 19,
  },
  reminderCopy: {
    flex: 1,
  },
  reminderTitle: {
    color: '#8C6716',
    fontSize: 13,
    fontWeight: '800',
  },
  reminderText: {
    color: '#715E35',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 4,
  },
});
