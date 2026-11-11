import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useWardrobe } from '../context/WardrobeContext';
import type { ScreenProps } from '../navigation/types';
import {
  CLOTHING_CATEGORIES,
  type ClothingCategory,
  type WardrobeItem,
} from '../types/models';

type FilterCategory = '全部' | ClothingCategory;

function WardrobeImage({ item }: { item: WardrobeItem }) {
  const [hasImageError, setHasImageError] = useState(false);

  if (hasImageError) {
    return (
      <View style={styles.missingImage}>
        <Text style={styles.missingImageIcon}>🖼️</Text>
        <Text style={styles.missingImageText}>图片不可用</Text>
      </View>
    );
  }

  return (
    <Image
      accessibilityLabel={`${item.name}照片`}
      onError={() => setHasImageError(true)}
      resizeMode="cover"
      source={{ uri: item.imageUri }}
      style={styles.itemImage}
    />
  );
}

export default function WardrobeScreen({
  navigation,
}: ScreenProps<'Wardrobe'>) {
  const { deleteItem, isLoading, items, reloadItems, storageError } =
    useWardrobe();
  const [filter, setFilter] = useState<FilterCategory>('全部');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredItems =
    filter === '全部'
      ? items
      : items.filter((item) => item.category === filter);

  function confirmDelete(item: WardrobeItem) {
    Alert.alert('删除这件衣服？', '衣服信息和本地图片将同时删除，且无法恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          setDeletingId(item.id);
          void deleteItem(item)
            .then((fileDeleteFailed) => {
              if (fileDeleteFailed) {
                Alert.alert('部分清理失败', '衣服记录已删除，但本地图片清理失败。');
              }
            })
            .catch(() => {
              Alert.alert('删除失败', '未能删除这件衣服，请稍后重试。');
            })
            .finally(() => setDeletingId(null));
        },
      },
    ]);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      style={styles.page}
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>MY WARDROBE</Text>
        <Text style={styles.title}>今天想穿什么？</Text>
        <Text style={styles.subtitle}>
          {isLoading
            ? '正在恢复本地衣橱...'
            : `已在本机保存 ${items.length} 件单品。`}
        </Text>
        <Pressable
          accessibilityLabel="添加衣服"
          accessibilityRole="button"
          onPress={() => navigation.navigate('Upload')}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryButtonText}>＋ 添加衣服</Text>
        </Pressable>
      </View>

      {storageError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{storageError}</Text>
          <Pressable
            accessibilityLabel="重新读取衣橱"
            accessibilityRole="button"
            onPress={() => void reloadItems()}
            style={({ pressed }) => [styles.errorButton, pressed && styles.pressed]}
          >
            <Text style={styles.errorButtonText}>重试</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.filters}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {(['全部', ...CLOTHING_CATEGORIES] as FilterCategory[]).map((item) => {
          const selected = item === filter;
          return (
            <Pressable
              accessibilityLabel={`筛选${item}`}
              accessibilityRole="button"
              key={item}
              onPress={() => setFilter(item)}
              style={({ pressed }) => [
                styles.filterChip,
                selected && styles.filterChipSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  selected && styles.filterTextSelected,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {filter === '全部' ? '全部单品' : filter}
        </Text>
        <Text style={styles.count}>{filteredItems.length} ITEMS</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color="#234968" size="large" />
          <Text style={styles.loadingText}>正在读取本地衣橱</Text>
        </View>
      ) : filteredItems.length > 0 ? (
        <View style={styles.grid}>
          {filteredItems.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <WardrobeImage item={item} />
              <Text numberOfLines={1} style={styles.itemName}>
                {item.name}
              </Text>
              <Text style={styles.itemMeta}>
                {item.category} · {item.color}
              </Text>
              <Pressable
                accessibilityLabel={`删除${item.name}`}
                accessibilityRole="button"
                disabled={deletingId === item.id}
                onPress={() => confirmDelete(item)}
                style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
              >
                <Text style={styles.deleteButtonText}>
                  {deletingId === item.id ? '删除中...' : '删除'}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>👚</Text>
          <Text style={styles.emptyTitle}>
            {items.length === 0 ? '衣橱还是空的' : `还没有${filter}`}
          </Text>
          <Text style={styles.emptyText}>
            {items.length === 0
              ? '从相册添加第一件衣服，开始建立你的真实衣橱。'
              : '可以切换其他分类，或添加一件新的单品。'}
          </Text>
          <Pressable
            accessibilityLabel="添加第一件衣服"
            accessibilityRole="button"
            onPress={() => navigation.navigate('Upload')}
            style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]}
          >
            <Text style={styles.emptyButtonText}>添加衣服</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: '#F3F6FA', flex: 1 },
  content: { padding: 20, paddingBottom: 36 },
  hero: { backgroundColor: '#234968', borderRadius: 24, padding: 22 },
  eyebrow: { color: '#9BC8E7', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  title: { color: '#FFFFFF', fontSize: 27, fontWeight: '800', marginTop: 10 },
  subtitle: { color: '#D9EAF7', fontSize: 13, lineHeight: 20, marginTop: 8 },
  primaryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonText: { color: '#234968', fontSize: 14, fontWeight: '800' },
  errorCard: {
    alignItems: 'center',
    backgroundColor: '#FFF1F0',
    borderRadius: 14,
    flexDirection: 'row',
    marginTop: 14,
    padding: 13,
  },
  errorText: { color: '#A3332A', flex: 1, fontSize: 12 },
  errorButton: { paddingHorizontal: 10, paddingVertical: 7 },
  errorButtonText: { color: '#A3332A', fontSize: 12, fontWeight: '800' },
  filters: { gap: 8, paddingVertical: 20 },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  filterChipSelected: { backgroundColor: '#234968' },
  filterText: { color: '#53677B', fontSize: 12, fontWeight: '700' },
  filterTextSelected: { color: '#FFFFFF' },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: { color: '#18324B', fontSize: 20, fontWeight: '800' },
  count: { color: '#8293A5', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  itemCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 10, width: '48%' },
  itemImage: { aspectRatio: 1, borderRadius: 14, width: '100%' },
  missingImage: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: '#EDF4F8',
    borderRadius: 14,
    justifyContent: 'center',
    width: '100%',
  },
  missingImageIcon: { fontSize: 28 },
  missingImageText: { color: '#8293A5', fontSize: 10, marginTop: 5 },
  itemName: { color: '#18324B', fontSize: 14, fontWeight: '700', marginTop: 11 },
  itemMeta: { color: '#8293A5', fontSize: 11, marginTop: 5 },
  deleteButton: { alignSelf: 'flex-end', marginTop: 8, padding: 7 },
  deleteButtonText: { color: '#B34A42', fontSize: 11, fontWeight: '700' },
  loadingState: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { color: '#8293A5', fontSize: 12, marginTop: 12 },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 30,
  },
  emptyIcon: { fontSize: 50 },
  emptyTitle: { color: '#18324B', fontSize: 18, fontWeight: '800', marginTop: 14 },
  emptyText: {
    color: '#8293A5',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 7,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: '#234968',
    borderRadius: 14,
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.72 },
});
