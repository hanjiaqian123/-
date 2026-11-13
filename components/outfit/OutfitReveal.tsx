import { type ReactNode, useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { cosmicTheme } from '../../theme/cosmicTheme';

type OutfitRevealProps = {
  children: ReactNode;
  replayKey?: string | number;
  motionEnabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

// A finite opacity/transform transition shared by cards and the outfit canvas.
// Replaying it keeps the existing component and scroll position intact.
export default function OutfitReveal({
  children,
  replayKey = 'initial',
  motionEnabled = true,
  style,
}: OutfitRevealProps) {
  const reduceMotion = useReducedMotion();
  const shouldAnimate = motionEnabled && !reduceMotion;
  const progress = useSharedValue(shouldAnimate ? 0 : 1);

  useEffect(() => {
    cancelAnimation(progress);
    progress.value = shouldAnimate ? 0 : 1;

    if (shouldAnimate) {
      progress.value = withTiming(1, {
        duration: cosmicTheme.motion.outfitRevealDuration,
        easing: Easing.out(Easing.cubic),
      });
    }

    return () => cancelAnimation(progress);
  }, [progress, replayKey, shouldAnimate]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + progress.value * 0.5,
    transform: [{ translateY: (1 - progress.value) * 10 }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
}
