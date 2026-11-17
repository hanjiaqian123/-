import { useCallback, useEffect, useRef, useState } from 'react';
import { requestWardrobeOutfits } from '../services/outfitApi';
import { createOutfitTrial, toggleOutfitFeedback } from '../services/outfitTrial';
import { loadOutfitTrial, saveOutfitTrial } from '../services/outfitTrialStorage';
import type { FeedbackChoice, OutfitItems, OutfitTrial, TrialContext } from '../types/outfits';

export function useOutfitTrial() {
  const [trial, setTrial] = useState<OutfitTrial | null>(null);
  const current = useRef<OutfitTrial | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'trial' | 'submit' | null>(null);
  const [trialError, setTrialError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [restored, setRestored] = useState(false);
  const mounted = useRef(false);
  const locked = useRef(true);
  const revision = useRef(0);
  const request = useRef<AbortController | null>(null);

  const replace = useCallback((value: OutfitTrial | null) => {
    current.current = value;
    setTrial(value);
  }, []);

  const persist = useCallback(async (value: OutfitTrial | null) => {
    const version = ++revision.current;
    setSaving(true);
    try {
      await saveOutfitTrial(value);
      if (mounted.current && version === revision.current) setStorageError(null);
    } catch (error) {
      if (mounted.current && version === revision.current) {
        setStorageError('本地保存失败，选择仍保留在本页，请重试保存');
      }
      throw error;
    } finally {
      if (mounted.current && version === revision.current) setSaving(false);
    }
  }, []);

  const restore = useCallback(async () => {
    locked.current = true;
    setLoading(true);
    try {
      const stored = await loadOutfitTrial();
      if (!mounted.current) return;
      replace(stored);
      setRestored(Boolean(stored));
      setStorageError(null);
    } catch {
      if (mounted.current) setStorageError('试搭记录读取失败，可重试读取或开始新的试搭');
    } finally {
      if (mounted.current) {
        locked.current = false;
        setLoading(false);
      }
    }
  }, [replace]);

  useEffect(() => {
    mounted.current = true;
    void restore();
    return () => { mounted.current = false; request.current?.abort(); };
  }, [restore]);

  async function run(snapshot: OutfitTrial, phase: 'trial' | 'submit') {
    if (locked.current) return;
    locked.current = true;
    setBusy(phase);
    const setError = phase === 'trial' ? setTrialError : setSubmitError;
    setError(null);
    replace(snapshot);
    const controller = new AbortController();
    request.current = controller;
    try {
      // Persist before submitting; a restart during either request can be retried.
      await persist(snapshot);
      if (!mounted.current) return;
      const outfits = await requestWardrobeOutfits(snapshot, phase === 'submit', controller.signal);
      if (!mounted.current) return;
      const next = phase === 'trial'
        ? { ...snapshot, outfits }
        : { ...snapshot, recommendations: outfits };
      replace(next);
      await persist(next).catch(() => {});
    } catch (error) {
      if (mounted.current) setError(error instanceof Error ? error.message : '请求失败，请重试');
    } finally {
      if (mounted.current) {
        locked.current = false;
        setBusy(null);
      }
    }
  }

  function choose<K extends keyof FeedbackChoice>(items: OutfitItems, field: K, value: NonNullable<FeedbackChoice[K]>) {
    if (locked.current || !current.current || current.current.recommendations) return;
    const next = toggleOutfitFeedback(current.current, items, field, value);
    replace(next);
    void persist(next).catch(() => {});
  }

  async function reset() {
    if (locked.current) return;
    locked.current = true;
    try {
      await persist(null);
      if (!mounted.current) return;
      replace(null);
      setTrialError(null);
      setSubmitError(null);
      setRestored(false);
    } catch { /* Keep the visible draft if clearing storage failed. */ }
    finally { if (mounted.current) locked.current = false; }
  }

  return {
    trial, loading, busy, trialError, submitError, storageError, saving, restored,
    restore, reset, choose,
    retrySave: () => { void persist(current.current).catch(() => {}); },
    start: (context: TrialContext) => run(createOutfitTrial(context), 'trial'),
    retryTrial: () => current.current && run(current.current, 'trial'),
    submit: () => current.current && run(current.current, 'submit'),
  };
}
