import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { CelestialBody, CelestialBodyId } from '../../data/celestialBodies';
import { cosmicTheme } from '../../theme/cosmicTheme';

const BODY_IMAGES = {
  sun: require('../../assets/cosmic/sun.png'),
  earth: require('../../assets/cosmic/earth.png'),
  moon: require('../../assets/cosmic/moon.png'),
};

type CelestialBodyVisualProps = {
  body: CelestialBody;
  size: number;
  motionEnabled: boolean;
  onPress: (id: CelestialBodyId) => void;
};

export function CelestialBodyImage({
  id,
  size,
}: {
  id: CelestialBodyId;
  size: number;
}) {
  return (
    <Image
      accessible={false}
      fadeDuration={0}
      resizeMode="contain"
      source={BODY_IMAGES[id]}
      style={{ width: size, height: size }}
    />
  );
}

export default function CelestialBodyVisual({
  body,
  size,
  motionEnabled,
  onPress,
}: CelestialBodyVisualProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(progress);
    if (!motionEnabled) {
      progress.value = 0;
      return;
    }
    progress.value = withRepeat(
      withTiming(1, {
        duration: cosmicTheme.motion.exploreDriftDuration + (body.id === 'moon' ? 3000 : 0),
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
    return () => cancelAnimation(progress);
  }, [body.id, motionEnabled, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -8]) },
      { rotate: `${interpolate(progress.value, [0, 1], [-3, 3])}deg` },
    ],
  }));

  return (
    <Pressable
      accessibilityLabel={`探索${body.name}，${body.category}`}
      accessibilityHint="打开天体资料与天气关联介绍"
      accessibilityRole="button"
      onPress={() => onPress(body.id)}
      style={({ pressed }) => [
        styles.bodyButton,
        { width: size + 20 },
        pressed && styles.pressed,
      ]}
    >
      <Animated.View pointerEvents="none" style={animatedStyle}>
        <CelestialBodyImage id={body.id} size={size} />
      </Animated.View>
      <View style={styles.label}>
        <Text style={styles.englishName}>{body.englishName}</Text>
        <Text style={styles.name}>{body.name} <Text style={styles.plus}>＋</Text></Text>
        <Text style={styles.subtitle}>{body.subtitle}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bodyButton: { alignItems: 'center', minHeight: 48, borderRadius: 18 },
  pressed: { opacity: 0.72 },
  label: { alignItems: 'center', gap: 5, paddingHorizontal: 3 },
  englishName: { color: cosmicTheme.colors.softStarlight, fontSize: 9, letterSpacing: 2.5 },
  name: { color: cosmicTheme.colors.textPrimary, fontSize: 19, fontWeight: '600' },
  plus: { color: cosmicTheme.colors.violetLight, fontSize: 13 },
  subtitle: { color: cosmicTheme.colors.textSecondary, fontSize: 10, lineHeight: 16 },
});
