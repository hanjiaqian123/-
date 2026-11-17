import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useWardrobe } from '../../context/WardrobeContext';
import { buildDailyOutfitPlan, type DayPeriodId, type PeriodPlan } from '../../services/dailyOutfitPlan';
import { cosmicTheme } from '../../theme/cosmicTheme';
import type { HourlyWeather, WardrobeItem } from '../../types/models';
import { getWeatherDisplay } from '../weather/WeatherCard';
import { OutfitMetadata, OutfitPieces } from './OutfitPresentation';
import OutfitReveal from './OutfitReveal';

type DailyOutfitPlanProps = {
  hourly: HourlyWeather[];
  cityName: string;
  timezone?: string;
  utcOffsetSeconds?: number;
  isLoading: boolean;
  weatherError: string | null;
  lastUpdated: Date | null;
  active: boolean;
  onOpenWardrobe: () => void;
  onSelectPlan?: (plan: PeriodPlan) => void;
};

function WardrobeThumbnail({ item }: { item: WardrobeItem }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <View style={styles.thumbnailFallback}><Text style={styles.smallText}>暂无图片</Text></View>
  ) : (
    <Image
      accessibilityLabel={item.name + '衣橱照片'}
      source={{ uri: item.imageUri }}
      onError={() => setFailed(true)}
      resizeMode="contain"
      style={styles.thumbnail}
    />
  );
}

export default function DailyOutfitPlan({
  hourly, cityName, timezone, utcOffsetSeconds, isLoading, weatherError,
  lastUpdated, active, onOpenWardrobe, onSelectPlan,
}: DailyOutfitPlanProps) {
  const wardrobe = useWardrobe();
  const [now, setNow] = useState(() => new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<DayPeriodId | null>(null);
  const [showGeneric, setShowGeneric] = useState(false);

  useEffect(() => {
    if (!active) return;
    const update = () => setNow(new Date());
    const initial = setTimeout(update, 0);
    const timer = setInterval(update, 60000);
    return () => { clearTimeout(initial); clearInterval(timer); };
  }, [active]);

  const plans = useMemo(() => buildDailyOutfitPlan({
    hourly, items: wardrobe.isLoading || wardrobe.storageError ? [] : wardrobe.items,
    now, timezone, utcOffsetSeconds,
  }), [hourly, wardrobe.isLoading, wardrobe.storageError, wardrobe.items, now, timezone, utcOffsetSeconds]);
  const plan = plans.find((entry) => entry.period.id === selectedPeriod) ??
    plans.find((entry) => entry.recommendation) ?? plans[0];
  const weather = plan.weather;
  const display = weather ? getWeatherDisplay(weather) : null;
  const matches = plan.slots.filter((slot) => slot.item).length;

  useEffect(() => { onSelectPlan?.(plan); }, [onSelectPlan, plan]);

  return (
    <View style={styles.section} testID="daily-outfit-plan">
      <Text style={styles.eyebrow}>DRESS FOR YOUR WHOLE DAY</Text>
      <Text accessibilityRole="header" style={styles.heading}>今日全天智能穿搭计划</Text>
      <Text style={styles.context}>
        {cityName} · {plan.date ?? '城市日期待确认'} · 城市当地时间
      </Text>
      <Text style={styles.explanation}>
        早晨 06–11 点前 / 中午 11–17 点前 / 晚上 17–24 点前
      </Text>
      {isLoading ? <Text accessibilityLiveRegion="polite" style={styles.notice}>正在更新预报；已有结果仅基于上次成功的数据。</Text> : null}
      {weatherError ? <Text accessibilityLiveRegion="polite" style={styles.notice}>天气更新失败，保留上次成功预报，请刷新后再确认计划。</Text> : null}
      {lastUpdated ? <Text style={styles.smallText}>预报获取于 {lastUpdated.toLocaleString('zh-CN', { hour12: false })}（手机本地时间）</Text> : null}

      <View style={styles.tabs} accessibilityRole="tablist">
        {plans.map((entry) => {
          const selected = entry.period.id === plan.period.id;
          return (
            <Pressable
              key={entry.period.id}
              accessibilityLabel={'查看' + entry.period.label + '穿搭计划'}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => { setSelectedPeriod(entry.period.id); setShowGeneric(false); }}
              style={({ pressed }) => [styles.tab, selected && styles.selectedTab, pressed && styles.pressed]}
            >
              <Text style={[styles.tabName, selected && styles.selectedText]}>{entry.period.icon} {entry.period.label}</Text>
              <Text style={styles.tabTemperature}>
                {entry.weather ? Math.round(entry.weather.minTemperature) + '–' + Math.round(entry.weather.maxTemperature) + '°' : '数据不足'}
              </Text>
              <Text style={styles.tabStatus}>{entry.status === 'ready' ? '完整预报' : entry.status === 'partial' ? '部分覆盖' : '数据不足'}</Text>
            </Pressable>
          );
        })}
      </View>

      <OutfitReveal motionEnabled={active} replayKey={cityName + ':' + plan.date + ':' + plan.period.id}>
        <LinearGradient colors={cosmicTheme.gradients.outfitSecondary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.panel}>
          <Text accessibilityRole="header" style={styles.periodTitle}>{plan.period.label} · {plan.period.timeLabel}</Text>
          <Text style={plan.status === 'ready' ? styles.smallText : styles.notice}>{plan.coverage}</Text>
          {weather && display ? (
            <View style={styles.weatherSummary}>
              <Text style={styles.weatherHeadline}>{display.icon} {display.text} · {weather.minTemperature.toFixed(1)}–{weather.maxTemperature.toFixed(1)}°C</Text>
              <Text style={styles.summaryText}>最高降水概率 {Math.round(weather.maxRainProbability)}% · 最高风速 {weather.maxWind === null ? '数据不足' : weather.maxWind.toFixed(1) + ' km/h'}</Text>
              <Text style={styles.smallText}>天气图标按覆盖小时中最不利天气显示，气温为范围。</Text>
            </View>
          ) : null}

          {plan.recommendation ? (
            <>
              <Text style={styles.outfitTitle}>{plan.recommendation.title}</Text>
              <OutfitMetadata recommendation={plan.recommendation} />
              <Text style={styles.tip}>{plan.recommendation.tip}</Text>
              <Text style={styles.subheading}>为什么这样穿</Text>
              {plan.reasons.map((reason) => <Text key={reason} style={styles.reason}>· {reason}</Text>)}
              <Text style={styles.smallText}>按体感下限、最高风速与最不利天气保守规划，不代表它们发生在同一小时。</Text>

              <View style={styles.wardrobeHeader}>
                <Text style={styles.subheading}>优先从衣橱准备</Text>
                <Text style={styles.matchCount}>{matches}/{plan.slots.length} 项候选</Text>
              </View>
              {wardrobe.isLoading ? <Text style={styles.notice}>衣橱正在读取，暂时展示通用建议。</Text> : wardrobe.storageError ? (
                <Text style={styles.notice}>衣橱读取失败，以下仅为通用推荐。</Text>
              ) : !wardrobe.items.length ? <Text style={styles.notice}>衣橱暂无衣物，以下全部是通用推荐。</Text> : !matches ? <Text style={styles.notice}>未找到名称明确符合要求的衣物，以下全部是通用推荐。</Text> : null}
              <Text style={styles.smallText}>仅依据已保存的类别和名称筛选；不识别照片、不验证材质或防护性能，请自行确认。</Text>
              {plan.slots.map((slot) => (
                <View key={slot.id} style={styles.slot}>
                  {slot.item ? <WardrobeThumbnail key={slot.item.id + ':' + slot.item.imageUri} item={slot.item} /> : <View style={styles.genericMarker}><Text style={styles.markerText}>＋</Text></View>}
                  <View style={styles.slotCopy}>
                    <Text style={styles.slotLabel}>{slot.label} · {slot.item ? '衣橱候选（名称匹配）' : '通用推荐'}</Text>
                    <Text style={styles.slotName}>{slot.item?.name ?? slot.generic}</Text>
                    {slot.item ? <Text style={styles.smallText}>{slot.item.color} · {slot.item.category} · 对照要求：{slot.generic}</Text> : <Text style={styles.smallText}>衣橱未找到可确认的单品，请自行准备。</Text>}
                  </View>
                </View>
              ))}
              <Pressable accessibilityLabel="查看此时段完整通用搭配" accessibilityRole="button" accessibilityState={{ expanded: showGeneric }} onPress={() => setShowGeneric((value) => !value)} style={styles.textButton}>
                <Text style={styles.buttonText}>{showGeneric ? '收起完整通用搭配 −' : '查看完整通用搭配 ＋'}</Text>
              </Pressable>
              {showGeneric ? <OutfitPieces recommendation={plan.recommendation} /> : null}
              <Pressable accessibilityLabel="管理全天计划使用的衣橱" accessibilityRole="button" onPress={onOpenWardrobe} style={({ pressed }) => [styles.wardrobeButton, pressed && styles.pressed]}>
                <Text style={styles.buttonText}>查看我的衣橱 ↗</Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{isLoading && !hourly.length ? '正在获取真实天气' : '此时段暂无法生成穿搭'}</Text>
              <Text style={styles.reason}>仅使用今天已获取的逐小时预报；不会借用当前天气、明天天气或虚构数值补齐。</Text>
            </View>
          )}
        </LinearGradient>
      </OutfitReveal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 32 },
  eyebrow: { color: cosmicTheme.colors.violetLight, fontSize: 9, letterSpacing: 2, marginBottom: 9 },
  heading: { color: cosmicTheme.colors.textPrimary, fontSize: 22, fontWeight: '700', lineHeight: 32 },
  context: { color: cosmicTheme.colors.softStarlight, fontSize: 12, lineHeight: 21, marginTop: 7 },
  explanation: { color: cosmicTheme.colors.textSecondary, fontSize: 10, lineHeight: 20, marginTop: 4 },
  smallText: { color: cosmicTheme.colors.textSecondary, fontSize: 10, lineHeight: 18, marginTop: 6 },
  notice: { color: cosmicTheme.colors.violetLight, fontSize: 11, lineHeight: 21, marginTop: 8 },
  tabs: { flexDirection: 'row', gap: 7, marginTop: 17, marginBottom: 14 },
  tab: { flex: 1, minWidth: 0, borderRadius: 15, paddingHorizontal: 7, paddingVertical: 13, borderWidth: 1, borderColor: cosmicTheme.colors.cardDivider, backgroundColor: cosmicTheme.colors.outfitPanel, alignItems: 'center', minHeight: 90 },
  selectedTab: { backgroundColor: cosmicTheme.colors.outfitAccent, borderColor: cosmicTheme.colors.violetLight },
  tabName: { color: cosmicTheme.colors.textSecondary, fontSize: 13, fontWeight: '600', lineHeight: 22 },
  selectedText: { color: cosmicTheme.colors.textPrimary },
  tabTemperature: { color: cosmicTheme.colors.softStarlight, fontSize: 14, fontWeight: '700', lineHeight: 23, marginTop: 5 },
  tabStatus: { color: cosmicTheme.colors.textSecondary, fontSize: 9, lineHeight: 17, marginTop: 3 },
  panel: { borderColor: cosmicTheme.colors.cardBorder, borderWidth: 1, borderRadius: 23, padding: 18 },
  periodTitle: { color: cosmicTheme.colors.textPrimary, fontSize: 16, lineHeight: 26, fontWeight: '600' },
  weatherSummary: { marginTop: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: cosmicTheme.colors.cardDivider },
  weatherHeadline: { color: cosmicTheme.colors.textPrimary, fontSize: 16, lineHeight: 26, fontWeight: '600' },
  summaryText: { color: cosmicTheme.colors.softStarlight, fontSize: 11, lineHeight: 21, marginTop: 7 },
  outfitTitle: { color: cosmicTheme.colors.textPrimary, fontSize: 23, lineHeight: 33, fontWeight: '700', marginTop: 20 },
  tip: { color: cosmicTheme.colors.textSecondary, fontSize: 12, lineHeight: 23, marginTop: 15 },
  subheading: { color: cosmicTheme.colors.textPrimary, fontSize: 15, fontWeight: '600', lineHeight: 24, marginTop: 21, marginBottom: 7 },
  reason: { color: cosmicTheme.colors.textSecondary, fontSize: 12, lineHeight: 23, marginTop: 5 },
  wardrobeHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'baseline', justifyContent: 'space-between' },
  matchCount: { color: cosmicTheme.colors.violetLight, fontSize: 10, lineHeight: 20 },
  slot: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: cosmicTheme.colors.cardInset, borderRadius: 14, padding: 12, marginTop: 10, borderColor: cosmicTheme.colors.cardDivider, borderWidth: 1 },
  thumbnail: { width: 44, height: 56, borderRadius: 7, backgroundColor: cosmicTheme.colors.outfitPanel },
  thumbnailFallback: { width: 44, minHeight: 56, justifyContent: 'center' },
  genericMarker: { width: 28, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  markerText: { color: cosmicTheme.colors.violetLight, fontSize: 20 },
  slotCopy: { flex: 1 },
  slotLabel: { color: cosmicTheme.colors.violetLight, fontSize: 10, lineHeight: 19 },
  slotName: { color: cosmicTheme.colors.textPrimary, fontSize: 13, lineHeight: 23, fontWeight: '500', marginTop: 4 },
  textButton: { minHeight: 48, justifyContent: 'center', marginTop: 8 },
  buttonText: { color: cosmicTheme.colors.softStarlight, fontSize: 12, lineHeight: 21, fontWeight: '600' },
  wardrobeButton: { backgroundColor: cosmicTheme.colors.outfitAccent, borderRadius: 12, minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: 12, padding: 12 },
  pressed: { opacity: 0.72 },
  empty: { paddingVertical: 23 },
  emptyTitle: { color: cosmicTheme.colors.textPrimary, fontSize: 16, lineHeight: 27, fontWeight: '600' },
});
