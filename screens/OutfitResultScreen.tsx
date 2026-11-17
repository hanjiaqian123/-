import { useLayoutEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CosmicBackground from '../components/cosmic/CosmicBackground';
import { OutfitMetadata, OutfitPieces } from '../components/outfit/OutfitPresentation';
import WardrobeTrial from '../components/outfit/WardrobeTrial';
import type { ScreenProps } from '../navigation/types';
import { cosmicTheme } from '../theme/cosmicTheme';

export default function OutfitResultScreen({ navigation, route }: ScreenProps<'OutfitResult'>) {
  const { cityName, recommendation, weather, trialWeather, periodLabel } = route.params;
  const isFocused = useIsFocused();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: cosmicTheme.colors.deepSpace },
      headerTintColor: cosmicTheme.colors.textPrimary,
      statusBarStyle: 'light',
    });
  }, [navigation]);

  return (
    <CosmicBackground motionEnabled={isFocused}>
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.page}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>THE COSMIC EDIT</Text>
          <Text accessibilityRole="header" style={styles.title}>智能穿搭结果</Text>
          <Text style={styles.subtitle}>用真实衣物试搭，让下一次推荐更懂你的偏好。</Text>

          <WardrobeTrial cityName={cityName} weather={trialWeather === undefined ? weather : trialWeather}
            periodLabel={periodLabel ?? '当前天气'} onUpload={() => navigation.navigate('Upload')} />

          {recommendation ? (
            <View style={styles.advice}>
              <Text style={styles.eyebrow}>WEATHER ESSENTIALS</Text>
              <Text style={styles.sectionTitle}>天气搭配参考</Text>
              <OutfitMetadata recommendation={recommendation} />
              <Text style={styles.subtitle}>{recommendation.tip}</Text>
              <OutfitPieces recommendation={recommendation} />
            </View>
          ) : null}
          <Pressable accessibilityLabel="返回首页" accessibilityRole="button" onPress={() => navigation.popToTop()}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={styles.backText}>返回首页</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: 'transparent', flex: 1 },
  content: { padding: 20, paddingBottom: 36 },
  eyebrow: { color: cosmicTheme.colors.violetLight, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  title: { color: cosmicTheme.colors.textPrimary, fontSize: 25, fontWeight: '800', marginTop: 8, lineHeight: 35 },
  subtitle: { color: cosmicTheme.colors.textSecondary, fontSize: 13, lineHeight: 22, marginTop: 10 },
  advice: { backgroundColor: cosmicTheme.colors.outfitPanel, borderColor: cosmicTheme.colors.cardBorder, borderWidth: 1, borderRadius: 20, marginTop: 28, padding: 18 },
  sectionTitle: { color: cosmicTheme.colors.textPrimary, fontSize: 18, fontWeight: '700', marginVertical: 12 },
  back: { alignItems: 'center', borderColor: cosmicTheme.colors.cardBorder, borderRadius: 16, borderWidth: 1, marginTop: 24, paddingVertical: 14, minHeight: 48 },
  backText: { color: cosmicTheme.colors.textSecondary, fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.8 },
});
