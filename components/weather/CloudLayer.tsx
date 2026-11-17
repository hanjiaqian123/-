import { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation, useAnimatedStyle, useFrameCallback, useSharedValue, withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { WeatherSceneId } from '../../theme/weatherScenes';
import {
  CLOUD_DEPTHS, cloudFrameSeconds, createCloudShapes, getCloudAppearance, getCloudCoverage,
  getCloudPalette, getCloudWind, wrapCloudPosition, type CloudShape, type CloudWeatherInput,
} from './cloudModel';

type CloudLayerProps = CloudWeatherInput & {
  scene: WeatherSceneId;
  isDay?: number;
  /** Parent combines page focus, AppState and the live reduced-motion preference. */
  animate: boolean;
  lightning?: SharedValue<number>;
};

type CloudProps = {
  shape: CloudShape;
  viewportWidth: number;
  viewportHeight: number;
  coverage: number;
  animate: boolean;
  travelX: SharedValue<number>;
  travelY: SharedValue<number>;
  time: SharedValue<number>;
  main: SharedValue<string>;
  highlight: SharedValue<string>;
  shadow: SharedValue<string>;
  lightning?: SharedValue<number>;
};

const Cloud = memo(function Cloud({ shape, viewportWidth, viewportHeight, coverage, animate,
  travelX, travelY, time, main, highlight, shadow, lightning }: CloudProps) {
  const appearance = getCloudAppearance(coverage, shape.depth, shape.slot);
  const opacity = useSharedValue(animate ? 0 : appearance.opacity);
  const scale = useSharedValue(appearance.scale);
  const { width, height, x, y, phase, tempo } = shape;
  const speed = CLOUD_DEPTHS[shape.depth].speed;

  useEffect(() => {
    cancelAnimation(opacity);
    cancelAnimation(scale);
    opacity.value = animate ? withTiming(appearance.opacity, { duration: 800 }) : appearance.opacity;
    scale.value = animate ? withTiming(appearance.scale, { duration: 800 }) : appearance.scale;
    return () => { cancelAnimation(opacity); cancelAnimation(scale); };
  }, [animate, appearance.opacity, appearance.scale, opacity, scale]);

  const cloudStyle = useAnimatedStyle(() => {
    const wave = time.value * tempo + phase;
    return {
      opacity: opacity.value,
      transform: [
        // Padding exceeds the max 1.25x coverage scale + breathing + vertical bob.
        { translateX: wrapCloudPosition(x + travelX.value * speed, viewportWidth, width * 0.72 + 8) },
        { translateY: wrapCloudPosition(y + travelY.value * speed, viewportHeight, height * 0.72 + 8)
          + Math.sin(wave) * 3 },
        { scaleX: scale.value * (1 + Math.sin(wave) * 0.018) },
        { scaleY: scale.value * (1 + Math.cos(wave * 0.83) * 0.025) },
      ],
    };
  });
  const mainStyle = useAnimatedStyle(() => ({ backgroundColor: main.value }));
  const highlightStyle = useAnimatedStyle(() => ({
    backgroundColor: highlight.value,
    opacity: 0.38 + (lightning?.value ?? 0) * 0.32,
  }));
  const shadowStyle = useAnimatedStyle(() => ({ backgroundColor: shadow.value }));

  return (
    <Animated.View style={[styles.cloud, {
      width, height, left: -width / 2, top: -height / 2, zIndex: shape.depth,
    }, cloudStyle]}>
      {shape.lobes.map((lobe, index) => (
        <Animated.View key={index} style={[styles.ellipse, {
          left: lobe.x * width, top: lobe.y * height,
          width: lobe.width * width, height: lobe.height * height,
        }, mainStyle]} />
      ))}
      {/* Wide, flat base joins the lobes; thin tinted ellipses model light and depth. */}
      <Animated.View style={[styles.ellipse, {
        left: width * 0.02, top: height * 0.46, width: width * 0.96, height: height * 0.42,
      }, mainStyle]} />
      <Animated.View style={[styles.ellipse, styles.shadow, {
        left: width * 0.12, top: height * 0.7, width: width * 0.75, height: height * 0.13,
      }, shadowStyle]} />
      <Animated.View style={[styles.ellipse, styles.highlight, {
        left: width * 0.31, top: height * 0.12, width: width * 0.31, height: height * 0.12,
      }, highlightStyle]} />
    </Animated.View>
  );
});

/** Three bounded layers sharing ONE UI-thread clock. No per-frame React state updates. */
export default function CloudLayer({ scene, isDay, animate, cloud_cover, wind_speed_10m, lightning,
  wind_direction_10m }: CloudLayerProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const shapes = useMemo(() => size.width > 0 && size.height > 0
    ? createCloudShapes(size.width, size.height) : [], [size.width, size.height]);
  const coverage = getCloudCoverage(scene, cloud_cover);
  const wind = getCloudWind(wind_speed_10m, wind_direction_10m);
  const palette = getCloudPalette(scene, isDay);
  const travelX = useSharedValue(0);
  const travelY = useSharedValue(0);
  const time = useSharedValue(0);
  const velocityX = useSharedValue(wind.x);
  const velocityY = useSharedValue(wind.y);
  const main = useSharedValue(palette.main);
  const highlight = useSharedValue(palette.highlight);
  const shadow = useSharedValue(palette.shadow);

  useEffect(() => {
    cancelAnimation(velocityX);
    cancelAnimation(velocityY);
    cancelAnimation(main);
    cancelAnimation(highlight);
    cancelAnimation(shadow);
    velocityX.value = animate ? withTiming(wind.x, { duration: 1000 }) : wind.x;
    velocityY.value = animate ? withTiming(wind.y, { duration: 1000 }) : wind.y;
    main.value = animate ? withTiming(palette.main, { duration: 1000 }) : palette.main;
    highlight.value = animate ? withTiming(palette.highlight, { duration: 1000 }) : palette.highlight;
    shadow.value = animate ? withTiming(palette.shadow, { duration: 1000 }) : palette.shadow;
    return () => {
      cancelAnimation(velocityX); cancelAnimation(velocityY);
      cancelAnimation(main); cancelAnimation(highlight); cancelAnimation(shadow);
    };
  }, [animate, wind.x, wind.y, palette.main, palette.highlight, palette.shadow,
    velocityX, velocityY, main, highlight, shadow]);

  const frame = useFrameCallback(info => {
    const dt = cloudFrameSeconds(info.timeSincePreviousFrame);
    travelX.value += velocityX.value * dt;
    travelY.value += velocityY.value * dt;
    time.value += dt;
  }, false);

  useEffect(() => {
    frame.setActive(animate && coverage > 0 && shapes.length > 0);
    // Freeze accumulated positions on pause; the first resumed frame has a null delta.
    return () => frame.setActive(false);
  }, [frame, animate, coverage, shapes.length]);

  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={styles.container} onLayout={({ nativeEvent: { layout } }) => {
        setSize(previous => previous.width === layout.width && previous.height === layout.height
          ? previous : { width: layout.width, height: layout.height });
      }}>
      {shapes.map(shape => <Cloud key={shape.id} shape={shape}
        viewportWidth={size.width} viewportHeight={size.height} coverage={coverage} animate={animate}
        travelX={travelX} travelY={travelY} time={time} main={main} highlight={highlight} shadow={shadow}
        lightning={lightning} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFill, overflow: 'hidden', zIndex: 2 },
  cloud: { position: 'absolute' },
  ellipse: { position: 'absolute', borderRadius: '50%' },
  shadow: { opacity: 0.36 },
  highlight: { opacity: 0.38, transform: [{ rotate: '-8deg' }] },
});
