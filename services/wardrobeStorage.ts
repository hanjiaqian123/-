import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

import {
  CLOTHING_CATEGORIES,
  type NewWardrobeItem,
  type WardrobeItem,
} from '../types/models';

const STORAGE_KEY = '@weatherfit/wardrobe/v1';
const wardrobeDirectory = new Directory(Paths.document, 'wardrobe-images');

function isWardrobeItem(value: unknown): value is WardrobeItem {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.category === 'string' &&
    CLOTHING_CATEGORIES.includes(
      item.category as (typeof CLOTHING_CATEGORIES)[number]
    ) &&
    typeof item.color === 'string' &&
    typeof item.imageUri === 'string' &&
    typeof item.createdAt === 'string'
  );
}

function getImageExtension(
  originalFileName?: string | null,
  mimeType?: string | null
): string {
  const fileExtension = originalFileName
    ?.split('.')
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  if (fileExtension && fileExtension.length <= 5) {
    return fileExtension;
  }

  const mimeExtension = mimeType?.split('/').pop()?.toLowerCase();
  if (mimeExtension === 'jpeg') {
    return 'jpg';
  }

  if (mimeExtension && /^[a-z0-9]+$/.test(mimeExtension)) {
    return mimeExtension;
  }

  return 'jpg';
}

async function persistItems(items: WardrobeItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function loadWardrobeItems(): Promise<WardrobeItem[]> {
  const storedValue = await AsyncStorage.getItem(STORAGE_KEY);

  if (!storedValue) {
    return [];
  }

  const parsedValue: unknown = JSON.parse(storedValue);
  if (!Array.isArray(parsedValue)) {
    throw new Error('衣橱本地数据格式无效');
  }

  const validItems = parsedValue.filter(isWardrobeItem);
  const existingItems = validItems.filter((item) => {
    try {
      return new File(item.imageUri).exists;
    } catch (error) {
      console.warn('检查衣橱图片失败：', error);
      return false;
    }
  });

  if (existingItems.length !== parsedValue.length) {
    await persistItems(existingItems);
  }

  return existingItems;
}

export async function addWardrobeItem(
  draft: NewWardrobeItem,
  currentItems: WardrobeItem[]
): Promise<{ item: WardrobeItem; items: WardrobeItem[] }> {
  wardrobeDirectory.create({ idempotent: true, intermediates: true });

  const extension = getImageExtension(draft.originalFileName, draft.mimeType);
  const sourceFile = new File(draft.sourceImageUri);
  const destinationFile = new File(
    wardrobeDirectory,
    `${draft.id}.${extension}`
  );

  if (!sourceFile.exists) {
    throw new Error('所选图片已失效，请返回并重新选择');
  }

  await sourceFile.copy(destinationFile, { overwrite: false });

  const item: WardrobeItem = {
    id: draft.id,
    name: draft.name,
    category: draft.category,
    color: draft.color,
    imageUri: destinationFile.uri,
    createdAt: draft.createdAt,
  };
  const nextItems = [item, ...currentItems];

  try {
    await persistItems(nextItems);
  } catch (error) {
    try {
      if (destinationFile.exists) {
        destinationFile.delete();
      }
    } catch (cleanupError) {
      console.warn('保存失败后清理图片失败：', cleanupError);
    }
    throw error;
  }

  return { item, items: nextItems };
}

export async function removeWardrobeItem(
  item: WardrobeItem,
  currentItems: WardrobeItem[]
): Promise<{ items: WardrobeItem[]; fileDeleteFailed: boolean }> {
  const nextItems = currentItems.filter(
    (currentItem) => currentItem.id !== item.id
  );

  await persistItems(nextItems);

  let fileDeleteFailed = false;
  try {
    const imageFile = new File(item.imageUri);
    if (imageFile.exists) {
      imageFile.delete();
    }
  } catch (error) {
    fileDeleteFailed = true;
    console.warn('删除衣橱图片失败：', error);
  }

  return { items: nextItems, fileDeleteFailed };
}
