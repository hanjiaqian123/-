import { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { ScreenProps } from '../navigation/types';

export default function ProcessingScreen({
  navigation,
  route,
}: ScreenProps<'Processing'>) {
  const { category, fileName, imageUri, mimeType } = route.params;

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('RecognitionResult', {
        category,
        imageUri,
        fileName,
        mimeType,
      });
    }, 1800);

    return () => clearTimeout(timer);
  }, [category, fileName, imageUri, mimeType, navigation]);

  return (
    <View style={styles.page}>
      <View style={styles.glow}>
        <ActivityIndicator color="#FFFFFF" size="large" />
      </View>
      <Text style={styles.eyebrow}>WEATHERFIT VISION</Text>
      <Text style={styles.title}>正在识别你的衣服</Text>
      <Text style={styles.subtitle}>
        正在分析单品类别、颜色和风格标签，完成后会自动进入确认页面。
      </Text>

      <View style={styles.steps}>
        <View style={styles.stepRow}>
          <Text style={styles.stepDone}>✓</Text>
          <Text style={styles.stepText}>图片读取完成</Text>
        </View>
        <View style={styles.stepRow}>
          <ActivityIndicator color="#6AA5C9" size="small" />
          <Text style={styles.stepText}>识别 {category} 特征</Text>
        </View>
        <View style={styles.stepRow}>
          <Text style={styles.stepPending}>3</Text>
          <Text style={styles.stepMuted}>生成衣橱标签</Text>
        </View>
      </View>

      <Pressable
        accessibilityLabel="取消识别"
        accessibilityRole="button"
        onPress={() => navigation.goBack()}
        style={({ pressed }) => [
          styles.cancelButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.cancelButtonText}>取消识别</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    alignItems: 'center',
    backgroundColor: '#F3F6FA',
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  glow: {
    alignItems: 'center',
    backgroundColor: '#234968',
    borderRadius: 52,
    height: 104,
    justifyContent: 'center',
    shadowColor: '#234968',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 22,
    width: 104,
  },
  eyebrow: {
    color: '#6AA5C9',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 30,
  },
  title: {
    color: '#18324B',
    fontSize: 25,
    fontWeight: '800',
    marginTop: 10,
    textAlign: 'center',
  },
  subtitle: {
    color: '#8293A5',
    fontSize: 13,
    lineHeight: 21,
    marginTop: 10,
    maxWidth: 320,
    textAlign: 'center',
  },
  steps: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    gap: 17,
    marginTop: 30,
    padding: 20,
    width: '100%',
  },
  stepRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  stepDone: {
    color: '#27845C',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    width: 20,
  },
  stepPending: {
    borderColor: '#C7D3DC',
    borderRadius: 10,
    borderWidth: 1,
    color: '#A0ADBA',
    fontSize: 11,
    height: 20,
    lineHeight: 18,
    textAlign: 'center',
    width: 20,
  },
  stepText: {
    color: '#41566B',
    fontSize: 14,
    fontWeight: '600',
  },
  stepMuted: {
    color: '#A0ADBA',
    fontSize: 14,
  },
  cancelButton: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#6A7C8C',
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.65,
  },
});
