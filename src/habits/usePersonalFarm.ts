import {useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore} from 'react';
import type {AccessGate} from '../auth/useAccessGate';
import {createFarmController} from './request-controller.mjs';
import {serverTimeAt, remainingServerSeconds} from './server-clock.mjs';
import {personalFarmTransport} from './client';
import type {FarmController, FarmRequestState, HabitAction, HabitEntry} from './client';

const emptyState: FarmRequestState = {farm:null,clock:null,status:'idle',request:null,lastReceipt:null,error:null,refreshing:false};
const noSubscribe = () => () => {};
const emptySnapshot = () => emptyState;
type Draft = {ownerKey: string | null; name: string; quantity: string; selectedId: string | null};
const draftKey = (owner: string) => `family-city-habit-draft-v1:${owner}`;
function readDraft(ownerKey: string | null): Draft {
  const blank = {ownerKey,name:'',quantity:'1',selectedId:null};
  if (!ownerKey) return blank;
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(draftKey(ownerKey)) || 'null');
    if (saved?.ownerKey === ownerKey) return {...blank,
      name: typeof saved.name === 'string' ? saved.name : '',
      quantity: typeof saved.quantity === 'string' ? saved.quantity : '1',
      selectedId: typeof saved.selectedId === 'string' ? saved.selectedId : null};
  } catch { /* A draft is never a source of business data. */ }
  return blank;
}

/** Personal cloud projection; session storage contains only drafts and original pending requests. */
export function usePersonalFarm(access: AccessGate) {
  const permitted = access.canOpen('habits');
  const userId = permitted ? access.profile?.user_id : null;
  const householdId = permitted ? access.profile?.household_id : null;
  const ownerKey = userId && householdId ? `${userId}:${householdId}` : null;
  const liveOwner = useRef(ownerKey); liveOwner.current = ownerKey;
  const deniedHandler = useRef(access.denied); deniedHandler.current = access.denied;
  const [session, setSession] = useState<{ownerKey: string; controller: FarmController} | null>(null);
  const controller = ownerKey && session?.ownerKey === ownerKey ? session.controller : null;
  const current = useSyncExternalStore(controller?.subscribe ?? noSubscribe, controller?.getSnapshot ?? emptySnapshot);
  const seedDraft = useMemo(() => readDraft(ownerKey), [ownerKey]);
  const [savedDraft, setSavedDraft] = useState(seedDraft);
  const draft = savedDraft.ownerKey === ownerKey ? savedDraft : seedDraft;
  const [, tick] = useState(0);
  const handledReceipt = useRef<string | null>(null);

  useEffect(() => {
    if (!ownerKey || !userId || !householdId) {setSession(null); return;}
    const next = createFarmController({owner:userId,householdId,storage:window.sessionStorage,
      transport:personalFarmTransport}) as unknown as FarmController;
    handledReceipt.current = null;
    setSession({ownerKey,controller:next});
    void next.start();
    return () => {
      const changedIdentity = liveOwner.current !== ownerKey;
      next.dispose({clearPending:changedIdentity});
      if (changedIdentity) {
        try {window.sessionStorage.removeItem(draftKey(ownerKey));} catch {}
      }
    };
  }, [ownerKey, userId, householdId]);

  useEffect(() => {
    if (!ownerKey) return;
    try {window.sessionStorage.setItem(draftKey(ownerKey),JSON.stringify(draft));} catch { /* Keep input in memory. */ }
  }, [ownerKey,draft]);

  const farm = ownerKey ? current.farm : null;
  const status = ownerKey && !controller ? 'loading' : current.status;
  const selectedHabit = farm?.habits.find(habit => habit.id === draft.selectedId) ?? farm?.habits[0] ?? null;
  const selectedHabitId = selectedHabit?.id ?? null;
  const changeDraft = useCallback((patch: Partial<Draft>) => {
    if (!ownerKey || liveOwner.current !== ownerKey) return;
    setSavedDraft(previous => ({...(previous.ownerKey === ownerKey ? previous : seedDraft),...patch,ownerKey}));
  }, [ownerKey,seedDraft]);
  const selectHabit = useCallback((id: string) => {
    if (farm?.habits.some(habit => habit.id === id)) changeDraft({selectedId:id});
  }, [farm,changeDraft]);

  useEffect(() => {
    if (!controller) return;
    const refresh = () => {if (document.visibilityState === 'visible') void controller.refresh();};
    const interval = window.setInterval(refresh,15000);
    window.addEventListener('focus',refresh);
    window.addEventListener('online',refresh);
    document.addEventListener('visibilitychange',refresh);
    return () => {clearInterval(interval);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',refresh);};
  }, [controller]);

  useEffect(() => {
    if (!farm || !controller) return;
    const entries = farm.habits.flatMap(habit => habit.entries).filter(entry => !entry.undone_at && !entry.growth_granted);
    const timer = window.setInterval(() => tick(value => value+1),entries.length ? 250 : 1000);
    // These timers ask the cloud to settle. They never award growth locally.
    const serverNow = current.clock ? serverTimeAt(current.clock,performance.now()) : Date.parse(farm.server_now);
    const deadlines = entries.map(entry => Date.parse(entry.undo_until)).filter(deadline => deadline > serverNow);
    // Advance the displayed habit day through the same current cloud read at 04:00.
    const dayEnd = Date.parse(`${farm.habit_day}T04:00:00+08:00`) + 86400000;
    const next = Math.min(dayEnd, ...deadlines);
    const settlement = window.setTimeout(() => {void controller.refresh();},Math.max(250,next-serverNow+250));
    return () => {clearInterval(timer);clearTimeout(settlement);};
  }, [farm,current.clock,controller]);

  useEffect(() => {
    const action = current.request?.p_action;
    if (action?.type === 'create') changeDraft({name:action.name});
    if (action?.type === 'claim_seeds') changeDraft({quantity:String(action.quantity)});
  }, [current.request,changeDraft]);

  useEffect(() => {
    const receipt = current.lastReceipt;
    if (!receipt || current.request || status !== 'ready' || handledReceipt.current === receipt.request_id) return;
    handledReceipt.current = receipt.request_id;
    if (receipt.type === 'create') changeDraft({name:'',selectedId:receipt.result.habit_id ?? null});
  }, [current.lastReceipt,current.request,status,changeDraft]);

  useEffect(() => {
    if (status !== 'denied') return;
    if (ownerKey) {try {window.sessionStorage.removeItem(draftKey(ownerKey));} catch {}}
    setSavedDraft({ownerKey,name:'',quantity:'1',selectedId:null});
    deniedHandler.current('习惯农场');
  }, [status,ownerKey]);

  const undoSeconds = (entry: HabitEntry) => entry.undone_at || entry.growth_granted || !current.clock ? 0 :
    remainingServerSeconds(entry.undo_until,current.clock,performance.now());
  const busy = current.refreshing || ['loading','saving','confirmed'].includes(status);
  const canWrite = !!farm && status === 'ready' && !current.request && !busy;
  const submit = (action: HabitAction) => canWrite && liveOwner.current === ownerKey ? controller!.submit(action) : Promise.resolve();
  const createHabit = (name = draft.name) => farm ? submit({type:'create',id:crypto.randomUUID(),name:name.trim(),habit_day:farm.habit_day}) : Promise.resolve();
  const claimSeeds = (quantity: number) => farm ? submit({type:'claim_seeds',quantity,habit_day:farm.habit_day}) : Promise.resolve();
  const plant = (habitId: string) => farm ? submit({type:'plant',habit_id:habitId,habit_day:farm.habit_day}) : Promise.resolve();
  const record = (habitId: string) => farm ? submit({type:'record',habit_id:habitId,habit_day:farm.habit_day}) : Promise.resolve();
  const undo = (entryId: string) => submit({type:'undo',entry_id:entryId});
  const collect = (habitId: string) => submit({type:'collect',habit_id:habitId});
  const completed = farm?.habits.filter(habit => habit.today.completed).length ?? 0;
  const summary = {total:farm?.habits.length ?? 0,completed,pending:(farm?.habits.length ?? 0)-completed,
    ready:farm?.habits.reduce((sum,habit) => sum+habit.plot.ready,0) ?? 0,
    seeds:farm?.inventory.daisy_seeds ?? 0,warehouse:farm?.inventory.daisy_bouquets ?? 0,habitDay:farm?.habit_day ?? null};
  const today = farm?.habits.map(habit => ({id:habit.id,title:habit.name,detail:`每日打卡 · 仅自己 · ${farm.habit_day}`,
    completed:habit.today.completed,canRecord:canWrite && habit.today.can_record})) ?? [];
  const projectionIdentity = farm ? `${farm.household_id}:${farm.member_id}` : null;
  const planted = selectedHabit?.plot.status === 'growing';
  const progress = selectedHabit?.plot.growth ?? 0;
  const ready = selectedHabit?.plot.ready ?? 0;
  const projection = useMemo(() => projectionIdentity && selectedHabitId ? {identity:projectionIdentity,habitId:selectedHabitId,
    planted,progress,ready} : null, [projectionIdentity,selectedHabitId,planted,progress,ready]);
  return {farm,status,error:current.error,pendingRequest:current.request,lastReceipt:current.lastReceipt,busy,canWrite,
    selectedHabitId,selectedHabit,selectHabit,createHabit,claimSeeds,plant,record,undo,collect,
    refresh:() => controller?.refresh(),retryPending:() => controller?.retry(),acknowledgeFailure:() => controller?.acknowledgeFailure(),
    summary,today,projection,undoSeconds,
    draftName:status === 'denied' ? '' : draft.name,setDraftName:(name: string) => changeDraft({name}),
    seedQuantity:status === 'denied' ? '1' : draft.quantity,setSeedQuantity:(quantity: string) => changeDraft({quantity}),
    ownerKey,
  };
}
export type PersonalFarmState = ReturnType<typeof usePersonalFarm>;
