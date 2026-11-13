import { StyleSheet, Text, View } from 'react-native';

import { cosmicTheme } from '../../theme/cosmicTheme';
import type { OutfitRecommendation } from '../../types/models';

// Display metadata for the existing recommendation IDs, not a new selection
// rule. Snow/freezing-rain recommendations already use the cold IDs upstream.
const TEMPERATURE_LABELS: Record<string, string> = {
  cold: '体感 ≤ 8°C',
  cool: '8°C < 体感 ≤ 15°C',
  mild: '15°C < 体感 ≤ 22°C',
  hot: '体感 > 22°C',
};

export function OutfitMetadata({
  recommendation,
}: {
  recommendation: OutfitRecommendation | null;
}) {
  if (!recommendation) {
    return null;
  }

  const temperatureLabel =
    TEMPERATURE_LABELS[recommendation.id.split('-')[0]];
  const tags = [
    ...new Set(
      recommendation.description
        .split(/[、·]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    ),
  ];

  return (
    <View style={styles.metadata}>
      {temperatureLabel ? (
        <View style={styles.temperatureBadge}>
          <Text style={styles.temperatureLabel}>{temperatureLabel}</Text>
        </View>
      ) : null}
      <View style={styles.tags}>
        {tags.map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function OutfitPieces({
  recommendation,
}: {
  recommendation: OutfitRecommendation | null;
}) {
  const pieces = [
    { label: '上装', value: recommendation?.top ?? '👕 等待天气数据' },
    { label: '下装', value: recommendation?.bottom },
    { label: '鞋履', value: recommendation?.shoes },
    { label: '配饰', value: recommendation?.accessory },
  ];

  return (
    <View style={styles.pieces}>
      {pieces.map((piece) =>
        piece.value ? (
          <View key={piece.label} style={styles.piece}>
            <View style={styles.pieceLabelWrap}>
              <Text style={styles.pieceLabel}>{piece.label}</Text>
            </View>
            <Text style={styles.pieceValue}>{piece.value}</Text>
          </View>
        ) : null
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  metadata: {
    gap: 10,
    marginTop: 14,
  },
  temperatureBadge: {
    alignSelf: 'flex-start',
    backgroundColor: cosmicTheme.colors.cardInset,
    borderColor: cosmicTheme.colors.cardDivider,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  temperatureLabel: {
    color: cosmicTheme.colors.softStarlight,
    fontSize: 11,
    fontWeight: '600',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: cosmicTheme.colors.outfitAccent,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  tagText: {
    color: cosmicTheme.colors.violetLight,
    fontSize: 11,
    lineHeight: 16,
  },
  pieces: {
    gap: 8,
    marginTop: 18,
  },
  piece: {
    alignItems: 'flex-start',
    backgroundColor: cosmicTheme.colors.cardInset,
    borderColor: cosmicTheme.colors.cardDivider,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 13,
  },
  pieceLabelWrap: {
    borderLeftColor: cosmicTheme.colors.violetLight,
    borderLeftWidth: 2,
    paddingLeft: 9,
    paddingTop: 2,
  },
  pieceLabel: {
    color: cosmicTheme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 20,
  },
  pieceValue: {
    color: cosmicTheme.colors.textPrimary,
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 23,
  },
});
