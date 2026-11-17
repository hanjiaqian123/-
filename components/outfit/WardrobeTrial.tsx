import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useWardrobe } from '../../context/WardrobeContext';
import { useOutfitTrial } from '../../hooks/useOutfitTrial';
import { outfitKey } from '../../services/outfitTrial';
import type { OutfitWeather } from '../../services/outfitRecommendations';
import { cosmicTheme } from '../../theme/cosmicTheme';
import WardrobeTrialCard from './WardrobeTrialCard';

function Action({ label, onPress, disabled = false, secondary = false }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary, (disabled || pressed) && styles.dimmed]}>
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>;
}

export default function WardrobeTrial({ cityName, weather, periodLabel, onUpload }: {
  cityName: string; weather: OutfitWeather | null; periodLabel: string; onUpload: () => void;
}) {
  const wardrobe = useWardrobe();
  const flow = useOutfitTrial();
  const [occasion, setOccasion] = useState('通勤');
  const [variant, setVariant] = useState(0);
  const trial = flow.trial;
  const context = trial?.context;
  const recommendations = trial?.recommendations;
  const currentIndex = recommendations?.length ? variant % recommendations.length : 0;
  const disabled = Boolean(flow.busy);

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>
        {recommendations ? '我的正式推荐' : trial ? '衣橱试搭' : '用我的衣橱试搭'}
      </Text>
      {flow.loading ? <ActivityIndicator accessibilityLabel="正在恢复试搭记录" color={cosmicTheme.colors.violetLight} /> : (
        <>
          {flow.restored && trial ? <Text style={styles.notice}>已恢复上次试搭和反馈，继续使用当时的天气、场合与衣橱。</Text> : null}
          <Text style={styles.context}>
            {context?.cityName ?? cityName} · {context?.periodLabel ?? periodLabel} · 体感 {context?.weather.apparent_temperature ?? weather?.apparent_temperature ?? '--'}°C
          </Text>
          {context ? <Text style={styles.context}>参考场合：{context.occasion}</Text> : (
            <>
              <Text style={styles.context}>参考场合</Text>
              <TextInput accessibilityLabel="本次试搭场合" value={occasion} onChangeText={setOccasion}
                maxLength={40} placeholder="例如：通勤" placeholderTextColor={cosmicTheme.colors.textSecondary} style={styles.input} />
              <Text style={styles.hint}>先看看衣橱能搭出哪些组合，再按整套审美与保暖感受选择。两组都可跳过。</Text>
            </>
          )}

          {flow.storageError ? (
            <View accessibilityLiveRegion="polite">
              <Text style={styles.notice}>{flow.storageError}</Text>
              <Action label={trial ? '重试保存反馈' : '重试读取记录'} disabled={disabled || flow.saving}
                onPress={() => trial ? flow.retrySave() : void flow.restore()} secondary />
            </View>
          ) : null}

          {!trial ? wardrobe.isLoading ? <ActivityIndicator accessibilityLabel="正在读取衣橱" /> : wardrobe.storageError ? (
            <><Text style={styles.notice}>{wardrobe.storageError}</Text><Action label="重试读取衣橱" onPress={() => void wardrobe.reloadItems()} /></>
          ) : !wardrobe.items.length ? (
            <View style={styles.empty}>
              <Text style={styles.context}>衣橱里还没有衣服，先上传真实照片再试搭。</Text>
              <Action label="上传衣服" onPress={onUpload} />
            </View>
          ) : (
            <>
              {!weather ? <Text style={styles.notice}>所选时段的天气数据不足，请返回首页刷新或选择其他时段。</Text> : null}
              <Action label="用我的衣橱试搭" disabled={!weather || !occasion.trim() || flow.saving}
                onPress={() => {
                  if (!weather) return;
                  setVariant(0);
                  void flow.start({ cityName, weather, periodLabel, wardrobe: wardrobe.items, occasion: occasion.trim() });
                }} />
            </>
          ) : null}

          {flow.busy === 'trial' ? <View style={styles.loading}><ActivityIndicator color={cosmicTheme.colors.violetLight} /><Text style={styles.context}>正在用你的衣橱生成试搭…</Text></View> : null}
          {trial && !trial.outfits.length && !disabled ? (
            <>
              <Text accessibilityLiveRegion="polite" style={styles.notice}>{flow.trialError ?? '试搭尚未完成，可继续请求。'}</Text>
              <Action label="重试试搭" onPress={() => void flow.retryTrial()} />
            </>
          ) : null}

          {trial && !recommendations && trial.outfits.length ? (
            <>
              <Text style={styles.hint}>共 {trial.outfits.length} 套 · 按推荐顺序展示 · 评价针对整套搭配</Text>
              {trial.outfits.map((outfit, index) => <WardrobeTrialCard key={`${outfitKey(outfit.items)}:${index}`}
                title={`试搭 ${index + 1}`} outfit={outfit} wardrobe={trial.context.wardrobe} disabled={disabled}
                choice={trial.feedback.find((entry) => outfitKey(entry.items) === outfitKey(outfit.items))}
                onChoose={(field, value) => flow.choose(outfit.items, field, value)} />)}
              <Text accessibilityLiveRegion="polite" style={styles.hint}>
                {flow.saving ? '正在保存选择…' : flow.storageError ? '选择尚未保存' : '选择已保存在本机'} · 已评价 {trial.feedback.length}/{trial.outfits.length} 套
              </Text>
              {flow.submitError ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{flow.submitError}；选择已保留。</Text> : null}
              {flow.busy === 'submit' ? <ActivityIndicator accessibilityLabel="正在生成正式推荐" color={cosmicTheme.colors.violetLight} /> : null}
              <Action label={flow.busy === 'submit' ? '正在生成我的推荐…' : flow.submitError ? '重试查看我的推荐' : '查看我的推荐'}
                disabled={disabled} onPress={() => { setVariant(0); void flow.submit(); }} />
              {!trial.feedback.length ? <Text style={styles.hint}>当前全部跳过，将直接按本次天气、场合与衣橱推荐。</Text> : null}
            </>
          ) : null}

          {trial && recommendations?.length ? (
            <>
              <Text style={styles.hint}>{currentIndex === 0 ? '首选推荐' : '备选搭配'} · {currentIndex + 1}/{recommendations.length}</Text>
              <WardrobeTrialCard key={currentIndex} title={currentIndex === 0 ? '为你推荐' : `备选 ${currentIndex}`}
                outfit={recommendations[currentIndex]} wardrobe={trial.context.wardrobe} />
              {recommendations.length > 1 ? <Action label="换一套" onPress={() => setVariant((index) => (index + 1) % recommendations.length)} /> : null}
            </>
          ) : null}

          {trial ? <Action label="开始新的试搭" secondary disabled={disabled || flow.saving} onPress={() => void flow.reset()} /> : null}
        </>
      )}
    </View>
  );
}

const colors = cosmicTheme.colors;
const styles = StyleSheet.create({
  section: { marginTop: 24, gap: 10 },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: '700' },
  context: { color: colors.softStarlight, fontSize: 14, lineHeight: 23 },
  hint: { color: colors.textSecondary, fontSize: 12, lineHeight: 21 },
  notice: { color: colors.violetLight, fontSize: 13, lineHeight: 22 },
  input: { color: colors.textPrimary, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: 12, padding: 13, minHeight: 48 },
  button: { minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.outfitButton, padding: 14, borderRadius: 14, marginTop: 10 },
  secondary: { backgroundColor: colors.outfitPanel, borderColor: colors.cardBorder, borderWidth: 1 },
  buttonText: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  dimmed: { opacity: 0.5 },
  empty: { padding: 16, backgroundColor: colors.outfitPanel, borderRadius: 16 },
  loading: { gap: 12, paddingVertical: 18, alignItems: 'center' },
});
