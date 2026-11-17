import { memo, useEffect, useMemo, useState } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { SCENES, type WeatherSceneId } from '../../theme/weatherScenes';
import {
  createWeatherParticles, getLightningPulse, getParticlePosition, LIGHTNING_SCREEN_OPACITY,
  particleFrameSeconds, type WeatherParticle,
} from './weatherParticleModel';

type WeatherParticlesProps = {
  scene: WeatherSceneId;
  /** Parent combines focus, AppState and live reduced-motion preference. */
  animate: boolean;
  lightning: SharedValue<number>;
};

const Particle = memo(function Particle({ particle, width, height, color, time }: {
  particle: WeatherParticle; width: number; height: number; color: string; time: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const position = getParticlePosition(particle, time.value, width, height);
    return { transform: [{ translateX: position.x }, { translateY: position.y }] };
  });
  return (
    <Animated.View style={[styles.particle, {
      left: -particle.width / 2, top: -particle.height / 2,
      width: particle.width, height: particle.height, opacity: particle.opacity,
      backgroundColor: particle.kind === 'fog' ? 'transparent' : color,
      borderRadius: particle.kind === 'rain' ? 1 : '50%',
      overflow: 'hidden',
    }, animatedStyle]}>
      {particle.kind === 'fog' ? <LinearGradient
        colors={[`${color}00`, color, `${color}00`]} locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill}
      /> : null}
    </Animated.View>
  );
});

/** One scene owns one bounded field and one UI clock; keyed replacement disposes the old field. */
export default function WeatherParticles({ scene, animate, lightning }: WeatherParticlesProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const density = PixelRatio.get();
  const particles = useMemo(() => createWeatherParticles(scene, size.width, size.height, density),
    [scene, size.width, size.height, density]);
  const config = SCENES[scene].particles;
  const time = useSharedValue(0);
  const lightningTime = useSharedValue(0);
  const hasLightning = config.lightning;
  const frame = useFrameCallback(info => {
    const dt = particleFrameSeconds(info.timeSincePreviousFrame);
    time.value += dt;
    lightningTime.value += dt;
    lightning.set(hasLightning ? getLightningPulse(lightningTime.value) : 0);
  }, false);

  useEffect(() => {
    lightning.set(0);
    lightningTime.set(0); // Resume with a quiet interval, never replay a paused flash.
    frame.setActive(animate && particles.length > 0);
    return () => {
      frame.setActive(false);
      lightning.set(0);
    };
  }, [animate, frame, particles.length, lightning, lightningTime]);

  const flashStyle = useAnimatedStyle(() => ({
    // Explicit gating clears a flash even if JS pauses during the pulse.
    opacity: animate && hasLightning ? lightning.value * LIGHTNING_SCREEN_OPACITY : 0,
  }));

  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={styles.container} onLayout={({ nativeEvent: { layout } }) => {
        setSize(previous => previous.width === layout.width && previous.height === layout.height
          ? previous : { width: layout.width, height: layout.height });
      }}>
      {particles.map(particle => <Particle key={particle.id} particle={particle}
        width={size.width} height={size.height} color={config.color} time={time} />)}
      {hasLightning ? <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: config.color }, flashStyle]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFill, overflow: 'hidden', zIndex: 4 },
  particle: { position: 'absolute' },
});
