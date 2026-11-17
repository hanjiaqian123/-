import { type ReactNode, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { cosmicTheme } from '../../theme/cosmicTheme';
import { getWeatherSceneId, SCENES, type WeatherSceneId, type WeatherSceneInput } from '../../theme/weatherScenes';
import CosmicBackground from '../cosmic/CosmicBackground';
import CloudLayer from './CloudLayer';
import WeatherParticles from './WeatherParticles';
import type { CloudWeatherInput } from './cloudModel';
import { createSkyTransition, SKY_TRANSITION_DURATION, skyTransitionReducer } from './weatherSkyTransition';

type WeatherBackgroundProps = {
  children: ReactNode;
  weather: (WeatherSceneInput & CloudWeatherInput) | null;
  motionEnabled?: boolean;
};

function WeatherSky({ scene, animate, weather }: {
  scene: WeatherSceneId;
  animate: boolean;
  weather: WeatherBackgroundProps['weather'];
}) {
  const [transition, dispatch] = useReducer(skyTransitionReducer, scene, createSkyTransition);
  const firstOpacity = useSharedValue(1);
  const secondOpacity = useSharedValue(0);
  const lightning = useSharedValue(0);
  const mounted = useRef(false);
  const { front, incoming, revision } = transition;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const finish = useCallback((completedRevision: number) => {
    if (mounted.current) dispatch({ type: 'finished', revision: completedRevision });
  }, []);

  useEffect(() => {
    dispatch({ type: 'request', scene, animate });
  }, [scene, animate]);

  useEffect(() => {
    cancelAnimation(firstOpacity);
    cancelAnimation(secondOpacity);
    if (!animate || incoming === null) {
      firstOpacity.value = front === 0 ? 1 : 0;
      secondOpacity.value = front === 1 ? 1 : 0;
    } else {
      const entering = incoming === 0 ? firstOpacity : secondOpacity;
      const leaving = incoming === 0 ? secondOpacity : firstOpacity;
      // Keep the old sky opaque underneath: fading both layers would expose black.
      entering.value = withTiming(1, {
        duration: SKY_TRANSITION_DURATION,
        easing: Easing.inOut(Easing.ease),
      }, (finished) => {
        if (finished) {
          // Hide the old slot on the UI thread BEFORE JS can recolor it.
          leaving.value = 0;
          scheduleOnRN(finish, revision);
        }
      });
    }
    return () => {
      cancelAnimation(firstOpacity);
      cancelAnimation(secondOpacity);
    };
  }, [animate, front, incoming, revision, firstOpacity, secondOpacity, finish]);

  const firstStyle = useAnimatedStyle(() => ({ opacity: firstOpacity.value }));
  const secondStyle = useAnimatedStyle(() => ({ opacity: secondOpacity.value }));
  const topSlot = incoming ?? front;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { zIndex: topSlot === 0 ? 1 : 0 }, firstStyle]}>
        <LinearGradient
          colors={SCENES[animate ? transition.scenes[0] : scene].skyGradient}
          locations={[0, 0.5, 1]}
          start={{ x: 0.12, y: 0 }} end={{ x: 0.82, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { zIndex: topSlot === 1 ? 1 : 0 }, secondStyle]}>
        <LinearGradient
          colors={SCENES[animate ? transition.scenes[1] : scene].skyGradient}
          locations={[0, 0.5, 1]}
          start={{ x: 0.12, y: 0 }} end={{ x: 0.82, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <CloudLayer scene={scene} animate={animate} isDay={weather?.is_day}
        lightning={animate && SCENES[scene].particles.lightning ? lightning : undefined}
        cloud_cover={weather?.cloud_cover} wind_speed_10m={weather?.wind_speed_10m}
        wind_direction_10m={weather?.wind_direction_10m} />
      {/* Preserve the cosmic depth and contrast of the existing light foreground text. */}
      <View style={[StyleSheet.absoluteFill, styles.cosmicShade]} />
      <WeatherParticles key={scene} scene={scene} animate={animate} lightning={lightning} />
    </View>
  );
}

/** Presentation only: reuse the existing cosmic decorations and actual weather snapshot. */
export default function WeatherBackground({ children, weather, motionEnabled = true }: WeatherBackgroundProps) {
  const initialReduceMotion = useReducedMotion();
  const [reduceMotion, setReduceMotion] = useState(initialReduceMotion);
  const [appActive, setAppActive] = useState(() => AppState.currentState === 'active');
  const scene = weather ? getWeatherSceneId(weather) : 'overcast';
  const animate = motionEnabled && appActive && !reduceMotion;

  useEffect(() => {
    let mounted = true;
    let preferenceChanged = false;
    const appSubscription = AppState.addEventListener('change', state => setAppActive(state === 'active'));
    const motionSubscription = AccessibilityInfo.addEventListener('reduceMotionChanged', enabled => {
      preferenceChanged = true;
      setReduceMotion(enabled);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted && !preferenceChanged) setReduceMotion(enabled);
    }).catch(() => { /* Keep Reanimated's initial system preference if the query fails. */ });
    return () => {
      mounted = false;
      appSubscription.remove();
      motionSubscription.remove();
    };
  }, []);

  return (
    <CosmicBackground motionEnabled={animate} sky={<WeatherSky scene={scene} animate={animate} weather={weather} />}>
      {children}
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  cosmicShade: {
    backgroundColor: cosmicTheme.colors.deepSpace,
    opacity: 0.68,
    zIndex: 3,
  },
});
