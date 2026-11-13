import { type ReactNode, useEffect, useState } from 'react';
import {
  AppState,
  type DimensionValue,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { cosmicTheme } from '../../theme/cosmicTheme';
import CosmicPlanet from './CosmicPlanet';

type CosmicBackgroundProps = {
  children: ReactNode;
  motionEnabled?: boolean;
  showPlanet?: boolean;
  galaxyBandOpacity?: number;
};

type StarConfig = {
  top: DimensionValue;
  left: DimensionValue;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
};

const STAR_CONFIGS: readonly StarConfig[] = [
  { top: '4%', left: '12%', size: 2, delay: 0, duration: 2400, opacity: 0.45 },
  { top: '8%', left: '72%', size: 3, delay: 700, duration: 3200, opacity: 0.52 },
  { top: '14%', left: '43%', size: 2, delay: 1100, duration: 2800, opacity: 0.38 },
  { top: '21%', left: '88%', size: 2, delay: 300, duration: 3600, opacity: 0.44 },
  { top: '28%', left: '20%', size: 3, delay: 1500, duration: 3000, opacity: 0.48 },
  { top: '35%', left: '62%', size: 2, delay: 900, duration: 2600, opacity: 0.4 },
  { top: '43%', left: '7%', size: 2, delay: 1800, duration: 3400, opacity: 0.5 },
  { top: '49%', left: '81%', size: 3, delay: 400, duration: 2900, opacity: 0.42 },
  { top: '58%', left: '35%', size: 2, delay: 1300, duration: 3700, opacity: 0.48 },
  { top: '66%', left: '92%', size: 2, delay: 2100, duration: 3100, opacity: 0.38 },
  { top: '72%', left: '15%', size: 3, delay: 600, duration: 3500, opacity: 0.46 },
  { top: '79%', left: '57%', size: 2, delay: 1700, duration: 2700, opacity: 0.44 },
  { top: '88%', left: '28%', size: 2, delay: 1000, duration: 3300, opacity: 0.4 },
  { top: '94%', left: '76%', size: 3, delay: 200, duration: 3000, opacity: 0.5 },
];

function TwinklingStar({
  config,
  shouldAnimate,
}: {
  config: StarConfig;
  shouldAnimate: boolean;
}) {
  const brightness = useSharedValue(config.opacity);

  useEffect(() => {
    cancelAnimation(brightness);

    if (!shouldAnimate) {
      brightness.value = config.opacity;
      return;
    }

    brightness.value = withDelay(
      config.delay,
      withRepeat(
        withTiming(1, {
          duration: config.duration,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      )
    );

    return () => cancelAnimation(brightness);
  }, [brightness, config, shouldAnimate]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: brightness.value,
    transform: [
      {
        scale: interpolate(
          brightness.value,
          [config.opacity, 1],
          [0.82, 1.18]
        ),
      },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.star,
        {
          height: config.size,
          left: config.left,
          top: config.top,
          width: config.size,
        },
        animatedStyle,
      ]}
    />
  );
}

export default function CosmicBackground({
  children,
  motionEnabled = true,
  showPlanet = true,
  galaxyBandOpacity = 1,
}: CosmicBackgroundProps) {
  const reduceMotion = useReducedMotion();
  const [isAppActive, setIsAppActive] = useState(
    () => AppState.currentState !== 'background' && AppState.currentState !== 'inactive'
  );
  const shouldAnimate = motionEnabled && isAppActive && !reduceMotion;
  const nebulaProgress = useSharedValue(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setIsAppActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    cancelAnimation(nebulaProgress);

    if (!shouldAnimate) {
      nebulaProgress.value = 0;
      return;
    }

    nebulaProgress.value = withRepeat(
      withTiming(1, {
        duration: cosmicTheme.motion.nebulaDuration,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    return () => cancelAnimation(nebulaProgress);
  }, [nebulaProgress, shouldAnimate]);

  const upperNebulaStyle = useAnimatedStyle(() => ({
    opacity: interpolate(nebulaProgress.value, [0, 1], [0.24, 0.42]),
    transform: [
      {
        translateX: interpolate(nebulaProgress.value, [0, 1], [-28, 30]),
      },
      {
        translateY: interpolate(nebulaProgress.value, [0, 1], [-12, 22]),
      },
      { scale: interpolate(nebulaProgress.value, [0, 1], [0.94, 1.08]) },
    ],
  }));

  const lowerNebulaStyle = useAnimatedStyle(() => ({
    opacity: interpolate(nebulaProgress.value, [0, 1], [0.3, 0.16]),
    transform: [
      {
        translateX: interpolate(nebulaProgress.value, [0, 1], [24, -22]),
      },
      {
        translateY: interpolate(nebulaProgress.value, [0, 1], [16, -18]),
      },
      { scale: interpolate(nebulaProgress.value, [0, 1], [1.06, 0.92]) },
    ],
  }));

  return (
    <View style={styles.container}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={styles.background}
      >
        <LinearGradient
          colors={cosmicTheme.gradients.space}
          end={{ x: 0.82, y: 1 }}
          locations={[0, 0.35, 0.7, 1]}
          start={{ x: 0.12, y: 0 }}
          style={StyleSheet.absoluteFill}
        />

        <Animated.Image
          accessible={false}
          fadeDuration={0}
          resizeMode="contain"
          source={require('../../assets/cosmic/nebula.png')}
          style={[styles.nebula, styles.upperNebula, upperNebulaStyle]}
        />
        <Animated.Image
          accessible={false}
          fadeDuration={0}
          resizeMode="contain"
          source={require('../../assets/cosmic/nebula.png')}
          style={[styles.nebula, styles.lowerNebula, lowerNebulaStyle]}
        />

        <LinearGradient
          colors={cosmicTheme.gradients.galaxy}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0.15 }}
          style={[styles.galaxyBand, { opacity: galaxyBandOpacity }]}
        />

        {showPlanet ? <CosmicPlanet motionEnabled={shouldAnimate} /> : null}

        {STAR_CONFIGS.map((config, index) => (
          <TwinklingStar
            config={config}
            key={`${String(config.top)}-${String(config.left)}-${index}`}
            shouldAnimate={shouldAnimate}
          />
        ))}
      </View>

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  content: {
    flex: 1,
  },
  nebula: {
    position: 'absolute',
  },
  upperNebula: {
    height: 580,
    right: -200,
    top: -110,
    width: 580,
  },
  lowerNebula: {
    bottom: -120,
    height: 540,
    left: -230,
    width: 540,
  },
  galaxyBand: {
    height: '38%',
    left: '-12%',
    position: 'absolute',
    top: '28%',
    transform: [{ rotate: '-11deg' }],
    width: '124%',
  },
  star: {
    backgroundColor: cosmicTheme.colors.starlight,
    borderRadius: 99,
    position: 'absolute',
  },
});
