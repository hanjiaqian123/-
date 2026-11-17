import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { cosmicTheme } from '../../theme/cosmicTheme';
import type { WardrobeItem } from '../../types/models';
import { OUTFIT_SLOTS, type FeedbackChoice, type WardrobeOutfit } from '../../types/outfits';
import { hasOutfitItems } from '../../services/outfitTrial';

const SLOT_LABELS = { top: '上衣', outerwear: '外套', bottoms: '下装', shoes: '鞋子' };
const AESTHETIC = [{ value: 'like', label: '喜欢' }, { value: 'dislike', label: '不喜欢' }] as const;
const THERMAL = [{ value: 'tooHot', label: '预计太热' }, { value: 'justRight', label: '预计刚好' }, { value: 'tooCold', label: '预计太冷' }] as const;

function ClothingPhoto({ item }: { item: WardrobeItem }) {
  const [failed, setFailed] = useState(false);
  return failed ? <View style={[styles.image, styles.fallback]}><Text style={styles.caption}>照片暂不可用</Text></View> : (
    <Image source={{ uri: item.imageUri }} accessibilityLabel={`${item.name}照片`} resizeMode="contain"
      onError={() => setFailed(true)} style={styles.image} />
  );
}

export default function WardrobeTrialCard({ outfit, wardrobe, title, choice, disabled, onChoose }: {
  outfit: WardrobeOutfit;
  wardrobe: WardrobeItem[];
  title: string;
  choice?: FeedbackChoice;
  disabled?: boolean;
  onChoose?: <K extends keyof FeedbackChoice>(field: K, value: NonNullable<FeedbackChoice[K]>) => void;
}) {
  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <View style={styles.grid}>
        {OUTFIT_SLOTS.map((slot) => {
          const id = outfit.items[slot];
          const item = wardrobe.find((entry) => entry.id === id);
          const missing = outfit.missingSlots.includes(slot);
          if (!id && !missing) return null;
          return (
            <View key={slot} style={styles.piece}>
              <Text style={styles.caption}>{SLOT_LABELS[slot]}</Text>
              {item ? <ClothingPhoto key={item.id + item.imageUri} item={item} /> : null}
              <Text style={styles.name}>{item?.name ?? (missing ? `缺少${SLOT_LABELS[slot]}` : '本地单品暂不可用')}</Text>
              {item ? <Text style={styles.caption}>{item.color}</Text> : null}
            </View>
          );
        })}
      </View>
      {!hasOutfitItems(outfit.items) ? <Text style={styles.caption}>这套还没有可用衣物，补充衣橱后再试。</Text> : onChoose ? (
        <View style={styles.feedback}>
          <Text style={styles.label}>整套审美</Text>
          <View style={styles.options}>
            {AESTHETIC.map(({ value, label }) => (
              <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${title}：${label}`}
                accessibilityState={{ selected: choice?.aesthetic === value, disabled }} disabled={disabled}
                onPress={() => onChoose('aesthetic', value)}
                style={[styles.option, choice?.aesthetic === value && styles.selected, disabled && styles.disabled]}>
                <Text style={styles.optionText}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>整套保暖程度</Text>
          <View style={styles.options}>
            {THERMAL.map(({ value, label }) => (
              <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${title}：${label}`}
                accessibilityState={{ selected: choice?.thermal === value, disabled }} disabled={disabled}
                onPress={() => onChoose('thermal', value)}
                style={[styles.option, choice?.thermal === value && styles.selected, disabled && styles.disabled]}>
                <Text style={styles.optionText}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.caption}>{choice?.aesthetic || choice?.thermal ? '再次点击已选项可取消' : '未选择 · 将跳过这套'}</Text>
        </View>
      ) : null}
    </View>
  );
}

const colors = cosmicTheme.colors;
const styles = StyleSheet.create({
  card: { backgroundColor: colors.outfitPanel, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: 22, padding: 16, marginTop: 16 },
  title: { color: colors.textPrimary, fontSize: 19, fontWeight: '700', marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  piece: { flexBasis: '46%', flexGrow: 1, minWidth: 0, gap: 7, marginBottom: 8 },
  image: { width: '100%', height: 150, borderRadius: 12, backgroundColor: colors.outfitSurface },
  fallback: { justifyContent: 'center', alignItems: 'center' },
  name: { color: colors.textPrimary, fontSize: 14, lineHeight: 21 },
  caption: { color: colors.textSecondary, fontSize: 12, lineHeight: 19 },
  feedback: { borderTopColor: colors.cardBorder, borderTopWidth: 1, marginTop: 12, paddingTop: 4, gap: 10 },
  label: { color: colors.softStarlight, fontSize: 13, marginTop: 12 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { minHeight: 44, justifyContent: 'center', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, borderColor: colors.cardBorder, borderWidth: 1 },
  selected: { backgroundColor: colors.outfitButton, borderColor: colors.violetLight },
  optionText: { color: colors.textPrimary, fontSize: 14 },
  disabled: { opacity: 0.5 },
});
