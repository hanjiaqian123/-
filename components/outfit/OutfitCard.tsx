import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { OutfitRecommendation } from '../../types/models';

type OutfitCardProps = {
  recommendation: OutfitRecommendation | null;
  isPrimary: boolean;
  onChangeOutfit?: () => void;
};

export default function OutfitCard({
  recommendation,
  isPrimary,
  onChangeOutfit,
}: OutfitCardProps) {
  return (
    <View style={[styles.outfitCard, isPrimary && styles.primaryCard]}>
      <View style={styles.recommendRow}>
        <Text style={styles.outfitTag}>
          {isPrimary ? '✨ 优先推荐' : '💫 备选穿搭'}
        </Text>
        <Text style={styles.match}>
          {isPrimary ? '推荐搭配' : '同天气可选'}
        </Text>
      </View>

      <Text style={styles.outfitTitle}>
        {recommendation?.title ?? '正在生成推荐...'}
      </Text>

      <Text style={styles.outfitDescription}>
        {recommendation?.description ?? ''}
      </Text>

      <View style={styles.clothes}>
        <Text style={styles.clothingItem}>
          {recommendation?.top ?? '👕 等待天气数据'}
        </Text>

        <Text style={styles.clothingItem}>
          {recommendation?.bottom ?? ''}
        </Text>

        <Text style={styles.clothingItem}>
          {recommendation?.shoes ?? ''}
        </Text>

        <Text style={styles.clothingItem}>
          {recommendation?.accessory ?? ''}
        </Text>
      </View>

      <View style={styles.tip}>
        <Text style={styles.tipText}>
          💡 穿搭建议：
          {recommendation?.tip ?? '正在获取天气信息...'}
        </Text>
      </View>

      {recommendation && isPrimary && onChangeOutfit ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="换一套穿搭"
          onPress={onChangeOutfit}
          style={({ pressed }) => [
            styles.changeButton,
            pressed && styles.changeButtonPressed,
          ]}
        >
          <Text style={styles.changeButtonText}>↻ 换一套穿搭</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  outfitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
  },
  primaryCard: {
    borderColor: '#9BC8E7',
    borderWidth: 1,
  },
  recommendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outfitTag: {
    color: '#315D7B',
    fontSize: 13,
    fontWeight: '600',
  },
  match: {
    color: '#27845C',
    backgroundColor: '#E7F5ED',
    overflow: 'hidden',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
  },
  outfitTitle: {
    color: '#18324B',
    fontSize: 25,
    fontWeight: '700',
    marginTop: 17,
  },
  outfitDescription: {
    color: '#8293A5',
    fontSize: 13,
    marginTop: 5,
  },
  clothes: {
    marginTop: 18,
    gap: 13,
  },
  clothingItem: {
    color: '#41566B',
    fontSize: 15,
  },
  tip: {
    backgroundColor: '#F3F6FA',
    padding: 13,
    borderRadius: 12,
    marginTop: 20,
  },
  tipText: {
    color: '#53677B',
    fontSize: 12,
    lineHeight: 20,
  },
  changeButton: {
    alignItems: 'center',
    backgroundColor: '#234968',
    borderRadius: 14,
    marginTop: 16,
    paddingVertical: 12,
  },
  changeButtonPressed: {
    opacity: 0.78,
  },
  changeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
