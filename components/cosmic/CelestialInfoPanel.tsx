import { useCallback, useEffect, useRef } from 'react';
import { Modal, Pressable, ScrollView, type ScrollViewInstance, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { CELESTIAL_BODIES, type CelestialBody, type CelestialBodyId } from '../../data/celestialBodies';
import { cosmicTheme } from '../../theme/cosmicTheme';
import { CelestialBodyImage } from './CelestialBodyVisual';

type CelestialInfoPanelProps = {
  body: CelestialBody;
  reduceMotion: boolean;
  onSelect: (id: CelestialBodyId) => void;
  onDismiss: () => void;
};

export default function CelestialInfoPanel({
  body,
  reduceMotion,
  onSelect,
  onDismiss,
}: CelestialInfoPanelProps) {
  const { height } = useWindowDimensions();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const closing = useRef(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const index = CELESTIAL_BODIES.findIndex((entry) => entry.id === body.id);

  useEffect(() => {
    const isClosing = closing.current;
    progress.set(withTiming(isClosing ? 0 : 1, {
      duration: reduceMotion ? 0 : cosmicTheme.motion.explorePanelDuration,
      easing: Easing.out(Easing.cubic),
    }, (finished) => {
      if (finished && isClosing) scheduleOnRN(onDismiss);
    }));
    return () => cancelAnimation(progress);
  }, [onDismiss, progress, reduceMotion]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [body.id]);

  const requestClose = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    cancelAnimation(progress);
    if (reduceMotion) {
      onDismiss();
      return;
    }
    progress.set(withTiming(0, {
      duration: cosmicTheme.motion.explorePanelDuration,
      easing: Easing.in(Easing.cubic),
    }, (finished) => {
      if (finished) scheduleOnRN(onDismiss);
    }));
  }, [onDismiss, progress, reduceMotion]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const panelStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 56 }],
  }));

  function selectAdjacent(offset: number) {
    const next = CELESTIAL_BODIES[index + offset];
    if (next && !closing.current) onSelect(next.id);
  }

  return (
    <Modal transparent animationType="none" visible onRequestClose={requestClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View pointerEvents="none" style={[styles.backdrop, backdropStyle]} />
        <Pressable accessibilityLabel="关闭天体信息" accessibilityRole="button" onPress={requestClose} style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.panel, { maxHeight: height * 0.9 }, panelStyle]}>
          <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.panelSafeArea}>
            <View style={styles.panelHeader}>
              <Text style={styles.eyebrow}>CELESTIAL ARCHIVE / 0{index + 1}</Text>
              <Pressable accessibilityLabel="关闭资料面板" accessibilityRole="button" onPress={requestClose} style={styles.closeButton}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
            <ScrollView ref={scrollRef} style={{ maxHeight: height * 0.64 }} contentContainerStyle={styles.panelContent}>
              <View style={styles.titleRow}>
                <View style={styles.titleCopy}>
                  <Text accessibilityRole="header" style={styles.title}>{body.name}</Text>
                  <Text style={styles.category}>{body.englishName} · {body.category}</Text>
                  <Text style={styles.subtitle}>{body.subtitle}</Text>
                </View>
                <CelestialBodyImage id={body.id} size={96} />
              </View>
              <Text style={styles.introduction}>{body.introduction}</Text>
              <View style={styles.facts}>
                {body.facts.map((fact) => (
                  <View key={fact.label} style={styles.fact}>
                    <Text style={styles.factLabel}>{fact.label}</Text>
                    <Text style={styles.factValue}>{fact.value}</Text>
                  </View>
                ))}
              </View>
              <LinearGradient colors={cosmicTheme.gradients.exploreConnection} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.connection}>
                <Text style={styles.connectionTitle}>✦ 与今天的天气有什么关系？</Text>
                <Text style={styles.connectionText}>{body.weatherConnection}</Text>
              </LinearGradient>
              <Text style={styles.source}>资料：{body.source}</Text>
            </ScrollView>
            <View style={styles.switcher}>
              <Pressable accessibilityLabel="查看上一个天体" accessibilityRole="button" disabled={index === 0} onPress={() => selectAdjacent(-1)} style={[styles.switchButton, index === 0 && styles.disabled]}>
                <Text style={styles.switchText}>← 上一个</Text>
              </Pressable>
              <Text style={styles.counter}>{index + 1} / {CELESTIAL_BODIES.length}</Text>
              <Pressable accessibilityLabel="查看下一个天体" accessibilityRole="button" disabled={index === CELESTIAL_BODIES.length - 1} onPress={() => selectAdjacent(1)} style={[styles.switchButton, index === CELESTIAL_BODIES.length - 1 && styles.disabled]}>
                <Text style={styles.switchText}>下一个 →</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(1, 4, 15, 0.78)' },
  panel: { width: '100%', maxWidth: 620, backgroundColor: cosmicTheme.colors.explorePanel, borderColor: cosmicTheme.colors.cardBorder, borderWidth: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  panelSafeArea: { flexShrink: 1 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 24, paddingRight: 10, paddingTop: 8, gap: 8 },
  eyebrow: { color: cosmicTheme.colors.violetLight, fontSize: 9, letterSpacing: 1.6, flexShrink: 1 },
  closeButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: cosmicTheme.colors.softStarlight, fontSize: 30 },
  panelContent: { paddingHorizontal: 24, paddingBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleCopy: { flex: 1 },
  title: { color: cosmicTheme.colors.textPrimary, fontSize: 32, fontWeight: '600' },
  category: { color: cosmicTheme.colors.softStarlight, fontSize: 10, letterSpacing: 2, marginTop: 7 },
  subtitle: { color: cosmicTheme.colors.violetLight, fontSize: 12, marginTop: 12, lineHeight: 20 },
  introduction: { color: cosmicTheme.colors.textSecondary, fontSize: 13, lineHeight: 24, marginTop: 16 },
  facts: { marginTop: 20, borderTopColor: cosmicTheme.colors.cardDivider, borderTopWidth: 1 },
  fact: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, paddingVertical: 13, borderBottomColor: cosmicTheme.colors.cardDivider, borderBottomWidth: 1 },
  factLabel: { color: cosmicTheme.colors.textSecondary, fontSize: 12, lineHeight: 20 },
  factValue: { color: cosmicTheme.colors.textPrimary, fontSize: 14, lineHeight: 22, fontWeight: '600', flexShrink: 1 },
  connection: { borderColor: cosmicTheme.colors.cardDivider, borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 22 },
  connectionTitle: { color: cosmicTheme.colors.violetLight, fontSize: 12, fontWeight: '600', lineHeight: 21 },
  connectionText: { color: cosmicTheme.colors.textSecondary, fontSize: 12, lineHeight: 23, marginTop: 8 },
  source: { color: cosmicTheme.colors.textSecondary, fontSize: 10, lineHeight: 18, marginTop: 17 },
  switcher: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopColor: cosmicTheme.colors.cardDivider, borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  switchButton: { paddingHorizontal: 12, minHeight: 48, justifyContent: 'center', borderRadius: 12, backgroundColor: cosmicTheme.colors.outfitAccent },
  switchText: { color: cosmicTheme.colors.softStarlight, fontSize: 12 },
  counter: { color: cosmicTheme.colors.violetLight, fontSize: 11 },
  disabled: { opacity: 0.35 },
});
