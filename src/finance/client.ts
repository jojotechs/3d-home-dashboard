import {createClient} from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

function isPublicKey(value: string): boolean {
  if (value.startsWith('sb_publishable_')) return true;
  try {
    const claims = JSON.parse(atob(value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return claims.role === 'anon';
  } catch { return false; }
}

// A stable tab-local key also isolates Supabase's BroadcastChannel between sessions.
const authSlot = window.sessionStorage.getItem('family-city-auth-slot') ?? crypto.randomUUID();
window.sessionStorage.setItem('family-city-auth-slot', authSlot);
export const AUTH_STORAGE_KEY = `family-city-auth-${authSlot}`;

export const financeClient = url && /^https:\/\//.test(url) && key && isPublicKey(key)
  ? createClient(url, key, {auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: AUTH_STORAGE_KEY, storage: window.sessionStorage}})
  : null;

export interface FinanceEntry {
  id: string;
  kind: 'balance' | 'debt';
  name: string;
  amount_minor: string;
  version: string;
  created_by: string;
  updated_by: string;
  creator_name: string;
  editor_name: string;
  created_at: string;
  updated_at: string;
}
export interface FinanceSnapshot {
  household_id: string;
  household_name: string;
  version: string;
  net_savings_minor: string;
  saved_at: string | null;
  entries: FinanceEntry[];
}
export interface BalanceRequest {
  p_household_id: string;
  p_entry_id: string;
  p_expected_version: string;
  p_name: string;
  p_amount_minor: string;
  p_request_id: string;
}

export function financeError(error: unknown): string {
  const code = (error as {code?: string})?.code;
  if (code === '42501' || code === 'PGRST301' || code === 'PGRST303') return '登录已失效或没有财务访问权限，请重新登录或联系家庭管理员。';
  if (code === 'PT409') return '云端记录已变更。输入已保留，请先读取最新记录并核对，再保存。';
  if (code === '22023' || code === '22003') return '金额或名称格式不正确，请检查后重试。';
  return '未收到云端确认，输入已保留。请检查连接后重试。';
}
