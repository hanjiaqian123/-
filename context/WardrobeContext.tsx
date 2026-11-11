import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  addWardrobeItem,
  loadWardrobeItems,
  removeWardrobeItem,
} from '../services/wardrobeStorage';
import type { NewWardrobeItem, WardrobeItem } from '../types/models';

type WardrobeContextValue = {
  items: WardrobeItem[];
  isLoading: boolean;
  storageError: string | null;
  addItem: (item: NewWardrobeItem) => Promise<void>;
  deleteItem: (item: WardrobeItem) => Promise<boolean>;
  reloadItems: () => Promise<void>;
};

const WardrobeContext = createContext<WardrobeContextValue | null>(null);

type WardrobeProviderProps = {
  children: ReactNode;
};

export function WardrobeProvider({ children }: WardrobeProviderProps) {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);

  const reloadItems = useCallback(async () => {
    setIsLoading(true);
    setStorageError(null);

    try {
      const storedItems = await loadWardrobeItems();
      setItems(storedItems);
    } catch (error) {
      console.error('恢复衣橱失败：', error);
      setItems([]);
      setStorageError('读取本地衣橱失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadTimer = setTimeout(() => {
      void reloadItems();
    }, 0);

    return () => clearTimeout(loadTimer);
  }, [reloadItems]);

  const addItem = useCallback(
    async (draft: NewWardrobeItem) => {
      setStorageError(null);
      try {
        const result = await addWardrobeItem(draft, items);
        setItems(result.items);
      } catch (error) {
        console.error('保存衣服失败：', error);
        setStorageError(
          error instanceof Error ? error.message : '保存衣服失败，请重试'
        );
        throw error;
      }
    },
    [items]
  );

  const deleteItem = useCallback(
    async (item: WardrobeItem) => {
      setStorageError(null);
      try {
        const result = await removeWardrobeItem(item, items);
        setItems(result.items);

        if (result.fileDeleteFailed) {
          setStorageError('衣服记录已删除，但本地图片清理失败');
        }

        return result.fileDeleteFailed;
      } catch (error) {
        console.error('删除衣服失败：', error);
        setStorageError('删除衣服失败，请重试');
        throw error;
      }
    },
    [items]
  );

  const value = useMemo<WardrobeContextValue>(
    () => ({
      items,
      isLoading,
      storageError,
      addItem,
      deleteItem,
      reloadItems,
    }),
    [addItem, deleteItem, isLoading, items, reloadItems, storageError]
  );

  return (
    <WardrobeContext.Provider value={value}>
      {children}
    </WardrobeContext.Provider>
  );
}

export function useWardrobe(): WardrobeContextValue {
  const context = useContext(WardrobeContext);

  if (!context) {
    throw new Error('useWardrobe 必须在 WardrobeProvider 内使用');
  }

  return context;
}
