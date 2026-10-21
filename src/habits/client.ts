import {appClient, isAccessError} from '../auth/client';

export interface HabitEntry {
  id: string;
  habit_day: string;
  recorded_at: string;
  undo_until: string;
  undone_at: string | null;
  growth_granted: boolean;
}
export interface PersonalHabit {
  id: string;
  name: string;
  visibility: 'private';
  schedule: 'daily';
  start_day: string;
  created_at: string;
  created_order: number;
  version: number;
  entries: HabitEntry[];
  plot: {
    species_id: 'daisy' | null;
    status: 'unplanted' | 'growing' | 'waiting';
    growth: 0 | 1 | 2;
    unallocated_growth: number;
    ready: number;
    waiting_since: string | null;
  };
  today: {completed: boolean; can_record: boolean};
  pending_growth: number;
}
export interface PersonalFarm {
  server_now: string;
  habit_day: string;
  household_id: string;
  member_id: string;
  version: number;
  coins: number;
  inventory: {daisy_seeds: number; daisy_bouquets: number};
  animals: unknown[];
  facilities: unknown[];
  habits: PersonalHabit[];
}
export type HabitAction =
  | {type: 'create'; id: string; name: string; habit_day: string}
  | {type: 'claim_seeds'; quantity: number; habit_day: string}
  | {type: 'plant' | 'record'; habit_id: string; habit_day: string}
  | {type: 'undo'; entry_id: string}
  | {type: 'collect'; habit_id: string};
export interface HabitRequest {
  p_household_id: string;
  p_request_id: string;
  p_action: HabitAction;
}
export interface HabitReceipt {
  request_id: string;
  type: HabitAction['type'];
  habit_day: string;
  applied_at: string;
  result: {habit_id?: string; entry_id?: string; quantity?: number};
}
export type FarmStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'unknown' | 'confirmed' | 'failed' | 'expired' | 'error' | 'denied';
export interface FarmRequestState {
  farm: PersonalFarm | null;
  clock: {serverMilliseconds: number; receivedAt: number} | null;
  status: FarmStatus;
  request: HabitRequest | null;
  lastReceipt: HabitReceipt | null;
  error: unknown;
  refreshing: boolean;
}
export interface FarmController {
  getSnapshot: () => FarmRequestState;
  subscribe: (listener: () => void) => () => void;
  start: () => Promise<void>;
  refresh: () => Promise<void>;
  submit: (action: HabitAction) => Promise<void>;
  retry: () => Promise<void>;
  acknowledgeFailure: () => void;
  dispose: (options?: {clearPending?: boolean}) => void;
}

export function isHabitAccessError(error: unknown): boolean {
  return isAccessError(error) || ['HABIT_AUTH_REQUIRED', 'HABIT_ACCESS_DENIED'].includes((error as {message?: string})?.message ?? '');
}
export function habitError(error: unknown): string {
  const message = (error as {message?: string})?.message;
  if (isHabitAccessError(error)) return '当前身份无法访问这个个人农场。请从农场入口重新验证身份。';
  const messages: Record<string, string> = {
    HABIT_LOCAL_STORAGE_UNAVAILABLE: '浏览器暂时无法保留安全重试信息，本次尚未发送。输入仍在页面中，请检查浏览器存储后重试。',
    HABIT_REQUEST_EXPIRED: '原请求尚未保存，且已跨过北京时间 04:00。输入已保留，不会自动改记今天。',
    HABIT_ALREADY_RECORDED: '这个习惯日已经记录过，请刷新查看云端结果。',
    HABIT_UNDO_EXPIRED: '30 秒撤销期限已结束，这次记录已锁定。请刷新查看成长。',
    HABIT_SEEDS_REQUIRED: '库存中没有可用雏菊种子，请先领取种子。',
    HABIT_ALREADY_PLANTED: '这个种养位已经播种，请刷新查看当前一轮。',
    HABIT_NOT_FOUND: '这条习惯或记录已不可用，请刷新农场。',
    HABIT_INVALID_INPUT: '请检查名称或领取数量后重新提交。',
    HABIT_INVALID_ACTION: '这项操作暂不可用，请刷新后重试。',
    HABIT_REQUEST_MISMATCH: '原请求内容不一致，不能重新提交。请刷新并核对当前农场。',
  };
  return messages[message ?? ''] ?? '未收到云端确认，原请求和输入已保留。请恢复连接后确认重试。';
}
function assertFarm(data: unknown, householdId: string): asserts data is PersonalFarm {
  const farm = data as PersonalFarm;
  if (!farm || farm.household_id !== householdId || typeof farm.member_id !== 'string' ||
    !Array.isArray(farm.habits) || !farm.inventory || !Number.isFinite(Date.parse(farm.server_now)) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(farm.habit_day) || !Number.isSafeInteger(farm.version)) {
    throw new Error('Invalid personal farm response');
  }
}
export const personalFarmTransport = {
  async read(householdId: string): Promise<PersonalFarm> {
    if (!appClient) throw new Error('Cloud unavailable');
    const {data, error} = await appClient.rpc('get_personal_farm', {p_household_id: householdId});
    if (error) throw error;
    assertFarm(data, householdId);
    return data;
  },
  async apply(request: HabitRequest): Promise<PersonalFarm & {receipt: HabitReceipt}> {
    if (!appClient) throw new Error('Cloud unavailable');
    const {data, error} = await appClient.rpc('apply_habit_action', request);
    if (error) throw error;
    assertFarm(data, request.p_household_id);
    const result = data as PersonalFarm & {receipt: HabitReceipt};
    if (result.receipt?.request_id !== request.p_request_id || result.receipt?.type !== request.p_action.type) throw new Error('Invalid action receipt');
    return result;
  },
};
