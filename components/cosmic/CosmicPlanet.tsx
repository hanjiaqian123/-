import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { cosmicTheme } from '../../theme/cosmicTheme';

type CosmicPlanetProps = {
  motionEnabled?: boolean;
};

/**
 * The locally rendered planet includes lighting, ring occlusion and atmosphere.
 * Only the texture's opacity and transform animate; no WebGL context, network
 * request or per-frame React render is needed on the device.
 */
export default function CosmicPlanet({
  motionEnabled = true,
}: CosmicPlanetProps) {
  const reduceMotion = useReducedMotion();
  const shouldAnimate = motionEnabled && !reduceMotion;
  const progress = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(progress);

    if (!shouldAnimate) {
      progress.value = 0;
      return;
    }

    progress.value = withRepeat(
      withTiming(1, {
        duration: cosmicTheme.motion.planetDuration,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    return () => cancelAnimation(progress);
  }, [progress, shouldAnimate]);

  const planetStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.75, 0.9]),
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [-12, 16]),
      },
      {
        translateY: interpolate(progress.value, [0, 1], [7, -9]),
      },
      { scale: interpolate(progress.value, [0, 1], [0.97, 1.02]) },
      { rotate: `${interpolate(progress.value, [0, 1], [-2, 2])}deg` },
    ],
  }));

  return (
    <Animated.Image
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      accessible={false}
      fadeDuration={0}
      resizeMode="contain"
      source={require('../../assets/cosmic/planet.png')}
      style={[styles.system, planetStyle]}
    />
  );
}

const styles = StyleSheet.create({
  system: {
    height: 300,
    position: 'absolute',
    right: -110,
    top: -62,
    width: 360,
  },
});
