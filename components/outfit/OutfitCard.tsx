import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { cosmicTheme } from '../../theme/cosmicTheme';
import type { OutfitRecommendation } from '../../types/models';
import { OutfitMetadata, OutfitPieces } from './OutfitPresentation';
import OutfitReveal from './OutfitReveal';

type OutfitCardProps = {
  recommendation: OutfitRecommendation | null;
  isPrimary: boolean;
  onChangeOutfit?: () => void;
  position?: number;
};

export default function OutfitCard({
  recommendation,
  isPrimary,
  onChangeOutfit,
  position = 1,
}: OutfitCardProps) {
  return (
    <OutfitReveal
      replayKey={`${recommendation?.id ?? 'pending'}:${isPrimary}`}
      style={styles.reveal}
    >
      <View style={[styles.outfitCard, isPrimary && styles.primaryCard]}>
        <LinearGradient
          colors={
            isPrimary
              ? cosmicTheme.gradients.outfitPrimary
              : cosmicTheme.gradients.outfitSecondary
          }
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.content}
        >
          <View style={styles.recommendRow}>
            <Text style={styles.outfitTag}>
              LOOK {String(position).padStart(2, '0')}
            </Text>
            <View style={[styles.match, isPrimary && styles.primaryMatch]}>
              <Text style={styles.matchText}>
                {isPrimary ? '✦ 优先推荐' : '同天气 · 备选'}
              </Text>
            </View>
          </View>

          <Text style={styles.outfitTitle}>
            {recommendation?.title ?? '正在生成推荐...'}
          </Text>
          <OutfitMetadata recommendation={recommendation} />

          <OutfitPieces recommendation={recommendation} />

          <View style={styles.tip}>
            <Text style={styles.tipHeading}>✧ 搭配理由</Text>
            <Text style={styles.tipText}>
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
              <Text style={styles.changeHint}>探索另一种风格</Text>
            </Pressable>
          ) : null}
        </LinearGradient>
      </View>
    </OutfitReveal>
  );
}

const styles = StyleSheet.create({
  reveal: {
    marginBottom: 24,
  },
  outfitCard: {
    backgroundColor: cosmicTheme.colors.outfitPanel,
    borderColor: cosmicTheme.colors.cardDivider,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  primaryCard: {
    borderColor: cosmicTheme.colors.violetLight,
  },
  content: {
    padding: 20,
  },
  recommendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  outfitTag: {
    color: cosmicTheme.colors.softStarlight,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.2,
  },
  match: {
    backgroundColor: cosmicTheme.colors.cardInset,
    borderColor: cosmicTheme.colors.cardDivider,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  primaryMatch: {
    backgroundColor: cosmicTheme.colors.outfitAccent,
  },
  matchText: {
    color: cosmicTheme.colors.violetLight,
    fontSize: 11,
    fontWeight: '600',
  },
  outfitTitle: {
    color: cosmicTheme.colors.textPrimary,
    fontSize: 25,
    fontWeight: '700',
    marginTop: 18,
    lineHeight: 34,
  },
  tip: {
    borderTopColor: cosmicTheme.colors.cardDivider,
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 18,
  },
  tipHeading: {
    color: cosmicTheme.colors.violetLight,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 7,
  },
  tipText: {
    color: cosmicTheme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 20,
  },
  changeButton: {
    backgroundColor: cosmicTheme.colors.outfitButton,
    borderRadius: 14,
    marginTop: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 6,
  },
  changeButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },
  changeButtonText: {
    color: cosmicTheme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  changeHint: {
    color: cosmicTheme.colors.softStarlight,
    fontSize: 10,
  },
});
