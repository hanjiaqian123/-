import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useWardrobe } from '../context/WardrobeContext';
import type { ScreenProps } from '../navigation/types';

export default function OutfitResultScreen({
  navigation,
  route,
}: ScreenProps<'OutfitResult'>) {
  const { items } = useWardrobe();
  const [variant, setVariant] = useState(0);
  const { cityName, recommendation, weather } = route.params;

  const selectedItems = items
    .map((_, index) => items[(index + variant) % items.length])
    .slice(0, 3);

  function showNextCombination() {
    if (items.length > 1) {
      setVariant((current) => (current + 1) % items.length);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      style={styles.page}
    >
      <View style={styles.weatherBanner}>
        <View>
          <Text style={styles.weatherLabel}>{cityName} · 当前天气</Text>
          <Text style={styles.weatherValue}>
            {weather ? `${Math.round(weather.temperature_2m)}°` : '--°'}
          </Text>
        </View>
        <View style={styles.weatherMeta}>
          <Text style={styles.weatherMetaText}>
            体感 {weather ? `${weather.apparent_temperature}°C` : '暂无'}
          </Text>
          <Text style={styles.weatherMetaText}>
            风速 {weather ? `${weather.wind_speed_10m} km/h` : '暂无'}
          </Text>
        </View>
      </View>

      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>SMART OUTFIT</Text>
          <Text style={styles.title}>
            {recommendation?.title ?? '日常轻松搭配'}
          </Text>
        </View>
        <View style={styles.matchBadge}>
          <Text style={styles.matchValue}>92%</Text>
          <Text style={styles.matchLabel}>MATCH</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        结合首页实时天气建议和你保存在本机的真实衣橱，为今天生成示例组合。
      </Text>

      {selectedItems.length > 0 ? (
        <View style={styles.outfitCanvas}>
          {selectedItems.map((item, index) => (
            <View
              key={`${item.id}-${index}`}
              style={[styles.outfitItem, index === 0 && styles.outfitItemLead]}
            >
              <Image
                accessibilityLabel={`${item.name}照片`}
                resizeMode="cover"
                source={{ uri: item.imageUri }}
                style={styles.itemImage}
              />
              <View style={styles.itemCopy}>
                <Text style={styles.itemCategory}>{item.category}</Text>
                <Text numberOfLines={1} style={styles.itemName}>
                  {item.name}
                </Text>
                <Text style={styles.itemColor}>{item.color}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyWardrobe}>
          <Text style={styles.emptyWardrobeIcon}>👚</Text>
          <Text style={styles.emptyWardrobeTitle}>衣橱里还没有衣服</Text>
          <Text style={styles.emptyWardrobeText}>
            先添加真实衣服照片，才能生成基于衣橱的搭配。
          </Text>
          <Pressable
            accessibilityLabel="前往添加衣服"
            accessibilityRole="button"
            onPress={() => navigation.navigate('Upload')}
            style={({ pressed }) => [
              styles.emptyWardrobeButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.emptyWardrobeButtonText}>添加衣服</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.adviceCard}>
        <Text style={styles.adviceIcon}>💡</Text>
        <View style={styles.adviceCopy}>
          <Text style={styles.adviceTitle}>搭配说明</Text>
          <Text style={styles.adviceText}>
            {recommendation?.tip ??
              '天气暂未加载完成，当前先展示衣橱中的日常组合。'}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityLabel="更换一套衣橱组合"
        accessibilityRole="button"
        disabled={items.length < 2}
        onPress={showNextCombination}
        style={({ pressed }) => [
          styles.primaryButton,
          items.length < 2 && styles.primaryButtonDisabled,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.primaryButtonText}>↻ 换一套衣橱组合</Text>
      </Pressable>

      <Pressable
        accessibilityLabel="返回首页"
        accessibilityRole="button"
        onPress={() => navigation.popToTop()}
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.secondaryButtonText}>返回首页</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#F3F6FA',
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  weatherBanner: {
    alignItems: 'center',
    backgroundColor: '#234968',
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  weatherLabel: {
    color: '#D9EAF7',
    fontSize: 12,
  },
  weatherValue: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '300',
    marginTop: 4,
  },
  weatherMeta: {
    alignItems: 'flex-end',
    gap: 7,
  },
  weatherMetaText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 26,
  },
  headingCopy: {
    flex: 1,
  },
  eyebrow: {
    color: '#6AA5C9',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    color: '#18324B',
    fontSize: 25,
    fontWeight: '800',
    marginTop: 7,
  },
  matchBadge: {
    alignItems: 'center',
    backgroundColor: '#E7F5ED',
    borderRadius: 16,
    marginLeft: 12,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  matchValue: {
    color: '#27845C',
    fontSize: 15,
    fontWeight: '900',
  },
  matchLabel: {
    color: '#5A8E75',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  subtitle: {
    color: '#8293A5',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
  },
  outfitCanvas: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    gap: 10,
    marginTop: 20,
    padding: 14,
  },
  outfitItem: {
    alignItems: 'center',
    backgroundColor: '#F3F6FA',
    borderRadius: 16,
    flexDirection: 'row',
    padding: 14,
  },
  outfitItemLead: {
    backgroundColor: '#EAF4FA',
  },
  itemImage: {
    borderRadius: 12,
    height: 58,
    width: 58,
  },
  itemCopy: {
    flex: 1,
    marginLeft: 7,
  },
  itemCategory: {
    color: '#6AA5C9',
    fontSize: 10,
    fontWeight: '800',
  },
  itemName: {
    color: '#18324B',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 3,
  },
  itemColor: {
    color: '#8293A5',
    fontSize: 11,
    marginTop: 4,
  },
  adviceCard: {
    backgroundColor: '#FFF8E8',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    padding: 16,
  },
  adviceIcon: {
    fontSize: 20,
  },
  adviceCopy: {
    flex: 1,
  },
  adviceTitle: {
    color: '#8C6716',
    fontSize: 13,
    fontWeight: '800',
  },
  adviceText: {
    color: '#715E35',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 4,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#234968',
    borderRadius: 16,
    marginTop: 22,
    paddingVertical: 15,
  },
  primaryButtonDisabled: {
    backgroundColor: '#B6C2CC',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#B8C6D1',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: '#53677B',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyWardrobe: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginTop: 20,
    padding: 28,
  },
  emptyWardrobeIcon: {
    fontSize: 48,
  },
  emptyWardrobeTitle: {
    color: '#18324B',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 13,
  },
  emptyWardrobeText: {
    color: '#8293A5',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 7,
    textAlign: 'center',
  },
  emptyWardrobeButton: {
    backgroundColor: '#234968',
    borderRadius: 14,
    marginTop: 17,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  emptyWardrobeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.72,
  },
});
