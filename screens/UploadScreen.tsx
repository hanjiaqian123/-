import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import type { ScreenProps } from '../navigation/types';
import { CLOTHING_CATEGORIES, type ClothingCategory } from '../types/models';

type SelectedImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

export default function UploadScreen({ navigation }: ScreenProps<'Upload'>) {
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [category, setCategory] = useState<ClothingCategory>('上衣');
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);

  const applyPickerResult = useCallback((result: ImagePicker.ImagePickerResult) => {
    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    if (!asset?.uri) {
      setPickerError('没有读取到有效图片，请重新选择');
      return;
    }

    setSelectedImage({
      uri: asset.uri,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
    });
    setPickerError(null);
  }, []);

  useEffect(() => {
    const pendingTimer = setTimeout(() => {
      void ImagePicker.getPendingResultAsync()
        .then((pendingResult) => {
          if (pendingResult && 'canceled' in pendingResult) {
            applyPickerResult(pendingResult);
          } else if (pendingResult && 'message' in pendingResult) {
            setPickerError(pendingResult.message);
          }
        })
        .catch((error) => {
          console.warn('恢复图片选择结果失败：', error);
        });
    }, 0);

    return () => clearTimeout(pendingTimer);
  }, [applyPickerResult]);

  async function pickImage() {
    if (isPicking) {
      return;
    }

    setIsPicking(true);
    setPickerError(null);

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setPickerError('相册权限未开启，请在系统设置中允许访问照片后重试');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        mediaTypes: ['images'],
        quality: 0.9,
        selectionLimit: 1,
      });
      applyPickerResult(result);
    } catch (error) {
      console.error('选择衣服图片失败：', error);
      setPickerError('图片选择失败，请稍后重试');
    } finally {
      setIsPicking(false);
    }
  }

  function startRecognition() {
    if (!selectedImage) {
      return;
    }

    navigation.navigate('Processing', {
      category,
      imageUri: selectedImage.uri,
      fileName: selectedImage.fileName,
      mimeType: selectedImage.mimeType,
    });
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      style={styles.page}
    >
      <Text style={styles.title}>上传一件新单品</Text>
      <Text style={styles.subtitle}>
        从系统相册选择一张清晰的衣服照片，确认后会保存到应用本地衣橱。
      </Text>

      <Pressable
        accessibilityLabel={selectedImage ? '重新选择衣服图片' : '选择衣服图片'}
        accessibilityRole="button"
        disabled={isPicking}
        onPress={pickImage}
        style={({ pressed }) => [
          styles.imagePicker,
          selectedImage && styles.imageSelected,
          pressed && styles.pressed,
        ]}
      >
        {selectedImage ? (
          <>
            <Image
              accessibilityLabel="已选择的衣服照片"
              resizeMode="cover"
              source={{ uri: selectedImage.uri }}
              style={styles.previewImage}
            />
            <View style={styles.previewOverlay}>
              <Text style={styles.previewOverlayText}>点击重新选择</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.previewIcon}>＋</Text>
            <Text style={styles.previewTitle}>选择衣服图片</Text>
            <Text style={styles.previewHint}>打开系统相册</Text>
          </>
        )}
      </Pressable>

      {pickerError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{pickerError}</Text>
          <Pressable
            accessibilityLabel="重新选择图片"
            accessibilityRole="button"
            onPress={pickImage}
            style={({ pressed }) => [
              styles.errorAction,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.errorActionText}>重试</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>选择类别</Text>
      <View style={styles.categories}>
        {CLOTHING_CATEGORIES.map((item) => {
          const isSelected = item === category;
          return (
            <Pressable
              accessibilityLabel={`选择${item}`}
              accessibilityRole="button"
              key={item}
              onPress={() => setCategory(item)}
              style={({ pressed }) => [
                styles.category,
                isSelected && styles.categorySelected,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  isSelected && styles.categoryTextSelected,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.tipCard}>
        <Text style={styles.tipIcon}>💡</Text>
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>图片建议</Text>
          <Text style={styles.tipText}>
            使用纯色背景、保持光线均匀，并让衣服完整出现在画面中。
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityLabel="开始AI识别"
        accessibilityRole="button"
        disabled={!selectedImage || isPicking}
        onPress={startRecognition}
        style={({ pressed }) => [
          styles.primaryButton,
          (!selectedImage || isPicking) && styles.primaryButtonDisabled,
          pressed && selectedImage && styles.pressed,
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {selectedImage ? '开始 AI 识别' : '请先选择图片'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: '#F3F6FA', flex: 1 },
  content: { padding: 20, paddingBottom: 36 },
  title: { color: '#18324B', fontSize: 26, fontWeight: '800' },
  subtitle: {
    color: '#8293A5',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  imagePicker: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#B9CAD8',
    borderRadius: 22,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    height: 280,
    justifyContent: 'center',
    marginTop: 24,
    overflow: 'hidden',
  },
  imageSelected: { borderStyle: 'solid', borderColor: '#6AA5C9' },
  previewImage: { height: '100%', width: '100%' },
  previewOverlay: {
    backgroundColor: 'rgba(24, 50, 75, 0.78)',
    borderRadius: 12,
    bottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    position: 'absolute',
  },
  previewOverlayText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  previewIcon: { color: '#6AA5C9', fontSize: 54, fontWeight: '300' },
  previewTitle: {
    color: '#18324B',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 14,
  },
  previewHint: { color: '#8293A5', fontSize: 12, marginTop: 7 },
  errorCard: {
    alignItems: 'center',
    backgroundColor: '#FFF1F0',
    borderRadius: 14,
    flexDirection: 'row',
    marginTop: 12,
    padding: 13,
  },
  errorText: { color: '#A3332A', flex: 1, fontSize: 12, lineHeight: 18 },
  errorAction: { paddingHorizontal: 10, paddingVertical: 7 },
  errorActionText: { color: '#A3332A', fontSize: 12, fontWeight: '800' },
  sectionTitle: {
    color: '#18324B',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 28,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  category: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E7ED',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    width: '31%',
  },
  categorySelected: { backgroundColor: '#234968', borderColor: '#234968' },
  categoryText: { color: '#53677B', fontSize: 13, fontWeight: '700' },
  categoryTextSelected: { color: '#FFFFFF' },
  tipCard: {
    backgroundColor: '#E7F5ED',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 12,
    marginTop: 26,
    padding: 16,
  },
  tipIcon: { fontSize: 20 },
  tipContent: { flex: 1 },
  tipTitle: { color: '#27845C', fontSize: 13, fontWeight: '800' },
  tipText: { color: '#4A6C5C', fontSize: 12, lineHeight: 18, marginTop: 4 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#234968',
    borderRadius: 16,
    marginTop: 26,
    paddingVertical: 15,
  },
  primaryButtonDisabled: { backgroundColor: '#B6C2CC' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.76 },
});
