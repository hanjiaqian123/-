import { useLayoutEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import CosmicBackground from '../components/cosmic/CosmicBackground';
import {
  OutfitMetadata,
  OutfitPieces,
} from '../components/outfit/OutfitPresentation';
import OutfitReveal from '../components/outfit/OutfitReveal';
import { getWeatherDisplay } from '../components/weather/WeatherCard';
import { useWardrobe } from '../context/WardrobeContext';
import type { ScreenProps } from '../navigation/types';
import { cosmicTheme } from '../theme/cosmicTheme';
import type { WardrobeItem } from '../types/models';

function WardrobeOutfitItem({
  item,
  index,
}: {
  item: WardrobeItem;
  index: number;
}) {
  const [hasImageError, setHasImageError] = useState(false);
  const isLead = index === 0;

  return (
    <View style={[styles.outfitItem, isLead && styles.outfitItemLead]}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemNumber}>0{index + 1}</Text>
        <Text style={styles.itemCategory}>{item.category}</Text>
      </View>
      {hasImageError ? (
        <View style={[styles.missingImage, isLead && styles.leadImage]}>
          <Text style={styles.missingImageText}>图片暂不可用</Text>
        </View>
      ) : (
        <Image
          accessibilityLabel={`${item.name}照片`}
          onError={() => setHasImageError(true)}
          resizeMode="contain"
          source={{ uri: item.imageUri }}
          style={[styles.itemImage, isLead && styles.leadImage]}
        />
      )}
      <View style={styles.itemCopy}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemColor}>{item.color}</Text>
      </View>
    </View>
  );
}

export default function OutfitResultScreen({
  navigation,
  route,
}: ScreenProps<'OutfitResult'>) {
  const { items } = useWardrobe();
  const [variant, setVariant] = useState(0);
  const { cityName, recommendation, weather } = route.params;
  const isFocused = useIsFocused();
  const weatherDisplay = weather ? getWeatherDisplay(weather) : null;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: cosmicTheme.colors.deepSpace },
      headerTintColor: cosmicTheme.colors.textPrimary,
      statusBarStyle: 'light',
    });
  }, [navigation]);

  const selectedItems = items
    .map((_, index) => items[(index + variant) % items.length])
    .slice(0, 3);

  function showNextCombination() {
    if (items.length > 1) {
      setVariant((current) => (current + 1) % items.length);
    }
  }

  return (
    <CosmicBackground motionEnabled={isFocused}>
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.page}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          style={styles.page}
        >
          <OutfitReveal motionEnabled={isFocused}>
            <View style={styles.headingRow}>
              <View style={styles.headingCopy}>
                <Text style={styles.eyebrow}>THE COSMIC EDIT</Text>
                <Text style={styles.title}>
                  {recommendation?.title ?? '日常轻松搭配'}
                </Text>
              </View>
              <View style={styles.matchBadge}>
                <Text style={styles.matchValue}>92%</Text>
                <Text style={styles.matchLabel}>示例匹配</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>
              结合首页天气建议与本机衣橱，为今天探索一组穿搭灵感。
            </Text>
            <OutfitMetadata recommendation={recommendation} />

            <LinearGradient
              colors={cosmicTheme.gradients.outfitSecondary}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={styles.weatherBanner}
            >
              <View style={styles.weatherLocation}>
                <Text style={styles.weatherLabel}>{cityName} · 当前天气</Text>
                <Text style={styles.weatherValue}>
                  {weather ? `${Math.round(weather.temperature_2m)}°` : '--°'}
                </Text>
                <Text style={styles.weatherMetaText}>
                  {weatherDisplay
                    ? `${weatherDisplay.icon} ${weatherDisplay.text}`
                    : '暂无天气数据'}
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
            </LinearGradient>
          </OutfitReveal>

          <View style={styles.sectionHeading}>
            <View style={styles.headingCopy}>
              <Text style={styles.eyebrow}>FROM YOUR WARDROBE</Text>
              <Text style={styles.sectionTitle}>衣橱示例组合</Text>
            </View>
            <Text style={styles.countBadge}>{selectedItems.length} 件单品</Text>
          </View>

          {selectedItems.length > 0 ? (
            <OutfitReveal
              motionEnabled={isFocused}
              replayKey={variant}
              style={styles.outfitCanvas}
            >
              {selectedItems.map((item, index) => (
                <WardrobeOutfitItem
                  index={index}
                  item={item}
                  key={`${item.id}-${item.imageUri}-${index}`}
                />
              ))}
            </OutfitReveal>
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
                <Text style={styles.primaryButtonText}>添加衣服</Text>
              </Pressable>
            </View>
          )}

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
          {items.length < 2 ? (
            <Text style={styles.buttonHint}>添加至少两件单品，即可切换组合</Text>
          ) : null}

          <View style={styles.adviceCard}>
            <Text style={styles.eyebrow}>WHY THIS LOOK</Text>
            <Text style={styles.adviceTitle}>搭配理由 · 天气适配</Text>
            <Text style={styles.adviceText}>
              {recommendation?.tip ??
                '天气暂未加载完成，当前先展示衣橱中的日常组合。'}
            </Text>
          </View>

          {recommendation ? (
            <View style={styles.recommendedPieces}>
              <Text style={styles.eyebrow}>WEATHER ESSENTIALS</Text>
              <Text style={styles.sectionTitle}>天气推荐单品</Text>
              <OutfitPieces recommendation={recommendation} />
            </View>
          ) : null}

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
      </SafeAreaView>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  weatherBanner: {
    alignItems: 'center',
    borderColor: cosmicTheme.colors.cardBorder,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    justifyContent: 'space-between',
    marginTop: 22,
    padding: 20,
  },
  weatherLocation: {
    flex: 1,
    minWidth: 110,
  },
  weatherLabel: {
    color: cosmicTheme.colors.textSecondary,
    fontSize: 12,
  },
  weatherValue: {
    color: cosmicTheme.colors.textPrimary,
    fontSize: 42,
    fontWeight: '300',
    marginTop: 4,
  },
  weatherMeta: {
    alignItems: 'flex-end',
    gap: 7,
  },
  weatherMetaText: {
    color: cosmicTheme.colors.softStarlight,
    fontSize: 12,
  },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  headingCopy: {
    flex: 1,
  },
  eyebrow: {
    color: cosmicTheme.colors.violetLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    color: cosmicTheme.colors.textPrimary,
    fontSize: 25,
    fontWeight: '800',
    marginTop: 7,
    lineHeight: 35,
  },
  matchBadge: {
    alignItems: 'center',
    backgroundColor: cosmicTheme.colors.outfitAccent,
    borderColor: cosmicTheme.colors.cardBorder,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  matchValue: {
    color: cosmicTheme.colors.textPrimary,
    fontSize: 21,
    fontWeight: '900',
  },
  matchLabel: {
    color: cosmicTheme.colors.violetLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  subtitle: {
    color: cosmicTheme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
  },
  outfitCanvas: {
    alignItems: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  outfitItem: {
    backgroundColor: cosmicTheme.colors.outfitPanel,
    borderColor: cosmicTheme.colors.cardBorder,
    borderRadius: 20,
    borderWidth: 1,
    flexBasis: '46%',
    flexGrow: 1,
    minWidth: 0,
    overflow: 'hidden',
    padding: 12,
  },
  outfitItemLead: {
    flexBasis: '100%',
  },
  itemHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  itemNumber: {
    color: cosmicTheme.colors.softStarlight,
    fontSize: 10,
    letterSpacing: 2,
  },
  itemImage: {
    backgroundColor: cosmicTheme.colors.outfitSurface,
    borderRadius: 12,
    height: 150,
    width: '100%',
  },
  leadImage: {
    height: 230,
  },
  missingImage: {
    alignItems: 'center',
    backgroundColor: cosmicTheme.colors.outfitSurface,
    borderRadius: 12,
    height: 150,
    justifyContent: 'center',
    width: '100%',
  },
  missingImageText: {
    color: cosmicTheme.colors.textSecondary,
    fontSize: 12,
  },
  itemCopy: {
    marginTop: 12,
    paddingBottom: 4,
  },
  itemCategory: {
    color: cosmicTheme.colors.violetLight,
    fontSize: 10,
    fontWeight: '800',
  },
  itemName: {
    color: cosmicTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 3,
    lineHeight: 22,
  },
  itemColor: {
    color: cosmicTheme.colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  adviceCard: {
    backgroundColor: cosmicTheme.colors.outfitPanel,
    borderColor: cosmicTheme.colors.cardBorder,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 24,
    padding: 20,
  },
  adviceTitle: {
    color: cosmicTheme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 10,
  },
  adviceText: {
    color: cosmicTheme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 23,
    marginTop: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: cosmicTheme.colors.outfitButton,
    borderRadius: 16,
    marginTop: 22,
    paddingVertical: 15,
    minHeight: 48,
  },
  primaryButtonDisabled: {
    backgroundColor: cosmicTheme.colors.outfitDisabled,
  },
  primaryButtonText: {
    color: cosmicTheme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: cosmicTheme.colors.cardBorder,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 24,
    paddingVertical: 14,
    minHeight: 48,
  },
  secondaryButtonText: {
    color: cosmicTheme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyWardrobe: {
    alignItems: 'center',
    backgroundColor: cosmicTheme.colors.outfitPanel,
    borderColor: cosmicTheme.colors.cardBorder,
    borderWidth: 1,
    borderRadius: 22,
    marginTop: 14,
    padding: 28,
  },
  emptyWardrobeIcon: {
    fontSize: 48,
  },
  emptyWardrobeTitle: {
    color: cosmicTheme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 13,
  },
  emptyWardrobeText: {
    color: cosmicTheme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 7,
    textAlign: 'center',
  },
  emptyWardrobeButton: {
    backgroundColor: cosmicTheme.colors.outfitButton,
    borderRadius: 14,
    marginTop: 17,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 28,
  },
  sectionTitle: {
    color: cosmicTheme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  countBadge: {
    color: cosmicTheme.colors.softStarlight,
    fontSize: 11,
  },
  buttonHint: {
    color: cosmicTheme.colors.textSecondary,
    fontSize: 11,
    marginTop: 9,
    textAlign: 'center',
  },
  recommendedPieces: {
    backgroundColor: cosmicTheme.colors.outfitPanel,
    borderColor: cosmicTheme.colors.cardDivider,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 16,
    padding: 20,
  },
});
