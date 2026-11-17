import type { OutfitTrial, WardrobeOutfit } from '../types/outfits';
import { buildRecommendationRequest, isRecord, parseOutfits } from './outfitTrial';

export async function requestWardrobeOutfits(
  trial: OutfitTrial,
  withFeedback: boolean,
  signal?: AbortSignal
): Promise<WardrobeOutfit[]> {
  const baseUrl = process.env.EXPO_PUBLIC_WEATHER_API_URL?.trim().replace(/\/+$/, '');
  if (!baseUrl) throw new Error('推荐服务尚未配置，请稍后再试');
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, 20000);
  try {
    const response = await fetch(`${baseUrl}/v1/outfits/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildRecommendationRequest(trial, withFeedback)),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`推荐服务暂时不可用（${response.status}），请重试`);
    const body: unknown = await response.json();
    const outfits = parseOutfits(isRecord(body) ? body.outfits : undefined);
    if (!outfits.length) throw new Error('暂未生成可用搭配，请重试或补充衣橱');
    return outfits;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('推荐请求已中断或超时，请重试');
    if (error instanceof TypeError) throw new Error('无法连接推荐服务，请检查网络后重试');
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
