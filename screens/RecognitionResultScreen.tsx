import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useWardrobe } from '../context/WardrobeContext';
import type { ScreenProps } from '../navigation/types';
import {
  CLOTHING_CATEGORIES,
  type ClothingCategory,
} from '../types/models';

const MOCK_NAMES: Record<ClothingCategory, string> = {
  上衣: '简约圆领上衣',
  裤子: '日常直筒长裤',
  裙子: '轻盈日常裙装',
  外套: '城市休闲外套',
  鞋子: '轻量休闲鞋',
  配饰: '日常风格配饰',
};

export default function RecognitionResultScreen({
  navigation,
  route,
}: ScreenProps<'RecognitionResult'>) {
  const { addItem } = useWardrobe();
  const {
    category: initialCategory,
    fileName,
    imageUri,
    mimeType,
  } = route.params;
  const [name, setName] = useState(MOCK_NAMES[initialCategory]);
  const [category, setCategory] =
    useState<ClothingCategory>(initialCategory);
  const [color, setColor] = useState('雾蓝色');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canSave = name.trim().length > 0 && color.trim().length > 0;

  async function saveItem() {
    if (!canSave || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await addItem({
        id: `wardrobe-${Date.now()}`,
        name: name.trim(),
        category,
        color: color.trim(),
        sourceImageUri: imageUri,
        originalFileName: fileName,
        mimeType,
        createdAt: new Date().toISOString(),
      });
      navigation.pop(2);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : '保存失败，请稍后重试'
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={styles.page}
    >
      <View style={styles.successBadge}>
        <Text style={styles.successBadgeText}>✓ Mock 识别完成</Text>
      </View>
      <Text style={styles.title}>确认这件单品的信息</Text>
      <Text style={styles.subtitle}>
        图片来自你的相册；名称、类别和颜色可在保存前修改。
      </Text>

      <View style={styles.previewCard}>
        <Image
          accessibilityLabel="待保存的衣服照片"
          resizeMode="cover"
          source={{ uri: imageUri }}
          style={styles.previewImage}
        />
        <Text style={styles.confidence}>Mock AI 识别可信度 94%</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.label}>衣服名称</Text>
        <TextInput
          accessibilityLabel="衣服名称"
          maxLength={40}
          onChangeText={setName}
          placeholder="输入衣服名称"
          placeholderTextColor="#A0ADBA"
          style={styles.input}
          value={name}
        />

        <Text style={styles.label}>衣服类别</Text>
        <View style={styles.categories}>
          {CLOTHING_CATEGORIES.map((item) => {
            const selected = item === category;
            return (
              <Pressable
                accessibilityLabel={`选择${item}`}
                accessibilityRole="button"
                key={item}
                onPress={() => setCategory(item)}
                style={({ pressed }) => [
                  styles.categoryChip,
                  selected && styles.categoryChipSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selected && styles.categoryTextSelected,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>颜色</Text>
        <TextInput
          accessibilityLabel="衣服颜色"
          maxLength={20}
          onChangeText={setColor}
          placeholder="例如：雾蓝色"
          placeholderTextColor="#A0ADBA"
          style={styles.input}
          value={color}
        />
      </View>

      {saveError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{saveError}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityLabel="确认并保存到衣橱"
        accessibilityRole="button"
        disabled={!canSave || isSaving}
        onPress={saveItem}
        style={({ pressed }) => [
          styles.primaryButton,
          (!canSave || isSaving) && styles.primaryButtonDisabled,
          pressed && canSave && styles.pressed,
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {isSaving ? '正在保存图片...' : '确认并保存到衣橱'}
        </Text>
      </Pressable>

      <Pressable
        accessibilityLabel="返回重新选择"
        accessibilityRole="button"
        disabled={isSaving}
        onPress={() => navigation.goBack()}
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.secondaryButtonText}>返回重新选择</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: '#F3F6FA', flex: 1 },
  content: { padding: 20, paddingBottom: 36 },
  successBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E7F5ED',
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  successBadgeText: { color: '#27845C', fontSize: 12, fontWeight: '800' },
  title: { color: '#18324B', fontSize: 25, fontWeight: '800', marginTop: 14 },
  subtitle: { color: '#8293A5', fontSize: 13, lineHeight: 20, marginTop: 8 },
  previewCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    marginTop: 22,
    overflow: 'hidden',
    paddingBottom: 14,
  },
  previewImage: { height: 280, width: '100%' },
  confidence: { color: '#27845C', fontSize: 11, marginTop: 13 },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    gap: 10,
    marginTop: 16,
    padding: 18,
  },
  label: { color: '#53677B', fontSize: 12, fontWeight: '800', marginTop: 4 },
  input: {
    backgroundColor: '#F3F6FA',
    borderColor: '#E1E8ED',
    borderRadius: 13,
    borderWidth: 1,
    color: '#18324B',
    fontSize: 14,
    marginBottom: 7,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 7 },
  categoryChip: {
    backgroundColor: '#F3F6FA',
    borderColor: '#E1E8ED',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  categoryChipSelected: { backgroundColor: '#234968', borderColor: '#234968' },
  categoryText: { color: '#53677B', fontSize: 12, fontWeight: '700' },
  categoryTextSelected: { color: '#FFFFFF' },
  errorCard: { backgroundColor: '#FFF1F0', borderRadius: 14, marginTop: 12, padding: 13 },
  errorText: { color: '#A3332A', fontSize: 12, lineHeight: 18 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#234968',
    borderRadius: 16,
    marginTop: 22,
    paddingVertical: 15,
  },
  primaryButtonDisabled: { backgroundColor: '#B6C2CC' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#B8C6D1',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    paddingVertical: 14,
  },
  secondaryButtonText: { color: '#53677B', fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.72 },
});
