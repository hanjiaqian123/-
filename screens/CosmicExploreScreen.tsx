import { useCallback, useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { AccessibilityInfo, AppState, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';

import CelestialBodyVisual from '../components/cosmic/CelestialBodyVisual';
import CelestialInfoPanel from '../components/cosmic/CelestialInfoPanel';
import CosmicBackground from '../components/cosmic/CosmicBackground';
import { CELESTIAL_BODIES, type CelestialBodyId } from '../data/celestialBodies';
import type { ScreenProps } from '../navigation/types';
import { cosmicTheme } from '../theme/cosmicTheme';

export default function CosmicExploreScreen({ navigation }: ScreenProps<'CosmicExplore'>) {
  const { width, fontScale } = useWindowDimensions();
  const isFocused = useIsFocused();
  const initialReduceMotion = useReducedMotion();
  const [reduceMotion, setReduceMotion] = useState(initialReduceMotion);
  const [appActive, setAppActive] = useState(() => AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const [selectedId, setSelectedId] = useState<CelestialBodyId | null>(null);
  const selectedBody = CELESTIAL_BODIES.find((body) => body.id === selectedId);
  const motionEnabled = isFocused && appActive && !reduceMotion && !selectedBody;
  const stageWidth = Math.min(width - 40, 560);
  const scale = Math.min(stageWidth / 350, 1.3);
  const stageHeight = Math.max(410, 470 * scale) * Math.max(1, fontScale);
  const dismissPanel = useCallback(() => setSelectedId(null), []);

  useEffect(() => {
    let active = true;
    let preferenceChanged = false;
    const appSubscription = AppState.addEventListener('change', (state) => setAppActive(state === 'active'));
    const motionSubscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      preferenceChanged = true;
      setReduceMotion(enabled);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active && !preferenceChanged) setReduceMotion(enabled);
    }).catch(() => { /* Keep the Reanimated system preference if the query fails. */ });
    return () => {
      active = false;
      appSubscription.remove();
      motionSubscription.remove();
    };
  }, []);

  function returnToWeather() {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Home');
  }

  return (
    <CosmicBackground motionEnabled={motionEnabled} showPlanet={false} galaxyBandOpacity={0.25}>
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.page} accessibilityElementsHidden={!!selectedBody} importantForAccessibility={selectedBody ? 'no-hide-descendants' : 'auto'}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>BEYOND THE EVERYDAY</Text>
            <Text accessibilityRole="header" style={styles.title}>从今天的天气，{ '\n' }出发去看宇宙。</Text>
            <Text style={styles.subtitle}>三颗熟悉的天体，一场离日常很近的探索。</Text>
          </View>
          <View style={styles.observationLine}>
            <Text style={styles.observationText}>近邻星域 / LOCAL SPACE</Text>
            <Text style={styles.observationText}>03 CELESTIAL BODIES</Text>
          </View>
          <View style={[styles.stage, { width: stageWidth, height: stageHeight }]}>
            <View pointerEvents="none" accessible={false} style={[styles.orbit, { width: stageWidth * 1.18, height: stageHeight * 0.48, top: stageHeight * 0.25, left: -stageWidth * 0.08, transform: [{ rotate: '-34deg' }] }]} />
            <View pointerEvents="none" accessible={false} style={[styles.orbit, styles.innerOrbit, { width: stageWidth * 0.86, height: stageHeight * 0.36, top: stageHeight * 0.45, left: stageWidth * 0.03, transform: [{ rotate: '28deg' }] }]} />
            <Text accessible={false} style={[styles.coordinate, { right: 12, top: 42 }]}>✦</Text>
            <Text accessible={false} style={[styles.coordinate, { left: 6, top: stageHeight * 0.55 }]}>＋</Text>
            <View style={styles.sunPosition}>
              <CelestialBodyVisual body={CELESTIAL_BODIES[0]} size={144 * scale} motionEnabled={motionEnabled} onPress={setSelectedId} />
            </View>
            <View style={[styles.earthPosition, { top: stageHeight * 0.28 }]}>
              <CelestialBodyVisual body={CELESTIAL_BODIES[1]} size={168 * scale} motionEnabled={motionEnabled} onPress={setSelectedId} />
            </View>
            <View style={[styles.moonPosition, { left: stageWidth * 0.1, top: stageHeight * 0.62 }]}>
              <CelestialBodyVisual body={CELESTIAL_BODIES[2]} size={100 * scale} motionEnabled={motionEnabled} onPress={setSelectedId} />
            </View>
          </View>
          <Text style={styles.touchHint}>轻触天体，打开它的宇宙档案</Text>
          <LinearGradient colors={cosmicTheme.gradients.exploreConnection} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.weatherConnection}>
            <Text style={styles.connectionEyebrow}>OUR LITTLE BLUE HOME</Text>
            <Text style={styles.connectionTitle}>探索星空，也照顾今天的自己。</Text>
            <Text style={styles.connectionText}>太阳带来能量，大气酝酿云雨。宇宙很远，而适合今天的穿搭，就从脚下的天气开始。</Text>
            <Pressable accessibilityLabel="返回今日天气" accessibilityRole="button" onPress={returnToWeather} style={({ pressed }) => [styles.returnButton, pressed && styles.pressed]}>
              <Text style={styles.returnText}>回到今日天气</Text><Text style={styles.returnText}>↗</Text>
            </Pressable>
          </LinearGradient>
          <Text style={styles.note}>本地天文档案 · 无需联网{ '\n' }天体与轨道为艺术示意，尺寸、距离及地表纹理不代表真实观测。</Text>
        </ScrollView>
      </SafeAreaView>
      {selectedBody ? <CelestialInfoPanel body={selectedBody} reduceMotion={reduceMotion} onSelect={setSelectedId} onDismiss={dismissPanel} /> : null}
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 22, paddingBottom: 20 },
  heading: { marginBottom: 28 },
  eyebrow: { color: cosmicTheme.colors.violetLight, fontSize: 9, letterSpacing: 2.5, marginBottom: 15 },
  title: { color: cosmicTheme.colors.textPrimary, fontSize: 31, lineHeight: 45, fontWeight: '500', letterSpacing: 1 },
  subtitle: { color: cosmicTheme.colors.textSecondary, fontSize: 12, lineHeight: 22, marginTop: 12 },
  observationLine: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', borderTopColor: cosmicTheme.colors.cardDivider, borderTopWidth: 1, paddingTop: 15, marginBottom: 5 },
  observationText: { color: cosmicTheme.colors.softStarlight, fontSize: 8, letterSpacing: 1.3 },
  stage: { alignSelf: 'center', position: 'relative', overflow: 'hidden' },
  orbit: { position: 'absolute', borderColor: cosmicTheme.colors.orbitLine, borderRadius: 999, borderWidth: 1 },
  innerOrbit: { borderColor: cosmicTheme.colors.cardDivider },
  coordinate: { position: 'absolute', color: cosmicTheme.colors.violetLight, fontSize: 19, opacity: 0.5 },
  sunPosition: { position: 'absolute', left: 0, top: 0 },
  earthPosition: { position: 'absolute', right: 0 },
  moonPosition: { position: 'absolute' },
  touchHint: { color: cosmicTheme.colors.softStarlight, fontSize: 11, textAlign: 'center', letterSpacing: 1, lineHeight: 20, marginBottom: 28 },
  weatherConnection: { borderColor: cosmicTheme.colors.cardBorder, borderWidth: 1, borderRadius: 22, padding: 20 },
  connectionEyebrow: { color: cosmicTheme.colors.violetLight, fontSize: 9, letterSpacing: 1.8 },
  connectionTitle: { color: cosmicTheme.colors.textPrimary, fontSize: 18, lineHeight: 28, fontWeight: '600', marginTop: 12 },
  connectionText: { color: cosmicTheme.colors.textSecondary, fontSize: 12, lineHeight: 23, marginTop: 10 },
  returnButton: { marginTop: 18, minHeight: 48, borderTopColor: cosmicTheme.colors.cardDivider, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 },
  returnText: { color: cosmicTheme.colors.softStarlight, fontSize: 12, fontWeight: '600' },
  pressed: { opacity: 0.7 },
  note: { color: cosmicTheme.colors.textSecondary, textAlign: 'center', fontSize: 9, lineHeight: 18, marginTop: 24 },
});
